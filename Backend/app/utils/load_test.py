"""
Load-testing script for the /submit-complaint endpoint.

Generates synthetic "emergency" complaints with:
  - barangay_id fixed to 30 (Adia)
  - category_id fixed to 30 (Others -> treated as emergency)
  - random title/description drawn from an emergency-complaint pool
  - random latitude/longitude sampled from INSIDE the actual Adia barangay
    polygon (point-in-polygon rejection sampling), so every generated point
    is geographically valid for that barangay, not just a rough bounding box.

Setup:
    pip install requests
    Fill in BASE_URL and AUTH_TOKEN below, then run:

    python load_test_complaints.py --requests 30 --concurrency 10

Note: the endpoint is rate-limited to 10/minute (per the @limiter.limit
decorator). With a single token you will start seeing 429s after the first
10 requests in a given minute -- the script reports these separately from
real failures so you can see both numbers.
"""

import argparse
import json
import random
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

# --------------------------------------------------------------------------
# CONFIG - fill these in before running
# --------------------------------------------------------------------------
BASE_URL = "http://127.0.0.1:8000/api/v1/complaints"          # <-- change to your API base URL
SUBMIT_ENDPOINT = f"{BASE_URL}/submit-complaint"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo2NSwiZXhwIjoxNzg2NjgzNDk0LCJpYXQiOjE3ODY2Nzk4OTQsImp0aSI6IjkyZjBlZDBmNGMxMTQwNzk4NDBiYWZlYjM1ODBhYTZhIiwiYXVkIjoidWNycyIsInRva2VuX3R5cGUiOiJhY2Nlc3MifQ.s-R5kje74NWbo2Eiu9l6qak6mTq2xffxS7RTTn_q_0Q"    # <-- hardcoded token, as requested

BARANGAY_ID = 30   # Adia
CATEGORY_ID = 30   # "Others" -> treated as emergency

