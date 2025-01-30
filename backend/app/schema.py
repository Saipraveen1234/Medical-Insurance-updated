import strawberry
from typing import List, Optional
from strawberry.types import Info
from datetime import datetime
from app.services.insurance_analytics import InsuranceService

@strawberry.type
class InvoiceData:
    invoiceId: str
    invoiceDate: str
    coverageDates: str
    amount: float
    adjCode: str

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
    def get_invoice_data(self, info: Info) -> List[InvoiceData]:
        service = InsuranceService(info.context.db)
        data = service.get_invoice_data()
        return [
            InvoiceData(
                invoiceId=item['invoiceId'],
                invoiceDate=item['invoiceDate'],
                coverageDates=item['coverageDates'],
                amount=item['amount'],
                adjCode=item['adjCode']
            )
            for item in data
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
    def upload_file(self, info: Info, fileInput: FileInput) -> OperationResult:
        try:
            service = InsuranceService(info.context.db)
            service.process_file(fileInput.content, fileInput.planName)
            return OperationResult(success=True, message="File uploaded successfully")
        except Exception as e:
            return OperationResult(success=False, message=str(e))

    @strawberry.mutation
    def delete_file(self, info: Info, planName: str) -> OperationResult:
        try:
            service = InsuranceService(info.context.db)
            service.delete_file(planName)
            return OperationResult(success=True, message="File deleted successfully")
        except Exception as e:
            return OperationResult(success=False, message=str(e))

schema = strawberry.Schema(query=Query, mutation=Mutation)