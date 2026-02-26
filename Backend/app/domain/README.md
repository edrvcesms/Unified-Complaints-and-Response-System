# Complaint Clustering System — Santa Maria, Laguna


## How It Works

1. **POST /api/complaints/submit-complaint** — saves complaint, fetches category config, dispatches `cluster_complaint_task` to Celery, returns 201 immediately.

2. **cluster_complaint_task (Celery, `clustering` queue)**:
   - Generates embedding via `SentenceTransformerEmbeddingService`
   - Stores vector in Pinecone with metadata (barangay, category, status, timestamp)
   - Queries Pinecone for similar ACTIVE complaints in same barangay + category within time window
   - Merges into existing incident (if score ≥ threshold) OR creates new incident
   - Dispatches `recalculate_severity_task`

3. **recalculate_severity_task (Celery, `severity` queue)**:
   - Counts recent complaints (velocity)
   - Computes: `base_weight + log2(count)*1.5 + velocity*2.0`
   - Clamps to [1.0–10.0], maps to LOW/MEDIUM/HIGH/CRITICAL
   - Persists updated severity to incident

## Running Celery Workers

```bash
# Terminal 1: clustering worker
celery -A infrastructure.celery.celery_app worker \
  -Q clustering --concurrency=4 -l info

# Terminal 2: severity worker
celery -A infrastructure.celery.celery_app worker \
  -Q severity --concurrency=2 -l info
```

## Running the Migration

```bash
alembic upgrade head
```

## SOLID Principles Applied

| Principle | Where |
|---|---|
| SRP | Each use-case does one thing. Repository only handles persistence. Embedding service only generates vectors. |
| OCP | New embedding backend → implement `IEmbeddingService`. New scoring formula → implement `ISeverityCalculator`. No existing code changes. |
| LSP | Any `IVectorRepository` impl (Pinecone, pgvector, Weaviate) is substitutable in use-cases. |
| ISP | `IVectorRepository` and `IIncidentRepository` are separate. `IVelocityDetector` is separate from `ISeverityCalculator`. |
| DIP | Use-cases import only domain interfaces. `container.py` is the only place concrete classes are wired together. |

## Functionality 

Grouping & Matching

When someone files a complaint, the system checks if anyone else already reported the same problem in the same barangay
It understands complaints even if people describe them differently — "there's water on the road" and "the street is flooded near the market" will still be recognized as the same problem
It only groups complaints within the same barangay — a flooded road in Barangay Sta. Cruz will never be grouped with one in Barangay Poblacion
It only groups complaints of the same type — a noise complaint will never be merged with a garbage complaint

Time Windows

Each complaint type has its own time limit for grouping. For example, flooding complaints are only grouped if they were filed within 6 hours of each other, because floods are fast-changing. Road damage complaints can be grouped across 72 hours because the problem persists longer
If someone reports a problem after the time window has passed, a brand new incident is started — even if it's the same location
A complaint only gets grouped into an existing incident if that incident is still active (not yet resolved)

Incident Management

The first person to report a problem creates the incident
Every person who reports the same problem after that gets added to that incident, and the complaint count goes up
The system tracks when the first and most recent complaint were filed

Severity & Priority

The more people that report the same problem, the more urgent it becomes automatically
If many complaints come in within a short time (a spike), the urgency increases faster
Some complaint types start out more urgent than others — flooding starts higher than vandalism, for example
Severity is labeled as Low, Medium, High, or Critical and updates automatically as more complaints come in

For Staff

Instead of seeing 50 separate complaints, staff see one incident with a complaint count of 50 and a severity level that reflects how serious it is
The most urgent, most-reported problems rise to the top automatically
Staff don't need to manually identify which complaints are about the same thing

Non-blocking

The resident gets an instant confirmation when they submit — they never wait for any of the grouping or severity calculation to finish
All the matching and grouping happens quietly in the background after the complaint is already saved



## Edge Cases 

Similarity & Matching

