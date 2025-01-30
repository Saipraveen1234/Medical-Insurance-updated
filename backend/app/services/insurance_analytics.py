from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import pandas as pd
import base64
import io
from app.models import Employee, InsuranceFile

class InsuranceService:
    def __init__(self, db: Session):
        self.db = db

    def process_file(self, file_content: str, plan_name: str) -> None:
        try:
            parts = plan_name.split('-')
            month = parts[-2]
            year = int(parts[-1])

            if ',' in file_content:
                file_content = file_content.split(',')[1]
            decoded = base64.b64decode(file_content)
            file_buffer = io.BytesIO(decoded)

            try:
                df = pd.read_excel(file_buffer)
                print("Columns found:", df.columns.tolist())
            except:
                file_buffer.seek(0)
                df = pd.read_csv(file_buffer)

            insurance_file = InsuranceFile(
                plan_name=plan_name,
                file_name=f"{plan_name}.xlsx",
                month=month,
                year=year
            )
            self.db.add(insurance_file)
            self.db.flush()

            for _, row in df.iterrows():
                try:
                    # Try different possible column names for amount
                    amount_column_names = ['Premium Amount', 'Premium', 'Amount', 'Charge Amount', 'PREMIUM']
                    premium_amount = None
                    
                    for col_name in amount_column_names:
                        if col_name in df.columns:
                            premium_amount = row.get(col_name, 0)
                            break
                    
                    if premium_amount is None:
                        print(f"Warning: No amount column found. Available columns: {df.columns.tolist()}")
                        premium_amount = 0
                    
                    # Convert amount to float
                    if isinstance(premium_amount, str):
                        # Remove currency symbols and commas
                        premium_amount = premium_amount.replace('$', '').replace(',', '')
                        # Handle any other non-numeric characters
                        premium_amount = ''.join(c for c in premium_amount if c.isdigit() or c in '.-')
                        premium_amount = float(premium_amount) if premium_amount else 0
                    else:
                        premium_amount = float(premium_amount) if pd.notnull(premium_amount) else 0

                    print(f"Processing row - Amount: {premium_amount}")  # Debug line

                    employee = Employee(
                        subscriber_name=str(row.get('ID', '')),
                        plan=plan_name,
                        coverage_type=str(row.get('Coverage Type', 'Standard')),
                        status=str(row.get('Adj Code', 'nan')),
                        coverage_dates=str(row.get('Coverage Dates', '')),
                        charge_amount=premium_amount,
                        month=month,
                        year=year,
                        insurance_file_id=insurance_file.id
                    )
                    self.db.add(employee)
                except Exception as row_error:
                    print(f"Error processing row: {row_error}")
                    print(f"Row data: {row}")  # Debug line
                    continue

            self.db.commit()

        except Exception as e:
            self.db.rollback()
            print(f"Error processing file: {str(e)}")  # Debug line
            raise ValueError(str(e))

    def get_invoice_data(self) -> List[Dict[str, Any]]:
        try:
            latest_file = (
                self.db.query(InsuranceFile)
                .order_by(InsuranceFile.upload_date.desc())
                .first()
            )
            
            if not latest_file:
                return []

            employees = (
                self.db.query(Employee)
                .filter(Employee.insurance_file_id == latest_file.id)
                .all()
            )

            result = []
            for employee in employees:
                # Format the adjustment code
                adj_code = "No Adjustments"
                if employee.status and employee.status.upper() != 'NAN':
                    if employee.status.upper() == 'ADD':
                        adj_code = 'Addition'
                    elif employee.status.upper() == 'TRM':
                        adj_code = 'Termination'
                    else:
                        adj_code = f'Other ({employee.status})'

                result.append({
                    'invoiceId': employee.subscriber_name,  # This is the ID from Excel
                    'invoiceDate': datetime.utcnow().strftime('%Y-%m-%d'),
                    'coverageDates': employee.coverage_dates,
                    'amount': float(employee.charge_amount),
                    'adjCode': adj_code
                })

            return sorted(result, key=lambda x: x['amount'], reverse=True)

        except Exception as e:
            print(f"Error getting invoice data: {str(e)}")
            return []

    def get_uploaded_files(self) -> List[Dict[str, str]]:
        try:
            files = self.db.query(InsuranceFile).order_by(InsuranceFile.upload_date.desc()).all()
            return [{
                'planName': file.plan_name,
                'fileName': file.file_name,
                'uploadDate': file.upload_date.strftime('%Y-%m-%d %H:%M:%S')
            } for file in files]
        except Exception as e:
            print(f"Error getting uploaded files: {str(e)}")
            return []

    def delete_file(self, plan_name: str) -> None:
        try:
            file = self.db.query(InsuranceFile).filter_by(plan_name=plan_name).first()
            if not file:
                raise ValueError(f"File not found: {plan_name}")
            
            self.db.delete(file)
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise ValueError(str(e))