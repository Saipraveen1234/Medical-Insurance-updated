# app/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class InsuranceFile(Base):
    __tablename__ = "insurance_files"

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String, index=True, unique=True)
    file_name = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    month = Column(String, index=True)  # OCT, NOV, etc.
    year = Column(Integer, index=True)  # 2024, 2025, etc.
    
    employees = relationship("Employee", back_populates="insurance_file", cascade="all, delete-orphan")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    subscriber_name = Column(String, index=True)
    plan = Column(String, index=True)  # UHC-3000, UHC-2000, etc.
    coverage_type = Column(String)
    status = Column(String)
    coverage_dates = Column(String)
    charge_amount = Column(Float)
    month = Column(String, index=True)  # OCT, NOV, etc.
    year = Column(Integer, index=True)  # 2024, 2025, etc.
    
    insurance_file_id = Column(Integer, ForeignKey("insurance_files.id", ondelete="CASCADE"))
    insurance_file = relationship("InsuranceFile", back_populates="employees")