from app.models.emergency_contacts import EmergencyContact
from fastapi import HTTPException, status, Request
from sqlalchemy import select
from app.schemas.emergency_hotline import CreateEmergencyHotlineModel
from app.models.emergency_agencies import EmergencyAgency
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
async def add_emergency_hotlines(hotline_data: CreateEmergencyHotlineModel, db: AsyncSession):
    try:
      result = await db.execute(
          select(EmergencyAgency).where(EmergencyAgency.agency_name == hotline_data.agency_name)
      )
      existing_agency = result.scalars().first()
      if existing_agency:
          raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This agency already exists.")
      
      new_agency = EmergencyAgency(
          agency_name=hotline_data.agency_name
      )
      db.add(new_agency)
      await db.commit()
      await db.refresh(new_agency)
      
      for contact in hotline_data.contact_numbers:
          new_contact = EmergencyContact(
              agency_id=new_agency.id,
              contact_number=contact
          )
          db.add(new_contact)
      await db.commit()
      return new_agency
    
    except HTTPException as http_exc:
        raise http_exc
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      
      


async def get_emergency_hotlines(db: AsyncSession):
    result = await db.execute(
        select(EmergencyAgency).options(selectinload(EmergencyAgency.emergency_contacts))
    )
    agencies = result.scalars().all()

    if not agencies:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No emergency hotlines found.")

    return agencies