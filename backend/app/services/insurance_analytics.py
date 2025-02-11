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

    def get_uhg_plan_type(self, row) -> str:
        """Determine UHG plan type based on row data"""
        plan_col = str(row.get('plan', '')).upper()
        policy_col = str(row.get('policy', '')).upper()
        check_text = f"{plan_col} {policy_col}"
        
        if any(life_term in check_text for life_term in ['LIFE', 'TERM LIFE', 'GTL']):
            return 'UHG-LIFE'
        elif any(vision_term in check_text for vision_term in ['VISION', 'VSP']):
            return 'UHG-VISION'
        elif any(dental_term in check_text for dental_term in ['DENTAL', 'DHMO']):
            return 'UHG-DENTAL'
            
        coverage_type = str(row.get('coverage type', '')).upper()
        if 'LIFE' in coverage_type:
            return 'UHG-LIFE'
        elif 'VISION' in coverage_type:
            return 'UHG-VISION'
        elif 'DENTAL' in coverage_type:
            return 'UHG-DENTAL'
            
        return 'UHG-OTHER'

    def process_file(self, file_content: str, plan_name: str) -> Dict[str, Any]:
        try:
            # Check if file already exists
            existing_file = self.db.query(InsuranceFile).filter_by(plan_name=plan_name).first()
            if existing_file:
                print(f"Duplicate file detected: {plan_name}") # Add debug print
                result = {
                    "success": False,
                    "error": f"A file with plan name '{plan_name}' already exists. Please delete the existing file before uploading a new one."
                }
                print("Returning result:", result) # Add debug print
                return result

            parts = plan_name.split('-')
            base_plan = parts[0]
            
            if base_plan == 'UHG':
                month = parts[1]
                year = int(parts[2])
            else:
                base_plan = f"{parts[0]}-{parts[1]}"
                month = parts[2]
                year = int(parts[3])

            if ';base64,' in file_content:
                file_content = file_content.split(';base64,')[1]
            elif ',' in file_content:
                file_content = file_content.split(',')[1]
                
            decoded = base64.b64decode(file_content)
            file_buffer = io.BytesIO(decoded)

            try:
                df = pd.read_excel(file_buffer, skiprows=1)
            except:
                file_buffer.seek(0)
                df = pd.read_csv(file_buffer, skiprows=1)

            insurance_file = InsuranceFile(
                plan_name=plan_name,
                file_name=f"{plan_name}.xlsx",
                month=month,
                year=year
            )
            self.db.add(insurance_file)
            self.db.flush()

            df.columns = df.columns.str.strip().str.lower()
            
            amount_columns = ['charge amount', 'premium amount', 'premium', 'amount']
            amount_col = next((col for col in amount_columns if col in df.columns), None)
            
            if not amount_col:
                return {
                    "success": False,
                    "error": f"No amount column found. Available columns: {df.columns.tolist()}"
                }

            for _, row in df.iterrows():
                try:
                    amount = row[amount_col]
                    if isinstance(amount, str):
                        amount = amount.replace('$', '').replace(',', '')
                    amount = float(amount)

                    if base_plan == 'UHG':
                        plan_type = self.get_uhg_plan_type(row)
                    else:
                        plan_type = base_plan

                    employee = Employee(
                        subscriber_name=str(row.get('id', row.get('subscriber id', ''))),
                        plan=plan_type,
                        coverage_type=str(row.get('coverage type', 'Standard')),
                        status=str(row.get('adj code', row.get('status', 'No Adjustments'))).upper().strip(),
                        coverage_dates=str(row.get('coverage dates', '')),
                        charge_amount=amount,
                        month=month,
                        year=year,
                        insurance_file_id=insurance_file.id
                    )
                    self.db.add(employee)

                except Exception as row_error:
                    print(f"Error processing row: {row_error}")
                    continue

            self.db.commit()
            return {
                "success": True,
                "message": "File uploaded successfully"
            }

        except Exception as e:
            self.db.rollback()
            return {
                "success": False,
                "error": str(e)
            }

    def get_invoice_data(self) -> List[Dict[str, Any]]:
        try:
            results = []
            files = self.db.query(InsuranceFile).all()
            
            for file in files:
                employees = (
                    self.db.query(Employee)
                    .filter(Employee.insurance_file_id == file.id)
                    .all()
                )

                plan_groups = {}
                month_map = {
                    'DEC': '12',
                    'NOV': '11',
                    'OCT': '10',
                    'SEP': '09',
                    'AUG': '08',
                    'JUL': '07',
                    'JUN': '06',
                    'MAY': '05',
                    'APR': '04',
                    'MAR': '03',
                    'FEB': '02',
                    'JAN': '01'
                }
                current_month = month_map.get(file.month, '01')
                current_year = str(file.year)
                
                for emp in employees:
                    if emp.plan not in plan_groups:
                        plan_groups[emp.plan] = {
                            'current_month': 0,
                            'previous_month': 0
                        }

                    try:
                        amount = float(emp.charge_amount)
                        coverage_dates = emp.coverage_dates or ""
                        adj_code = str(emp.status).upper().strip()

                        date_parts = coverage_dates.split('-')[0].strip().split('/')
                        if len(date_parts) == 3:
                            month, day, year = date_parts
                            
                            is_adjustment = (adj_code in ['TRM', 'CHG', 'ADD', 'TERM'] or amount < 0)
                            is_current_month = (month == current_month and year == current_year)
                            
                            if is_current_month and not is_adjustment:
                                plan_groups[emp.plan]['current_month'] += amount
                            elif is_adjustment or not is_current_month:
                                plan_groups[emp.plan]['previous_month'] += amount
                        else:
                            if adj_code in ['TRM', 'CHG', 'ADD', 'TERM'] or amount < 0:
                                plan_groups[emp.plan]['previous_month'] += amount
                            else:
                                plan_groups[emp.plan]['current_month'] += amount

                    except Exception as e:
                        print(f"Error processing amount for employee {emp.subscriber_name}: {str(e)}")
                        continue

                for plan_type, amounts in plan_groups.items():
                    if amounts['current_month'] == 0 and amounts['previous_month'] == 0:
                        continue
                        
                    if plan_type == 'UHG-OTHER' and any(k.startswith('UHG-') for k in plan_groups.keys()):
                        continue
                        
                    results.append({
                        'planType': plan_type,
                        'month': file.month,
                        'year': file.year,
                        'currentMonthTotal': amounts['current_month'],
                        'previousMonthsTotal': amounts['previous_month'],
                        'grandTotal': amounts['current_month'] + amounts['previous_month']
                    })

            return results

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