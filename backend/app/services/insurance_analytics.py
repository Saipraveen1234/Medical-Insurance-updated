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

    def parse_coverage_date(self, date_str: str) -> Optional[Dict[str, int]]:
        """Parse coverage date string and return month and year."""
        try:
            if not date_str or not isinstance(date_str, str):
                return None
                
            # Remove any whitespace and split on the first dash
            start_date = date_str.strip().split('-')[0].strip()
            
            # Split the date parts
            parts = start_date.split('/')
            if len(parts) != 3:
                return None
                
            month = int(parts[0])  # This should already be a number in your data
            year = int(parts[2])
            
            return {'month': month, 'year': year}
        except (ValueError, IndexError):
            return None

    def determine_fiscal_allocation(self, coverage_date: Dict[str, int], file_year: int) -> Dict[str, bool]:
        """
        Determine fiscal year allocation based on coverage date.
        Only allocate to previous fiscal year if the month is before October (fiscal year start).
        Returns dict indicating if amount should go to current or previous month totals.
        """
        # We're receiving the month as a number here
        try:
            month = int(coverage_date['month'])
            if month < 10:  # Before October
                return {'current_month': False, 'previous_month': True}
            else:  # October onwards
                return {'current_month': True, 'previous_month': False}
        except (ValueError, TypeError):
            # Default to current month if there's any error
            return {'current_month': True, 'previous_month': False}

    def process_file(self, file_content: str, plan_name: str) -> Dict[str, Any]:
        try:
            # Check if file already exists
            existing_file = self.db.query(InsuranceFile).filter_by(plan_name=plan_name).first()
            if existing_file:
                return {
                    "success": False,
                    "error": f"A file with plan name '{plan_name}' already exists. Please delete the existing file before uploading a new one."
                }

            # Parse plan name to get month and year
            parts = plan_name.split('-')
            base_plan = parts[0]
            
            if base_plan == 'UHG':
                month = parts[1]
                year = int(parts[2])
            else:
                base_plan = f"{parts[0]}-{parts[1]}"
                month = parts[2]
                year = int(parts[3])

            # Month name to number mapping
            month_mapping = {
                'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
                'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
            }
            
            # Use the month name as is for storage, but get the number for processing
            month_number = month_mapping.get(month.upper(), 1)  # Default to 1 if invalid month

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
                month=month,  # Store the month name, not the number
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
                    # Parse amount
                    amount = row[amount_col]
                    if isinstance(amount, str):
                        amount = amount.replace('$', '').replace(',', '')
                    amount = float(amount)

                    # Get plan type
                    if base_plan == 'UHG':
                        plan_type = self.get_uhg_plan_type(row)
                    else:
                        plan_type = base_plan

                    # Parse coverage dates and determine fiscal allocation
                    coverage_dates = str(row.get('coverage dates', ''))
                    parsed_date = self.parse_coverage_date(coverage_dates)
                    
                    # Default fiscal allocation
                    allocation = {'current_month': True, 'previous_month': False}
                    
                    if parsed_date:
                        # Use month number for fiscal allocation determination
                        allocation = self.determine_fiscal_allocation(
                            {'month': parsed_date['month'], 'year': parsed_date['year']}, 
                            year
                        )

                    # Create employee record
                    employee = Employee(
                        subscriber_name=str(row.get('id', row.get('subscriber id', ''))),
                        plan=plan_type,
                        coverage_type=str(row.get('coverage type', 'Standard')),
                        status=str(row.get('adj code', row.get('status', 'No Adjustments'))).upper().strip(),
                        coverage_dates=coverage_dates,
                        charge_amount=amount,
                        month=month,  # Store the month name
                        year=year if not allocation['previous_month'] else year - 1,
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
    def determine_fiscal_year(self, date_dict: Dict[str, int]) -> int:
        """
        Determine fiscal year based on the coverage date.
        Fiscal Year N includes:
        - Oct through Dec of year N-1
        - Jan through Sep of year N
        """
        month = date_dict['month']
        calendar_year = date_dict['year']
        
        if month >= 10:  # Oct-Dec
            return calendar_year + 1  # These belong to next fiscal year
        else:  # Jan-Sep
            return calendar_year  # These belong to the calendar year they're in
    def get_invoice_data(self) -> List[Dict[str, Any]]:
        try:
            results = []
            files = self.db.query(InsuranceFile).all()
            
            month_mapping = {
                'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
                'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
            }
            
            for file in files:
                employees = (
                    self.db.query(Employee)
                    .filter(Employee.insurance_file_id == file.id)
                    .all()
                )

                plan_groups = {}
                
                for emp in employees:
                    if emp.plan not in plan_groups:
                        plan_groups[emp.plan] = {
                            'current_month': 0,
                            'previous_month': 0,
                            'fiscal_by_year': {}
                        }

                    try:
                        amount = float(emp.charge_amount)
                        coverage_dates = emp.coverage_dates
                        parsed_date = self.parse_coverage_date(coverage_dates)
                        
                        if parsed_date:
                            # Determine fiscal year for the entry
                            fiscal_year = self.determine_fiscal_year(parsed_date)
                            
                            # Initialize fiscal year tracking if not exists
                            if fiscal_year not in plan_groups[emp.plan]['fiscal_by_year']:
                                plan_groups[emp.plan]['fiscal_by_year'][fiscal_year] = 0
                            
                            # Add to fiscal year total
                            plan_groups[emp.plan]['fiscal_by_year'][fiscal_year] += amount
                            
                            # Monthly display logic
                            coverage_month = parsed_date['month']
                            coverage_year = parsed_date['year']
                            file_month = month_mapping[file.month]
                            file_year = file.year
                            
                            # If the coverage date matches the file's month/year
                            if coverage_month == file_month and coverage_year == file_year:
                                plan_groups[emp.plan]['current_month'] += amount
                            else:
                                plan_groups[emp.plan]['previous_month'] += amount

                    except Exception as e:
                        print(f"Error processing amount for employee {emp.subscriber_name}: {str(e)}")
                        continue

                for plan_type, amounts in plan_groups.items():
                    if amounts['current_month'] == 0 and amounts['previous_month'] == 0:
                        continue
                    
                    results.append({
                        'planType': plan_type,
                        'month': file.month,
                        'year': file.year,
                        'currentMonthTotal': amounts['current_month'],
                        'previousMonthsTotal': amounts['previous_month'],
                        'allPreviousAdjustments': amounts['previous_month'],
                        'fiscal2024Total': amounts['fiscal_by_year'].get(2024, 0),
                        'fiscal2025Total': amounts['fiscal_by_year'].get(2025, 0),
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