# --------------------------------------------------------------------------
# Adia barangay polygon ring, (lon, lat), taken from the provided GeoJSON
# feature (ADM4_PCODE: PH0403427001). Used for point-in-polygon sampling.
# --------------------------------------------------------------------------
ADIA_POLYGON = [
    (121.438720347, 14.494355275), (121.438691284, 14.494239024),
    (121.438691284, 14.493861206), (121.438676753, 14.493439794),
    (121.438575033, 14.493134633), (121.438575033, 14.492923927),
    (121.438604096, 14.492698690), (121.438640424, 14.491921257),
    (121.438654956, 14.491579768), (121.438669487, 14.491427187),
    (121.438713081, 14.491100230), (121.438684018, 14.490707880),
    (121.438560501, 14.490301000), (121.438386124, 14.489966776),
    (121.438298935, 14.489741539), (121.438298935, 14.489479973),
    (121.438364327, 14.489232938), (121.438458781, 14.488935043),
    (121.438502375, 14.488622617), (121.438400655, 14.488150345),
    (121.438335264, 14.487801590), (121.438095495, 14.487285723),
    (121.437848460, 14.486827983), (121.437623222, 14.486428368),
    (121.437514237, 14.486290319), (121.437536034, 14.486050550),
    (121.437565097, 14.485672732), (121.437557831, 14.485287649),
    (121.437456111, 14.485033348), (121.437071027, 14.484648265),
    (121.436715007, 14.484379433), (121.436497035, 14.484190524),
    (121.436366252, 14.484016146), (121.436366252, 14.483856300),
    (121.436511566, 14.483660126), (121.436591489, 14.483616531),
    (121.436765867, 14.483442154), (121.436991104, 14.483231448),
    (121.437005636, 14.482991679), (121.436903915, 14.482773707),
    (121.436664147, 14.482635658), (121.436279063, 14.482490344),
    (121.435988434, 14.482395889), (121.435792259, 14.482279638),
    (121.435712336, 14.482192449), (121.435712336, 14.481959946),
    (121.435741399, 14.481596659), (121.435864917, 14.481255170),
    (121.435893980, 14.481044464), (121.436039294, 14.480899150),
    (121.436315392, 14.480666646), (121.436576958, 14.480477738),
    (121.436627818, 14.480288829), (121.436503386, 14.480120320),
    (121.436346942, 14.480044212), (121.436101706, 14.479993473),
    (121.435780361, 14.480001930), (121.435543581, 14.479989245),
    (121.435074249, 14.480001930), (121.434922033, 14.479976561),
    (121.434841697, 14.479853942), (121.434845925, 14.479663672),
    (121.434837468, 14.479376154), (121.434850153, 14.479135145),
    (121.434968543, 14.478940647), (121.435074249, 14.478754605),
    (121.435294116, 14.478644672), (121.435408278, 14.478530510),
    (121.435450560, 14.478369838), (121.435349083, 14.478217622),
    (121.435141900, 14.477976613), (121.435133444, 14.477748290),
    (121.435213780, 14.477439630), (121.435171498, 14.477012580),
    (121.435053108, 14.476877277), (121.434896663, 14.476775799),
    (121.434719078, 14.476805397), (121.434486526, 14.476889961),
    (121.434228605, 14.476995667), (121.434008738, 14.477067546),
    (121.433924173, 14.477266273), (121.433716991, 14.477448086),
    (121.433594372, 14.477663725), (121.433467526, 14.477938559),
    (121.433378733, 14.478145742), (121.433230745, 14.478221850),
    (121.433133496, 14.478158427), (121.433027791, 14.477980842),
    (121.433006650, 14.477760974), (121.433023563, 14.477477684),
    (121.433082758, 14.477143654), (121.433150409, 14.476873048),
    (121.433289941, 14.476644725), (121.433366048, 14.476547476),
    (121.433370277, 14.476251500), (121.433260343, 14.476035861),
    (121.433137725, 14.475727201), (121.433019335, 14.475376259),
    (121.432841749, 14.475207130), (121.432554231, 14.475046458),
    (121.432245571, 14.474978807), (121.431856575, 14.474906927),
    (121.431615566, 14.474742026), (121.431404155, 14.474703972),
    (121.431201201, 14.474758939), (121.431065898, 14.474796993),
    (121.430909454, 14.474792765), (121.430965800, 14.476144438),
    (121.430914172, 14.476540249), (121.430948591, 14.477701866),
    (121.430819522, 14.478235350), (121.430767895, 14.478622556),
    (121.431008823, 14.479130226), (121.431120682, 14.479371154),
    (121.430965800, 14.479543245), (121.430750685, 14.479741151),
    (121.430552780, 14.480007892), (121.430595803, 14.480162775),
    (121.431043241, 14.481152301), (121.432394159, 14.483914370),
    (121.432411368, 14.484198321), (121.432574855, 14.484404830),
    (121.432703924, 14.484516690), (121.432609274, 14.484792036),
    (121.432497414, 14.485093196), (121.432549042, 14.485359938),
    (121.432832993, 14.485600866), (121.433280430, 14.485815981),
    (121.434003215, 14.486211791), (121.434097865, 14.486590392),
    (121.433925774, 14.486943180), (121.433590195, 14.487476664),
    (121.433633218, 14.487889683), (121.434115074, 14.487898288),
    (121.434562512, 14.488242471), (121.434863672, 14.488887814),
    (121.434966927, 14.489404089), (121.434984136, 14.490557102),
    (121.435009950, 14.491090585), (121.435233669, 14.491460582),
    (121.435242274, 14.491770347), (121.435156228, 14.492312435),
    (121.436563157, 14.492536108), (121.437332198, 14.494472954),
    (121.438271084, 14.494833576), (121.438720347, 14.494355275),
]

# --------------------------------------------------------------------------
# Emergency complaint templates: (title, description)
# --------------------------------------------------------------------------
EMERGENCY_COMPLAINTS = [
    ("Fire outbreak reported near residential area",
     "Thick smoke and visible flames spotted near a cluster of houses. Residents are evacuating; immediate fire department response needed."),
    ("Flooding rising rapidly in low-lying street",
     "Floodwater has risen to knee-level within the last hour and is still rising. Several households are trapped and requesting rescue."),
    ("Vehicular accident with injuries",
     "A motorcycle and delivery van collided at the intersection. At least one person is unconscious and needs immediate medical attention."),
    ("Disturbance reported near the plaza",
     "Loud shouting and commotion heard near the plaza. Residents are asked to stay indoors; police assistance requested urgently."),
    ("Landslide blocking access road",
     "Heavy rains caused a landslide that has blocked the only access road to the area. Some residents may be isolated and need evacuation support."),
    ("Structural collapse of residential wall",
     "Part of a perimeter wall collapsed onto a walkway during heavy rain. No confirmed injuries yet but the area remains hazardous for pedestrians."),
    ("Person in medical distress with no transport",
     "An elderly resident is having difficulty breathing and the family has no means of transport to the hospital. Requesting emergency response."),
    ("Gas leak smell reported in residential block",
     "Strong gas odor detected near several households. Residents are worried about a possible leak and are requesting immediate inspection."),
    ("Downed electrical line sparking near school",
     "A live wire fell during the storm and is sparking near a school entrance. Extremely hazardous, requesting immediate utility and emergency response."),
    ("Domestic disturbance escalating",
     "Neighbors report a loud, escalating altercation from a nearby household. Immediate intervention requested for safety."),
]


