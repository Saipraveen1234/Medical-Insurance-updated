import strawberry
from typing import List, Optional
from strawberry.types import Info
from datetime import datetime
from app.services.insurance_analytics import InsuranceService
from sqlalchemy import or_, and_

@strawberry.type
class InvoiceSummary:
    planType: str
    month: str
    year: int
    currentMonthTotal: float
    previousMonthsTotal: float
    fiscal2024Total: float
    fiscal2025Total: float
    allPreviousAdjustments: float
    grandTotal: float

@strawberry.type
class FiscalYearTotals:
    fiscal2024Total: float
    fiscal2025Total: float

@strawberry.type
class UploadedFile:
    planName: str
    fileName: str
    uploadDate: str

@strawberry.type
class EmployeeDetail:
    id: int
    subscriberId: str  # This is the subscriber ID number (e.g., 8062743400)
    subscriberName: str  # This is the actual name of the subscriber
    plan: str
    coverageType: str
    status: str
    coverageDates: str
    chargeAmount: float
    previousAdjustments: float  # Amount from previous adjustments
    previousFiscalAmount: float  # Amount from previous fiscal year
    month: str
    year: int
    insuranceFileId: int
    
@strawberry.type
class EmployeeDetailResponse:
    total: int
    employees: List[EmployeeDetail]

@strawberry.input
class FileInput:
    name: str
    content: str
    planName: str

@strawberry.type
class OperationResult:
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None

