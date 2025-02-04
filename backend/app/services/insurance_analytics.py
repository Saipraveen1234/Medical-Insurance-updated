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
        # First check the Plan column
        plan_col = str(row.get('plan', '')).upper()
        
        # Also check Policy column if exists
        policy_col = str(row.get('policy', '')).upper()
        
        # Combine both columns for checking
        check_text = f"{plan_col} {policy_col}"
        
        # Print for debugging
        print(f"Checking plan type for: {check_text}")
        
        if any(life_term in check_text for life_term in ['LIFE', 'TERM LIFE', 'GTL']):
            return 'UHG-LIFE'
        elif any(vision_term in check_text for vision_term in ['VISION', 'VSP']):
            return 'UHG-VISION'
        elif any(dental_term in check_text for dental_term in ['DENTAL', 'DHMO']):
            return 'UHG-DENTAL'
            
        # If no specific match found, try to determine from the amount or other fields
        coverage_type = str(row.get('coverage type', '')).upper()
        if 'LIFE' in coverage_type:
            return 'UHG-LIFE'
        elif 'VISION' in coverage_type:
            return 'UHG-VISION'
        elif 'DENTAL' in coverage_type:
            return 'UHG-DENTAL'
            
        print(f"Warning: Could not determine specific UHG plan type for row: {row}")
        return 'UHG-OTHER'

    def process_file(self, file_content: str, plan_name: str) -> None:
        try:
# Extract file info
            parts = plan_name.split('-')
            base_plan = parts[0]  # UHG, UHC
            
            if base_plan == 'UHG':
                month = parts[1]      # OCT
                year = int(parts[2])  # 2024
            else:
                base_plan = f"{parts[0]}-{parts[1]}"  # UHC-3000
                month = parts[2]      # OCT
                year = int(parts[3])  # 2024

            # Decode file content
            if ',' in file_content:
                file_content = file_content.split(',')[1]
            decoded = base64.b64decode(file_content)
            file_buffer = io.BytesIO(decoded)

            # Read file
            try:
                df = pd.read_excel(file_buffer)
            except:
                file_buffer.seek(0)
                df = pd.read_csv(file_buffer)

            # Create insurance file record
            insurance_file = InsuranceFile(
                plan_name=plan_name,
                file_name=f"{plan_name}.xlsx",
                month=month,
                year=year
            )
            self.db.add(insurance_file)
            self.db.flush()

            # Standardize column names
            df.columns = df.columns.str.strip().str.lower()

            # Print columns for debugging
            print("Available columns:", df.columns.tolist())
            
            # Find amount column
            amount_columns = ['charge amount', 'premium amount', 'premium', 'amount']
            amount_col = next((col for col in amount_columns if col in df.columns), None)
            
            if not amount_col:
                raise ValueError(f"No amount column found. Available columns: {df.columns.tolist()}")
                
            # For UHG files, ensure we can detect plan types
            if base_plan == 'UHG':
                print("Processing UHG file. Column info:", df.columns.tolist())
                sample_row = df.iloc[0] if not df.empty else {}
                print("Sample row:", sample_row.to_dict())

            # Process each row
            for _, row in df.iterrows():
                try:
                    # Get amount
                    amount = row[amount_col]
                    if isinstance(amount, str):
                        amount = amount.replace('$', '').replace(',', '')
                    amount = float(amount)

                    # Determine plan type
                    if base_plan == 'UHG':
                        plan_type = self.get_uhg_plan_type(row)
                    else:
                        plan_type = base_plan

                    # Create employee record
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

        except Exception as e:
            self.db.rollback()
            raise ValueError(f"Error processing file: {str(e)}")

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
                # Format the date to match your coverage_dates format "MM/DD/YYYY"
                current_month_date = f"12/01/2024" if file.month == "DEC" else "10/01/2024"
                
                for emp in employees:
                    if emp.plan not in plan_groups:
                        plan_groups[emp.plan] = {
                            'current_month': 0,
                            'previous_month': 0
                        }

                    amount = float(emp.charge_amount)
                    coverage_dates = emp.coverage_dates or ""
                    
                    # Check if coverage dates contain the current month date
                    if current_month_date in coverage_dates:
                        plan_groups[emp.plan]['current_month'] += amount
                    else:
                        # Only add to previous_month if not a duplicate no-adjustment record
                        if emp.status != 'No Adjustments' or not any(
                            e for e in employees 
                            if e != emp and 
                            e.subscriber_name == emp.subscriber_name and 
                            e.status == 'No Adjustments' and
                            e.plan == emp.plan and
                            current_month_date in (e.coverage_dates or "")
                        ):
                            plan_groups[emp.plan]['previous_month'] += amount

                # Create summaries for each plan group
                for plan_type, amounts in plan_groups.items():
                    # Skip empty or zero-amount plans
                    if amounts['current_month'] == 0 and amounts['previous_month'] == 0:
                        continue
                        
                    # Skip 'UHG-OTHER' if we have specific UHG categories
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