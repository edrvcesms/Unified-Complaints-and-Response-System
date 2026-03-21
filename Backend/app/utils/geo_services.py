from shapely.geometry import shape, Point
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
geojson_path = os.path.join(BASE_DIR, "data", "sta_maria_barangays.geojson")

with open(geojson_path) as f:
    geo_data = json.load(f)

barangay_polygons = []
for feature in geo_data["features"]:
    name = feature["properties"]["ADM4_EN"]
    geom = shape(feature["geometry"])
    
    if name == "Pao-o":
        geom = geom.buffer(0.0015)
    
    barangay_polygons.append({
        "name": name,
        "geometry": geom
    })

def get_barangay(lat: float, lng: float):
    point = Point(lng, lat)
    for brgy in barangay_polygons:
        if brgy["geometry"].intersects(point):
            return brgy["name"]
    return None

# Test
test_coords = [
    (14.470134997303694, 121.42548940702612),
    (14.547934392699075, 121.42213048838994),
]

for lat, lng in test_coords:
    print(get_barangay(lat, lng))