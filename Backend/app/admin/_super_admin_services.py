from fastapi import HTTPException, status
from pinecone import Pinecone
from sqlalchemy.ext import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.department import Department
from app.models.user import User
from app.models.category import Category
from app.models.barangay import Barangay
from app.models.department import Department
from app.models.department_account import DepartmentAccount
from app.models.barangay_account import BarangayAccount
from app.schemas.barangay_schema import BarangayWithUserData, BarangayAccountCreate
from app.admin._super_admin_schemas import ComplaintCategoryCreate, DepartmentAccountCreate, LGUAccountCreate
from sqlalchemy import select
from app.core.security import hash_password
from datetime import datetime
from app.constants.roles import UserRole
from app.core.config import settings

# This file contains services that are only accessible to super administrators, such as creating barangay accounts, complaint categories, priority levels, sectors, and comittee accounts.


async def create_barangay_account(barangay_data: BarangayAccountCreate, db: AsyncSession) -> BarangayWithUserData:
    
    result = await db.execute(
        select(User).where(User.email == barangay_data.barangay_email)
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Barangay account already exists")

    hashed_password = hash_password(barangay_data.password)

    new_account = User(
        email=barangay_data.barangay_email,
        hashed_password=hashed_password,
        created_at=datetime.utcnow(),
        role=UserRole.BARANGAY_OFFICIAL.value,
        is_administrator=True
    )
    barangay = Barangay(
        barangay_name=barangay_data.barangay_name,
        barangay_address=barangay_data.barangay_address,
        barangay_contact_number=barangay_data.barangay_contact_number,
        barangay_email=barangay_data.barangay_email,
        created_at=datetime.utcnow()
    )

    barangay_account = BarangayAccount(
        user=new_account,
        barangay=barangay,
        created_at=datetime.utcnow()
    )

    db.add_all([new_account, barangay_account, barangay])
    await db.commit()
    await db.refresh(barangay_account)

    return BarangayWithUserData.model_validate(barangay_account.barangay, from_attributes=True)


async def create_complaint_category(category_data: ComplaintCategoryCreate, db: AsyncSession) -> Category:
    result = await db.execute(
        select(Category).where(Category.category_name == category_data.category_name)
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists")

    new_category = Category(
        category_name=category_data.category_name,
        created_at=datetime.utcnow()
    )
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return new_category

async def create_department(department_data: DepartmentAccountCreate, db: AsyncSession) -> Department:
    result = await db.execute(
        select(User).where(User.email == department_data.email)
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department account already exists")

    hashed_password = hash_password(department_data.password)

    new_account = User(
        email=department_data.email,
        hashed_password=hashed_password,
        created_at=datetime.utcnow(),
        role=UserRole.DEPARTMENT_STAFF.value,
        is_administrator=True
    )

    new_department = Department(
        department_name=department_data.department_name,
        description=department_data.description,
        created_at=datetime.utcnow()
    )
    department_account = DepartmentAccount(
        user=new_account,
        department=new_department,
        created_at=datetime.utcnow()
    )
    db.add_all([new_account, department_account, new_department])
    await db.commit()
    await db.refresh(new_department)
    return new_department
    
async def create_lgu_account(lgu_data: LGUAccountCreate, db: AsyncSession):
    try:
        result = await db.execute(
            select(User).where(User.email == lgu_data.email)
        )
        if result.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="LGU account already exists")

        hashed_password = hash_password(lgu_data.password)

        new_account = User(
            email=lgu_data.email,
            hashed_password=hashed_password,
            created_at=datetime.utcnow(),
            role=UserRole.LGU_OFFICIAL.value,
            is_administrator=True
        )

        db.add(new_account)
        await db.commit()
        await db.refresh(new_account)
        return new_account
    except HTTPException as e:
        raise e
    
async def delete_pinecone_data(index_name: str):
    try:
        # Create Pinecone client
        pc = Pinecone(api_key=settings.PINECONE_API_KEY, environment=settings.PINECONE_ENVIRONMENT)
        
        # List all indexes (run in thread since it's blocking)
        indexes = await asyncio.to_thread(pc.list_indexes)
        print("Existing Pinecone indexes:", indexes)  # DEBUG
        
        if index_name not in indexes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Index '{index_name}' not found. Existing indexes: {indexes}"
            )
        
        # Connect to the index
        index = pc.Index(index_name)
        
        # Delete all vectors
        await asyncio.to_thread(index.delete, delete_all=True)
        
        return {"message": f"All data deleted from index '{index_name}'"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting Pinecone data: {str(e)}"
        )