Same problem, different barangay — if a flood crosses barangay boundaries, each barangay gets a separate incident with no connection between them. There's no cross-barangay linking.
Same complaint submitted twice by the same user — the system will still merge it as if it's a new reporter. There's no duplicate submission detection per user.
Very short or vague descriptions — if someone just writes "grabe" or "problem dito", the embedding will be low quality and matching will likely fail, creating a new incident instead of merging.
Complaints in Filipino/Tagalog or mixed language (Taglish) — all-MiniLM-L6-v2 is primarily trained on English. Filipino descriptions may produce poor embeddings and miss matches that a human would obviously recognize as the same problem.
"Other" category matching — user-defined complaints under "Other" have a slightly stricter threshold (0.70) but two very different custom complaints could still accidentally get merged if their descriptions happen to be semantically close.


Time Windows

A resolved incident getting reopened — if an incident is marked resolved but the same problem comes back the next day, a new incident is created. There's no "reopen" logic, so historical context is lost.
Complaints filed just outside the time window — a complaint filed one minute after the window expires creates a brand new incident even if it's clearly the same ongoing problem.
Time window is fixed at incident creation — if the category config time window is updated in the DB later, existing incidents keep their old window. The change only affects new incidents.


Severity & Priority

Severity never goes down — if complaints stop coming in, the severity score stays high. There's no decay or cooldown over time.
A single highly-worded complaint — someone writing a very urgent, detailed complaint still gets the same base weight as someone writing one word. The content urgency isn't factored in, only the count and velocity.
Priority level in the DB is not updated — severity level (LOW/MEDIUM/HIGH/CRITICAL) is recalculated, but the actual priority_level_id foreign key on the incident is not automatically remapped to the corresponding priority level record in your existing priority_levels table.


Race Conditions & Reliability

Two identical complaints submitted at the exact same millisecond — both could pass the similarity check simultaneously before either has been committed, resulting in two separate incidents being created for the same problem.
Pinecone is eventually consistent — a vector just upserted may not be immediately searchable. A complaint submitted right after another could miss the match because Pinecone hasn't indexed the first vector yet.
If the Celery task fails all 3 retries — the complaint exists in PostgreSQL but has no incident, no severity, and no Pinecone vector. There's no alert or fallback to handle orphaned complaints.
Pinecone metadata update fails after clustering — the complaint is linked to an incident in PostgreSQL but the Pinecone vector still shows incident_id = -1. Future queries could miss this complaint as part of the cluster.


## CONFIG

Category ID   Category Name            Base Severity Weight   Time Window (hrs)   Similarity Threshold   Behavior Type
---------------------------------------------------------------------------------------------------------------
18            Noise Disturbance        3.0                    2                   0.88                   Very strict, short-lived
19            Illegal Dumping          4.0                    48                  0.82                   Moderate clustering
20            Road Damage              3.5                    72                  0.80                   Generic, long-lasting
21            Street Light Outage      2.5                    48                  0.83                   Location-specific
22            Flooding                 5.0                    6                   0.78                   High-impact, broad clustering
23            Illegal Construction     4.5                    72                  0.85                   Very specific, persistent
24            Stray Animals            2.0                    24                  0.88                   Very strict distinction
25            Public Intoxication      3.0                    4                   0.85                   Short-lived, specific
26            Illegal Vending          2.5                    24                  0.83                   Location-based
27            Water Supply Issue       4.0                    24                  0.80                   Area-wide issue
28            Garbage Collection       3.5                    24                  0.80                   Street-level issue
29            Vandalism                2.0                    48                  0.85                   Property-specific
30            Other                    2.0                    24                  0.85                   Strict due to vagueness




## SYSTEM PROMPT

Rule-Based Prompt Engineering combined with Few-Shot Prompting.

Specifically the techniques used:

Few-Shot Prompting — providing examples (Q/A pairs) so the LLM learns the pattern
Rule-Based Constraints — explicit numbered rules that bound the LLM's decision making
Conservative Bias Prompting — "When unsure, answer NO" forces a safe default
Output Formatting Constraint — "ONLY one word: YES or NO" prevents hallucinated explanations
Persona Framing — "strict complaint deduplication validator" sets the LLM's behavior tone