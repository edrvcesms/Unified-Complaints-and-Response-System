from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.department import Department
from app.models.user import User
from app.models.category import Category
from app.models.barangay import Barangay
from app.models.priority_level import PriorityLevel
from app.models.department_account import DepartmentAccount
from app.models.barangay_account import BarangayAccount
from app.schemas.barangay_schema import BarangayWithUserData, BarangayAccountCreate
from app.admin._super_admin_schemas import ComplaintCategoryCreate, DepartmentCreate, DepartmentCreate, PriorityLevelCreate
from sqlalchemy import select
from app.core.security import hash_password
from datetime import datetime

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
        role="barangay_admin",
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

async def create_priority_level(priority_data: PriorityLevelCreate, db: AsyncSession):

    result = await db.execute(
        select(PriorityLevel).where(PriorityLevel.priority_name == priority_data.priority_name)
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Priority level already exists")

    new_priority = PriorityLevel(
        priority_name=priority_data.priority_name,
        created_at=datetime.utcnow()
    )
    db.add(new_priority)
    await db.commit()
    await db.refresh(new_priority)
    return new_priority

async def create_department(department_data: DepartmentCreate, db: AsyncSession):
    
    result = await db.execute(
        select(Department).where(Department.department_name == department_data.department_name)
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department already exists")

    new_department = Department(
        department_name=department_data.department_name,
        description=department_data.description,
        created_at=datetime.utcnow()
    )
    db.add(new_department)
    await db.commit()
    await db.refresh(new_department)
    return new_department

async def create_department_account(user_id: int, department_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(DepartmentAccount).where(DepartmentAccount.department_id == department_id)
        )
        if result.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department already has a department account")
        
        result = await db.execute(
            select(Department).where(Department.id == department_id)
        )
        department = result.scalars().first()
        if not department:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        department_account = DepartmentAccount(
            user_id=user_id,
            department_id=department_id,
            created_at=datetime.utcnow()
        )
        db.add(department_account)
        await db.commit()
        await db.refresh(department_account)
        return department_account
    except HTTPException as e:
        raise e