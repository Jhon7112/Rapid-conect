from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import Employee, User, CampaignRecipient
from app.schemas.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("", response_model=dict)
def get_employees(
    search: Optional[str] = None,
    company: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Employee)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Employee.employee_name.ilike(pattern),
                Employee.email_id.ilike(pattern),
                Employee.company_name.ilike(pattern),
                Employee.contact_number.ilike(pattern),
                Employee.whatsapp_number.ilike(pattern),
                Employee.job_title.ilike(pattern)
            )
        )

    if company and company != "All":
        query = query.filter(Employee.company_name == company)

    if status and status != "All":
        query = query.filter(Employee.status == status)

    total = query.count()
    employees = query.order_by(Employee.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Get unique companies for filter dropdown
    companies_raw = db.query(Employee.company_name).distinct().all()
    companies = [c[0] for c in companies_raw if c[0]]

    return {
        "items": [EmployeeResponse.from_orm(e) for e in employees],
        "total": total,
        "page": page,
        "limit": limit,
        "companies": sorted(companies)
    }

@router.post("/bulk-import")
def bulk_import_employees(
    employees_in: List[EmployeeCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if len(employees_in) > 500:
        raise HTTPException(
            status_code=400,
            detail="Batch size limit exceeded. Maximum 500 candidates permitted per import batch."
        )

    imported_count = 0
    duplicate_count = 0
    for emp_data in employees_in:
        name_clean = (emp_data.employee_name or "").strip()
        email_clean = (emp_data.email_id or "").strip()

        if not name_clean or not email_clean:
            continue

        existing = db.query(Employee).filter(
            Employee.email_id.ilike(email_clean),
            Employee.employee_name.ilike(name_clean)
        ).first()

        if existing:
            duplicate_count += 1
            continue

        emp = Employee(
            employee_name=name_clean,
            email_id=email_clean,
            company_name=emp_data.company_name or None,
            contact_number=emp_data.contact_number or None,
            whatsapp_number=emp_data.whatsapp_number or None,
            job_title=emp_data.job_title or None,
            status=emp_data.status or "Active"
        )
        db.add(emp)
        imported_count += 1

    db.commit()
    return {
        "message": f"Successfully imported {imported_count} candidate(s). {duplicate_count} duplicate(s) skipped.",
        "count": imported_count,
        "duplicates_skipped": duplicate_count
    }

@router.post("/bulk-delete")
def bulk_delete_employees(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No employee IDs provided for deletion")
    
    # Nullify references in campaign recipients to prevent foreign key errors
    db.query(CampaignRecipient).filter(CampaignRecipient.employee_id.in_(ids)).update({CampaignRecipient.employee_id: None}, synchronize_session=False)
    
    count = db.query(Employee).filter(Employee.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted {count} candidates", "count": count}

@router.delete("/clear-all")
def clear_all_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Nullify references in campaign recipients to prevent foreign key errors
    db.query(CampaignRecipient).filter(CampaignRecipient.employee_id.isnot(None)).update({CampaignRecipient.employee_id: None}, synchronize_session=False)
    
    count = db.query(Employee).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Cleared all {count} candidates from directory", "count": count}

@router.post("/seed")
def seed_employees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Seeds sample candidates/employees if database is empty."""
    count = db.query(Employee).count()
    if count > 0:
        return {"message": "Employees already present", "count": count}

    sample_candidates = [
        {"employee_name": "Rahul Sharma", "email_id": "rahul.sharma@example.com", "company_name": "TechCorp India", "contact_number": "+91 98765 43210", "whatsapp_number": "+91 98765 43210", "job_title": "Senior Frontend Engineer"},
        {"employee_name": "Priya Verma", "email_id": "priya.verma@example.com", "company_name": "DataScale Systems", "contact_number": "+91 98123 45678", "whatsapp_number": None, "job_title": "Lead Data Scientist"},
        {"employee_name": "Amit Kumar", "email_id": "amit.kumar@example.com", "company_name": "Innovate Labs", "contact_number": None, "whatsapp_number": None, "job_title": "Full Stack Developer"},
        {"employee_name": "Sneha Patel", "email_id": "sneha.patel@example.com", "company_name": "CloudNine Solutions", "contact_number": "+91 97654 32109", "whatsapp_number": "+91 97654 32109", "job_title": "DevOps Lead"},
        {"employee_name": "Vikas Singh", "email_id": "vikas.singh@example.com", "company_name": "TechCorp India", "contact_number": "+91 99887 76655", "whatsapp_number": "+91 99887 76655", "job_title": "Backend Python Developer"},
        {"employee_name": "Ananya Iyer", "email_id": "ananya.iyer@example.com", "company_name": "Apex Fintech", "contact_number": "+91 91234 56789", "whatsapp_number": None, "job_title": "Product Manager"},
        {"employee_name": "Rohan Gupta", "email_id": "rohan.gupta@example.com", "company_name": "DataScale Systems", "contact_number": None, "whatsapp_number": "+91 93456 78901", "job_title": "Data Architect"},
        {"employee_name": "Kavita Reddy", "email_id": "kavita.reddy@example.com", "company_name": "Innovate Labs", "contact_number": "+91 94567 89012", "whatsapp_number": "+91 94567 89012", "job_title": "UI/UX Designer"},
        {"employee_name": "Deepak Mehta", "email_id": "deepak.mehta@example.com", "company_name": "CloudNine Solutions", "contact_number": "+91 95678 90123", "whatsapp_number": None, "job_title": "QA Automation Engineer"},
        {"employee_name": "Neha Joshi", "email_id": "neha.joshi@example.com", "company_name": "Apex Fintech", "contact_number": "+91 96789 01234", "whatsapp_number": "+91 96789 01234", "job_title": "Security Analyst"},
    ]

    for item in sample_candidates:
        emp = Employee(**item)
        db.add(emp)

    db.commit()
    return {"message": "Sample candidate data seeded successfully", "count": len(sample_candidates)}

@router.post("", response_model=EmployeeResponse)
def create_employee(
    employee_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    name_clean = (employee_in.employee_name or "").strip()
    email_clean = (employee_in.email_id or "").strip()
    company_clean = (employee_in.company_name or "").strip()

    if not name_clean or not email_clean or not company_clean:
        raise HTTPException(status_code=400, detail="Vendor Name, Email ID, and Company Name are required.")

    # Duplicate validation: Check if candidate with same name AND email (or email) already exists
    existing_same = db.query(Employee).filter(
        Employee.email_id.ilike(email_clean),
        Employee.employee_name.ilike(name_clean)
    ).first()

    if existing_same:
        raise HTTPException(
            status_code=400,
            detail="Vendor already existed with this name and email."
        )

    existing_email = db.query(Employee).filter(
        Employee.email_id.ilike(email_clean)
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Vendor already existed with this email address."
        )

    try:
        emp = Employee(
            employee_name=name_clean,
            email_id=email_clean,
            company_name=company_clean,
            contact_number=employee_in.contact_number or None,
            whatsapp_number=employee_in.whatsapp_number or None,
            job_title=employee_in.job_title or None,
            status=employee_in.status or "Active"
        )
        db.add(emp)
        db.commit()
        db.refresh(emp)
        return emp
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger(__name__).error(f"[Create Vendor] Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred while creating vendor record.")

@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp

@router.patch("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: str,
    employee_in: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = employee_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(emp, field, None if val == "" else val)

    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/{employee_id}")
def delete_employee(employee_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db.query(CampaignRecipient).filter(CampaignRecipient.employee_id == employee_id).update({CampaignRecipient.employee_id: None}, synchronize_session=False)
    
    db.delete(emp)
    db.commit()
    return {"message": "Employee deleted"}
