from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class InsuranceFile(Base):
    __tablename__ = "insurance_files"

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String, index=True, unique=True)
    file_name = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow, index=True)
    month = Column(String, index=True)  # OCT, NOV, etc.
    year = Column(Integer, index=True)  # 2024, 2025, etc.
    
    employees = relationship("Employee", back_populates="insurance_file", cascade="all, delete-orphan")
    
    # Critical composite indexes for common queries
    __table_args__ = (
        Index('idx_month_year', month, year),
    )

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
    
    insurance_file_id = Column(Integer, ForeignKey("insurance_files.id", ondelete="CASCADE"), index=True)
    insurance_file = relationship("InsuranceFile", back_populates="employees")
    
    # Critical composite indexes for frequent queries
    __table_args__ = (
        Index('idx_file_id_plan', insurance_file_id, plan),
        Index('idx_plan_month_year', plan, month, year),
        Index('idx_year_month', year, month),
        # Index specifically for fiscal year queries
        Index('idx_charge_year_month', charge_amount, year, month),
    )