import httpx
from fastapi import HTTPException, status
from .geo_services import get_barangay


async def reverse_geocode(latitude: float, longitude: float, barangay_name: str) -> dict:
    try:
      url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={latitude}&lon={longitude}"
      headers = {"User-Agent": "UCRS/1.0"}
      async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
          response = await client.get(url)
          response.raise_for_status()
          data = response.json()
          
          if data.get("error"):
              raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Location not found for the provided coordinates.")
            
          address = data.get("address", {})
          if not address:
              raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No address found for the provided coordinates.")
          
          municipality = (
              address.get("town")
              or address.get("city")
              or address.get("municipality")
              or address.get("village")
          )
          province = address.get("province") or address.get("state")

          if municipality != "Santa Maria" or province != "Laguna":
              raise HTTPException(
                  status_code=status.HTTP_400_BAD_REQUEST,
                  detail="Location of the complaint must be within Santa Maria, Laguna.",
              )
        
          barangay = get_barangay(latitude, longitude)
          if barangay and barangay_name and barangay["name"].lower() != barangay_name.lower():
              raise HTTPException(
                  status_code=status.HTTP_400_BAD_REQUEST,
                  detail=f"Coordinates do not match the provided barangay name. Detected barangay: {barangay['name']}",
              )

          display_name = data.get("display_name", "Unknown Location")
          if barangay:
              subdivision_values = {
                  value
                  for key in ("barangay", "neighbourhood", "quarter", "suburb", "village")
                  if (value := address.get(key))
              }
              address_parts = [
                  part.strip()
                  for part in display_name.split(",")
                  if part.strip() not in subdivision_values
              ]
              insert_at = 1 if address_parts else 0
              address_parts.insert(insert_at, barangay["name"])
              display_name = ", ".join(address_parts)

          return {
              "display_name": display_name,
              "geometry": barangay['geometry'] if barangay else None
          }
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        print(f"Reverse geocoding request failed: {e}")
        return {"display_name": "Unknown Location"}
    except Exception as e:
          print(f"Reverse geocoding failed: {e}")
          return {"display_name": "Unknown Location"}