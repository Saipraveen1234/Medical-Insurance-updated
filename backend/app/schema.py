import strawberry
from typing import List, Optional, Dict
from strawberry.types import Info
from app.context import GraphQLContext
from app.services.insurance_analytics import InsuranceService

@strawberry.type
class MonthlyData:
    month: str
    amount: float

@strawberry.type
class PlanData:
    planType: str
    monthlyAmounts: List[MonthlyData]
    total: float

@strawberry.type
class MonthTotal:
    month: str
    total: float

@strawberry.type
class MonthlyAnalysis:
    months: List[str]
    planTypes: List[str]
    planData: List[PlanData]
    monthTotals: List[MonthTotal]
    grandTotal: float

@strawberry.type
class MetricsDistributionEntry:
    name: str
    value: int

@strawberry.type
class EmployeeHistory:
    month: str
    year: int
    plan: str
    coverageType: str  # Changed from coverage_type
    status: str
    coverageDates: str  # Changed from coverage_dates
    chargeAmount: float  # Changed from charge_amount

@strawberry.type
class EmployeeDetail:
    subscriberName: str
    plan: str
    coverageType: str
    status: str
    coverageDates: str
    chargeAmount: float
    month: str
    year: int
    history: List[EmployeeHistory]
    sourcePlan: Optional[str] = None

@strawberry.type
class InsuranceMetrics:
    totalEmployees: int
    activeEmployees: int
    totalPremium: float
    averagePremium: float
    planDistribution: List[MetricsDistributionEntry]
    coverageDistribution: List[MetricsDistributionEntry]

@strawberry.type
class CostAnalysis:
    plan: str
    totalCost: float
    averageCost: float
    policyCount: int
    subscriberCount: int

@strawberry.type
class CoverageAnalysis:
    coverageType: str
    plan: str
    totalPremium: float
    averagePremium: float
    subscriberCount: int

@strawberry.type
class UploadedFile:
    planName: str
    fileName: str
    uploadDate: str

@strawberry.input
class FileInput:
    name: str
    content: str
    planName: str

@strawberry.type
class OperationResult:
    success: bool
    message: str

@strawberry.type
class Query:
    @strawberry.field
    def get_metrics(self, info: Info) -> Optional[InsuranceMetrics]:
        service = InsuranceService(info.context.db)
        metrics = service.get_metrics()
        if not metrics:
            return None
            
        return InsuranceMetrics(
            totalEmployees=metrics.total_employees,
            activeEmployees=metrics.active_employees,
            totalPremium=metrics.total_premium,
            averagePremium=metrics.average_premium,
            planDistribution=[
                MetricsDistributionEntry(name=p.name, value=p.value) 
                for p in metrics.plan_distribution
            ],
            coverageDistribution=[
                MetricsDistributionEntry(name=c.name, value=c.value) 
                for c in metrics.coverage_distribution
            ]
        )
    
    @strawberry.field
    def get_monthly_analysis(
        self,
        info: Info,
        year: int
    ) -> MonthlyAnalysis:
        service = InsuranceService(info.context.db)
        data = service.get_monthly_analysis(year)
        if not data:
            return MonthlyAnalysis(
                months=[],
                planTypes=[],
                planData=[],
                monthTotals=[],
                grandTotal=0
            )
        
        plan_data = []
        for plan_type, monthly_data in data['monthly_data'].items():
            monthly_amounts = [
                MonthlyData(month=month, amount=amount)
                for month, amount in monthly_data.items()
            ]
            plan_data.append(PlanData(
                planType=plan_type,
                monthlyAmounts=monthly_amounts,
                total=data['plan_totals'].get(plan_type, 0)
            ))

        month_totals = [
            MonthTotal(month=month, total=total)
            for month, total in data['month_totals'].items()
        ]

        return MonthlyAnalysis(
            months=data['months'],
            planTypes=data['plan_types'],
            planData=plan_data,
            monthTotals=month_totals,
            grandTotal=data['grand_total']
        )

    @strawberry.field
    def get_cost_analysis(self, info: Info) -> List[CostAnalysis]:
        service = InsuranceService(info.context.db)
        results = service.get_cost_analysis()
        return [
            CostAnalysis(
                plan=result["plan"],
                totalCost=result["total_cost"],
                averageCost=result["average_cost"],
                policyCount=result["policy_count"],
                subscriberCount=result["subscriber_count"]
            )
            for result in results
        ]

    @strawberry.field
    def get_employee_details(
        self, 
        info: Info,
        search: Optional[str] = None
    ) -> List[EmployeeDetail]:
        service = InsuranceService(info.context.db)
        results = service.get_employee_details(search)
        return [
            EmployeeDetail(
                subscriberName=result["subscriber_name"],
                plan=result["plan"],
                coverageType=result["coverage_type"],
                status=result["status"],
                coverageDates=result["coverage_dates"],
                chargeAmount=result["charge_amount"],
                month=result["month"],
                year=result["year"],
                sourcePlan=result.get("source_plan"),
                history=[
                    EmployeeHistory(
                        month=h["month"],
                        year=h["year"],
                        plan=h["plan"],
                        coverageType=h["coverage_type"],
                        status=h["status"],
                        coverageDates=h["coverage_dates"],
                        chargeAmount=h["charge_amount"]
                    ) for h in result.get("history", [])
                ]
            )
            for result in results
        ]

    @strawberry.field
    def get_coverage_analysis(self, info: Info) -> List[CoverageAnalysis]:
        service = InsuranceService(info.context.db)
        results = service.get_coverage_analysis()
        return [
            CoverageAnalysis(
                coverageType=result["coverage_type"],
                plan=result["plan"],
                totalPremium=result["total_premium"],
                averagePremium=result["average_premium"],
                subscriberCount=result["subscriber_count"]
            )
            for result in results
        ]

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

@strawberry.type
class Mutation:
    @strawberry.mutation
    def upload_file(
        self,
        info: Info,
        fileInput: FileInput
    ) -> OperationResult:
        try:
            service = InsuranceService(info.context.db)
            service.process_file(fileInput.content, fileInput.planName)
            return OperationResult(success=True, message="File uploaded successfully")
        except Exception as e:
            return OperationResult(success=False, message=str(e))

    @strawberry.mutation
    def delete_file(
        self,
        info: Info,
        planName: str
    ) -> OperationResult:
        try:
            service = InsuranceService(info.context.db)
            service.delete_file(planName)
            return OperationResult(success=True, message="File deleted successfully")
        except Exception as e:
            print(f"Error in delete_file mutation: {str(e)}")
            return OperationResult(success=False, message=str(e))

schema = strawberry.Schema(query=Query, mutation=Mutation)