def _point_in_polygon(x, y, polygon):
    """Standard ray-casting point-in-polygon test."""
    inside = False
    n = len(polygon)
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi
        ):
            inside = not inside
        j = i
    return inside


def random_point_in_adia(max_attempts: int = 200):
    """Rejection-sample a (lat, lon) pair that falls inside the Adia polygon."""
    lons = [p[0] for p in ADIA_POLYGON]
    lats = [p[1] for p in ADIA_POLYGON]
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)

    for _ in range(max_attempts):
        lon = random.uniform(min_lon, max_lon)
        lat = random.uniform(min_lat, max_lat)
        if _point_in_polygon(lon, lat, ADIA_POLYGON):
            return round(lat, 8), round(lon, 8)

    # Fallback: bounding-box center (should rarely trigger)
    return round((min_lat + max_lat) / 2, 8), round((min_lon + max_lon) / 2, 8)


def build_complaint_payload():
    title, description = random.choice(EMERGENCY_COMPLAINTS)
    lat, lon = random_point_in_adia()
    return {
        "title": title,
        "description": description,
        "latitude": lat,
        "longitude": lon,
        "barangay_id": BARANGAY_ID,
        "category_id": CATEGORY_ID,
    }


def submit_one(session, index):
    payload = build_complaint_payload()
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    # Endpoint expects multipart/form-data with a "data" field holding the
    # JSON string (data: str = Form(...)); attachments are optional.
    files = {"data": (None, json.dumps(payload))}

    start = time.perf_counter()
    try:
        resp = session.post(SUBMIT_ENDPOINT, headers=headers, files=files, timeout=30)
        elapsed = time.perf_counter() - start
        return {
            "index": index,
            "status_code": resp.status_code,
            "elapsed": elapsed,
            "ok": resp.status_code == 201,
            "rate_limited": resp.status_code == 429,
            "body": resp.text[:300],
        }
    except requests.RequestException as e:
        elapsed = time.perf_counter() - start
        return {
            "index": index,
            "status_code": None,
            "elapsed": elapsed,
            "ok": False,
            "rate_limited": False,
            "error": str(e),
        }


def run_load_test(num_requests: int, concurrency: int):
    print(f"Firing {num_requests} complaint submissions with concurrency={concurrency}")
    print(f"Target: {SUBMIT_ENDPOINT}")
    print(f"barangay_id={BARANGAY_ID} (Adia), category_id={CATEGORY_ID} (Others/Emergency)\n")

    results = []
    session = requests.Session()

    overall_start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(submit_one, session, i) for i in range(num_requests)]
        for future in as_completed(futures):
            r = future.result()
            results.append(r)
            tag = "OK" if r["ok"] else ("RATE-LIMITED" if r["rate_limited"] else "FAIL")
            print(f"[{r['index']:>4}] {tag:<13} status={r['status_code']} time={r['elapsed']:.3f}s")
    overall_elapsed = time.perf_counter() - overall_start

    summarize(results, overall_elapsed)


def summarize(results, overall_elapsed):
    ok = [r for r in results if r["ok"]]
    rate_limited = [r for r in results if r["rate_limited"]]
    failed = [r for r in results if not r["ok"] and not r["rate_limited"]]
    latencies = [r["elapsed"] for r in results if r["status_code"] is not None]

    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Total requests:      {len(results)}")
    print(f"Succeeded (201):     {len(ok)}")
    print(f"Rate-limited (429):  {len(rate_limited)}")
    print(f"Failed/errored:      {len(failed)}")
    print(f"Total wall time:     {overall_elapsed:.2f}s")
    if overall_elapsed > 0:
        print(f"Throughput:          {len(results) / overall_elapsed:.2f} req/s")
    if latencies:
        print(f"Avg latency:         {statistics.mean(latencies):.3f}s")
        print(f"Median latency:      {statistics.median(latencies):.3f}s")
        print(f"Min / Max latency:   {min(latencies):.3f}s / {max(latencies):.3f}s")
    if failed:
        print("\nSample failure details:")
        for r in failed[:5]:
            print(f"  [{r['index']}] status={r['status_code']} "
                  f"{r.get('error', r.get('body', ''))}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load test for /submit-complaint")
    parser.add_argument("--requests", type=int, default=30, help="Number of complaints to generate")
    parser.add_argument("--concurrency", type=int, default=10, help="Number of concurrent workers")
    args = parser.parse_args()

    run_load_test(args.requests, args.concurrency)