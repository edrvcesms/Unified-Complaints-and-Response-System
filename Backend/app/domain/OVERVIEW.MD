SYSTEM OVERVIEW
===============
Event Deduplication and Clustering System with Adaptive Severity Scoring(System Module part of UCRS)
Urban Complaint Response System (UCRS)
Municipality of Santa Maria, Laguna, Philippines


A real-time incident aggregation and severity scoring system designed for
barangay-level complaint management in Santa Maria, Laguna. Similar in
architecture to enterprise AIOps platforms (PagerDuty, ServiceNow) and
city-level 311 systems (NYC, LA). Automatically deduplicates citizen
complaints submitted across barangays, clusters them into incidents, scores
severity in real-time, and manages incident lifecycle — supporting
multilingual input including Filipino, Tagalog, Bisaya, and code-switching
as commonly used by residents of Santa Maria, Laguna.

The System Combines:
Complaint Deduplication System — grouping similar reports into one incident
Real-Time Event Clustering — using embeddings + AI to cluster related events
Sliding Window Aggregation — time-bounded incident grouping
Severity Scoring Engine — velocity-aware weighted scoring

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYER 1 — COMPLAINT INGESTION
└── Complaint Persistence
    Saves the incoming citizen complaint from Santa Maria residents
    to PostgreSQL and fetches category config (similarity threshold,
    time window, base severity weight) per complaint category.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYER 2 — INCIDENT CLUSTERING ENGINE
    Core of the UCRS. Determines whether a new complaint belongs to an
    existing incident or represents a new one within the same barangay.

├── 2.1 Candidate Discovery
│       Queries PostgreSQL for ACTIVE incidents within the same barangay,
│       category, and time window. Postgres is the source of truth for
│       candidate discovery — not Pinecone. Eliminates vector DB
│       eventual consistency issues.
│
├── 2.2 Embedding Similarity Scoring
│       Generates a dense vector embedding of the complaint description.
│       Fetches the seed vector of each candidate incident from Pinecone.
│       Computes cosine similarity locally using numpy — no additional
│       Pinecone query needed. Language-agnostic by nature.
│
├── 2.3 AI Comparison Filter
│       Three-tier decision gate based on per-category similarity threshold:
│
│         score >= threshold + 0.10  →  Auto-Merge        (no LLM, clear match)
│         score >= threshold         →  Gemini LLM Decides (ambiguous zone)
│         score <  threshold         →  New Incident       (clear non-match)
│
│       Gemini LLM handles multilingual input natively — critical for
│       Santa Maria residents who communicate in Filipino, Tagalog,
│       Bisaya, Ilocano, code-switching, slang, and misspellings.
│       LLM is only called in the ambiguous zone — cost and latency efficient.
│
└── 2.4 Vector Storage
        Upserts the complaint vector into Pinecone with the resolved
        incident_id after the clustering decision is made. Pinecone
        is used purely as a vector store, not a decision maker.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYER 3 — SEVERITY SCORING ENGINE
    Dynamically scores incident severity after every new complaint merge.
    Helps barangay officials in Santa Maria prioritize which incidents
    require immediate action.

├── 3.1 Velocity Detection
│       Measures the complaint rate (complaints per hour) within the
│       category time window. A spike in velocity increases severity,
│       signaling a rapidly escalating incident in the barangay.
│
└── 3.2 Weighted Severity Calculator
        Computes a severity score using three signals:

          severity = base_weight
                   + log2(complaint_count) * 1.5
                   + complaints_per_hour   * 2.0

        Clamped to [1.0 – 10.0] and mapped to severity level:
          1.0 – 3.9  →  LOW
          4.0 – 5.9  →  MEDIUM
          6.0 – 7.9  →  HIGH
          8.0 – 10.0 →  CRITICAL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYER 4 — INCIDENT LIFECYCLE MANAGEMENT

├── 4.1 Sliding Window Expiry Job (System-Automated)
│       Background job that periodically scans all ACTIVE incidents
│       across all barangays in Santa Maria, Laguna.
│       Marks an incident as EXPIRED when:
│
│         current_time >= last_reported_at + time_window_hours
│
│       Every merged complaint resets last_reported_at, extending
│       the window as long as residents keep reporting the same incident.
│       This reflects real-world behavior — ongoing problems stay ACTIVE.
│
│         EXPIRED  →  set by the system automatically
│         RESOLVED →  set by barangay admin only
│
└── 4.2 Status Flow
          ACTIVE   →  EXPIRED   (system: time window lapsed, no new reports)
          ACTIVE   →  RESOLVED  (admin: incident has been addressed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━