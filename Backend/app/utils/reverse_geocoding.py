import httpx
from fastapi import HTTPException, status


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

        
          barangay = (address.get("suburb") or address.get("neighbourhood") or address.get("quarter") or address.get("hamlet"))
          print(f"Reverse geocoding result - Municipality: {municipality}, Province: {province}, Barangay: {barangay}")
          if barangay and barangay.lower() != barangay_name.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The provided coordinates do not match the specified barangay ({barangay_name})",
                )

          
          return data.get("display_name", "Unknown Location")
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        print(f"Reverse geocoding request failed: {e}")
        return {"display_name": "Unknown Location"}
    except Exception as e:
          print(f"Reverse geocoding failed: {e}")
          return {"display_name": "Unknown Location"}