@strawberry.type
class Query:
    @strawberry.field
    def get_invoice_data(self, info: Info) -> List[InvoiceSummary]:
        """Legacy method - use get_invoice_data_paginated for better performance"""
        service = InsuranceService(info.context.db)
        data = service.get_invoice_data()
        return [
            InvoiceSummary(
                planType=item['planType'],
                month=item['month'],
                year=item['year'],
                currentMonthTotal=item['currentMonthTotal'],
                previousMonthsTotal=item['previousMonthsTotal'],
                fiscal2024Total=item['fiscal2024Total'],
                fiscal2025Total=item['fiscal2025Total'],
                allPreviousAdjustments=item['allPreviousAdjustments'],
                grandTotal=item['grandTotal']
            )
            for item in data
        ]
        
    @strawberry.field
    def get_invoice_data_paginated(
        self, 
        info: Info, 
        page: int = 1, 
        limit: int = 100,
        filterPlan: Optional[str] = None,
        filterMonth: Optional[str] = None,
        filterYear: Optional[int] = None
    ) -> List[InvoiceSummary]:
        """Optimized paginated invoice data query"""
        service = InsuranceService(info.context.db)
        data = service.get_invoice_data_paginated(
            page=page, 
            limit=limit,
            filter_plan=filterPlan,
            filter_month=filterMonth,
            filter_year=filterYear
        )
        return [
            InvoiceSummary(
                planType=item['planType'],
                month=item['month'],
                year=item['year'],
                currentMonthTotal=item['currentMonthTotal'],
                previousMonthsTotal=item['previousMonthsTotal'],
                fiscal2024Total=item['fiscal2024Total'],
                fiscal2025Total=item['fiscal2025Total'],
                allPreviousAdjustments=item['allPreviousAdjustments'],
                grandTotal=item['grandTotal']
            )
            for item in data
        ]
    
    @strawberry.field
    def get_fiscal_year_totals(self, info: Info) -> FiscalYearTotals:
        """Ultra-fast query to get only fiscal year totals without details"""
        service = InsuranceService(info.context.db)
        totals = service.get_fiscal_year_totals()
        return FiscalYearTotals(
            fiscal2024Total=totals['fiscal2024Total'],
            fiscal2025Total=totals['fiscal2025Total']
        )

    @strawberry.field
    def get_uploaded_files(self, info: Info) -> List[UploadedFile]:
        service = InsuranceService(info.context.db)
        results = service.get_uploaded_files()
        return [
            UploadedFile(
                planName=result['planName'],
                fileName=result['fileName'],
                uploadDate=result['uploadDate']
            )
            for result in results
        ]
        
    @strawberry.field
    def get_employee_details(
        self, 
        info: Info, 
        page: int = 1, 
        limit: int = 10,
        searchText: Optional[str] = None
    ) -> EmployeeDetailResponse:
        """Get paginated employee details with optional search"""
        service = InsuranceService(info.context.db)
        results = service.get_employee_details(page, limit, searchText)
        
        return EmployeeDetailResponse(
            total=results['total'],
            employees=[
                EmployeeDetail(
                    id=emp['id'],
                    subscriberId=emp.get('subscriberId', emp.get('subscriber_name', '')),
                    subscriberName=emp.get('subscriberName', emp.get('Subscriber Name', '')),
                    plan=emp['plan'],
                    coverageType=emp['coverageType'],
                    status=emp['status'],
                    coverageDates=emp['coverageDates'],
                    chargeAmount=emp['chargeAmount'],
                    previousAdjustments=emp.get('previousAdjustments', 0.0),
                    previousFiscalAmount=emp.get('previousFiscalAmount', 0.0),
                    month=emp['month'],
                    year=emp['year'],
                    insuranceFileId=emp['insuranceFileId']
                )
                for emp in results['employees']
            ]
        )
    
    @strawberry.field
    def get_all_employees(self, info: Info) -> List[EmployeeDetail]:
        """Get all employee details (for smaller datasets or initial load)"""
        service = InsuranceService(info.context.db)
        employees = service.get_all_employees()
        
        return [
            EmployeeDetail(
                id=emp['id'],
                # Split subscriber_name to get ID and name if possible
                subscriberId=emp['subscriber_name'].split(' - ')[0] if ' - ' in emp['subscriber_name'] else emp['subscriber_name'],
                subscriberName=emp['subscriber_name'].split(' - ')[1] if ' - ' in emp['subscriber_name'] else f"Employee {emp['id']}",
                plan=emp['plan'],
                coverageType=emp['coverage_type'],
                status=emp['status'],
                coverageDates=emp['coverage_dates'],
                chargeAmount=emp['charge_amount'],
                previousAdjustments=0.0,
                previousFiscalAmount=0.0,
                month=emp['month'],
                year=emp['year'],
                insuranceFileId=emp['insurance_file_id']
            )
            for emp in employees
        ]
        
        
    @strawberry.field
    def get_unique_employees(
        self, 
        info: Info, 
        page: int = 1, 
        limit: int = 10,
        searchText: Optional[str] = None
    ) -> EmployeeDetailResponse:
        """Get paginated unique employees with optional search (only latest record per subscriber)"""
        service = InsuranceService(info.context.db)
        results = service.get_unique_employees(page, limit, searchText)
        
        return EmployeeDetailResponse(
            total=results['total'],
            employees=[
                EmployeeDetail(
                    id=emp['id'],
                    subscriberId=emp.get('subscriberId', emp.get('subscriber_id', '')),
                    subscriberName=emp.get('subscriberName', emp.get('subscriber_name', '')),
                    plan=emp['plan'],
                    coverageType=emp['coverageType'],
                    status=emp['status'],
                    coverageDates=emp['coverageDates'],
                    chargeAmount=emp['chargeAmount'],
                    previousAdjustments=emp.get('previousAdjustments', 0.0),
                    previousFiscalAmount=emp.get('previousFiscalAmount', 0.0),
                    month=emp['month'],
                    year=emp['year'],
                    insuranceFileId=emp['insuranceFileId']
                )
                for emp in results['employees']
            ]
        )

@strawberry.type
class Mutation:
    @strawberry.mutation
    def upload_file(self, info: Info, fileInput: FileInput) -> OperationResult:
        try:
            service = InsuranceService(info.context.db)
            result = service.process_file(fileInput.content, fileInput.planName)
            
            if isinstance(result, dict):
                return OperationResult(
                    success=result.get('success', False),
                    message=result.get('message'),
                    error=result.get('error')
                )
            
            return OperationResult(
                success=True,
                message="File uploaded successfully"
            )
            
        except Exception as e:
            return OperationResult(
                success=False,
                error=str(e)
            )

    @strawberry.mutation
    def delete_file(self, info: Info, planName: str) -> OperationResult:
        try:
            service = InsuranceService(info.context.db)
            service.delete_file(planName)
            return OperationResult(
                success=True,
                message="File deleted successfully"
            )
        except Exception as e:
            return OperationResult(
                success=False,
                error=str(e)
            )

schema = strawberry.Schema(query=Query, mutation=Mutation)