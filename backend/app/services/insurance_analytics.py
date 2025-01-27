from typing import List, Optional, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from dataclasses import dataclass
import pandas as pd
import base64
import io
import re
from app.models import Employee, InsuranceFile

@dataclass
class MetricsDistributionEntry:
    name: str
    value: int

@dataclass
class InsuranceMetrics:
    total_employees: int
    active_employees: int
    total_premium: float
    average_premium: float
    plan_distribution: List[MetricsDistributionEntry]
    coverage_distribution: List[MetricsDistributionEntry]

class InsuranceService:
    def __init__(self, db: Session):
        self.db = db

    def find_existing_employee(self, db: Session, subscriber_name: str) -> Optional[Employee]:
        """Find existing employee record by subscriber name"""
        return (
            db.query(Employee)
            .filter(Employee.subscriber_name == subscriber_name)
            .order_by(Employee.year.desc(), Employee.month.desc())
            .first()
        )

    def has_employee_changes(self, existing: Employee, new_data: Dict) -> bool:
        """Compare existing employee record with new data to detect changes"""
        return (
            existing.plan != new_data['plan'] or
            existing.coverage_type != new_data['coverage_type'] or
            existing.status != new_data['status'] or
            existing.coverage_dates != new_data['coverage_dates'] or
            abs(existing.charge_amount - new_data['charge_amount']) > 0.01
        )

    def get_standardized_plan_name(self, plan_name: str) -> str:
        """Standardize plan names to consistent format"""
        try:
            if not plan_name:
                return 'UHC-3000'  # Default to UHC-3000 if no plan specified
                
            # Convert to uppercase and remove extra spaces
            plan_name = str(plan_name).upper().strip()
            
            # First check for UHG in file name
            if 'UHG' in plan_name:
                return 'UHC-3000'

            # Remove common separators and spaces
            cleaned_name = plan_name.replace('-', ' ').replace('_', ' ').replace('/', ' ')
            words = cleaned_name.split()
            
            # Check for various UHC-3000 patterns
            if any(word in ['UHC', 'UHG', 'UNITED', 'UNITEDHEALTHCARE'] for word in words):
                if '3000' in plan_name or 'THREE' in words:
                    return 'UHC-3000'
                elif '2000' in plan_name or 'TWO' in words:
                    return 'UHC-2000'
            
            # Look for deductible amounts or specific keywords
            if '3000' in plan_name:
                return 'UHC-3000'
            elif '2000' in plan_name:
                return 'UHC-2000'
            elif 'DENTAL' in plan_name:
                return 'DENTAL'
            elif 'VISION' in plan_name:
                return 'VISION'
            elif 'LIFE' in plan_name:
                return 'LIFE'
                
            # Log unrecognized plan names
            print(f"Warning: Could not standardize plan name: {plan_name}")
            return 'UHC-3000'  # Default to UHC-3000 for unrecognized plans
            
        except Exception as e:
            print(f"Error standardizing plan name: {str(e)}")
            return 'UHC-3000'  # Default to UHC-3000 in case of errors
    def get_month_year_from_filename(self, plan_name: str) -> tuple[str, int]:
        """Extract month and year from filename"""
        try:
            # Handle UHG format (e.g., UHGOCT2024)
            if plan_name.upper().startswith('UHG'):
                match = re.match(r'UHG([A-Z]{3})(\d{4})', plan_name.upper())
                if match:
                    month, year = match.groups()
                    return month, int(year)

            # Handle standard format (e.g., UHC-2000-DEC-2024)
            parts = plan_name.split('-')
            if len(parts) >= 4:
                month = parts[-2].upper()
                year = int(parts[-1])
            else:
                raise ValueError("Invalid filename format")
            
            valid_months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP']
            if month not in valid_months:
                raise ValueError(f"Invalid month. Must be one of {valid_months}")
                
            if year < 2000 or year > 2100:
                raise ValueError("Invalid year")
            
            return month, year
        except Exception as e:
            raise ValueError(f"Error parsing filename: {str(e)}")
    def process_adjustment_code(self, adj_code: str) -> tuple[str, str]:
        """Process adjustment code and return standardized code and note"""
        if not adj_code:
            return 'ADD', 'New enrollment'

        adj_code = str(adj_code).strip().upper()
        
        # Map of adjustment codes to their meanings
        adj_map = {
            'ADD': ('ADD', 'Adding coverage/amount'),
            'TRM': ('TRM', 'Terminating coverage'),
            'CHG': ('CHG', 'Change in plan/amount')
        }

        # Check if code exists in map, default to ADD if unknown
        return adj_map.get(adj_code, ('ADD', 'New enrollment'))
    

    def process_file(self, file_content: str, plan_name: str) -> None:
        try:
            print(f"Starting to process file for plan: {plan_name}")
            
            # Extract month and year from plan name
            month, year = self.get_month_year_from_filename(plan_name)
            print(f"Successfully extracted - Month: {month}, Year: {year}")
            
            # Check if a file with this plan name already exists
            existing_file = self.db.query(InsuranceFile).filter_by(plan_name=plan_name).first()
            if existing_file:
                raise ValueError(f"A file with plan name '{plan_name}' already exists.")

            # Remove data URL prefix if present
            if ',' in file_content:
                file_content = file_content.split(',')[1]
            
            # Decode file content
            decoded = base64.b64decode(file_content)
            file_buffer = io.BytesIO(decoded)

            # Try reading as Excel first, if fails try CSV
            try:
                print("Attempting to read as Excel file...")
                df = pd.read_excel(file_buffer)
                file_type = 'excel'
            except Exception as excel_error:
                print(f"Excel read failed, trying CSV: {excel_error}")
                file_buffer.seek(0)  # Reset buffer position
                try:
                    # For CSV, use pandas with more options
                    df = pd.read_csv(
                        file_buffer,
                        encoding='utf-8',
                        on_bad_lines='skip',
                        low_memory=False,
                        dtype=str  # Read all columns as string initially
                    )
                    file_type = 'csv'
                except Exception as csv_error:
                    raise ValueError(f"Failed to read file as Excel or CSV: {csv_error}")

            print(f"File read successfully as {file_type}. Shape: {df.shape}")
            print(f"Columns found: {df.columns.tolist()}")

            # Print first few rows for debugging
            print("\nFirst few rows of data:")
            print(df.head().to_string())
                
            # Create new insurance file record
            insurance_file = InsuranceFile(
                plan_name=plan_name,
                file_name=f"{plan_name}.{file_type}",
                upload_date=datetime.utcnow(),
                month=month,
                year=year
            )
            self.db.add(insurance_file)
            self.db.flush()

            # Process each row
            employee_records = []
            errors = []
            for idx, row in df.iterrows():
                try:
                    # Get subscriber name with multiple possible column names
                    subscriber_name = None
                    for col in ['Subscriber Name', 'SUBSCRIBER_NAME', 'Member_Name', 'Employee_Name', 'NAME']:
                        if col in df.columns and pd.notna(row[col]):
                            subscriber_name = str(row[col]).strip()
                            break

                    if not subscriber_name:
                        errors.append(f"Row {idx}: No subscriber name found")
                        continue

                    # Get plan type with fallback to filename
                    raw_plan = str(row.get('Plan', row.get('PLAN', plan_name))).strip()
                    standardized_plan = self.get_standardized_plan_name(raw_plan)
                    print(f"Row {idx}: Plan standardized from '{raw_plan}' to '{standardized_plan}'")

                    # Get charge amount with multiple possible column names
                    charge_amount = 0.0
                    for col in ['Charge Amount', 'CHARGE_AMOUNT', 'Premium', 'PREMIUM', 'Monthly_Premium', 'AMOUNT']:
                        if col in df.columns and pd.notna(row[col]):
                            try:
                                # Remove any currency symbols and convert to float
                                amount_str = str(row[col]).replace('$', '').replace(',', '')
                                charge_amount = abs(float(amount_str))
                                break
                            except ValueError:
                                continue

                    # Create employee record
                    employee = Employee(
                        subscriber_name=subscriber_name,
                        plan=standardized_plan,
                        coverage_type=next(
                            (str(row[col]).strip() for col in [
                                'Coverage Type', 'COVERAGE_TYPE', 'Coverage_Level', 'TYPE'
                            ] if col in df.columns and pd.notna(row[col])),
                            'Individual'
                        ),
                        status=next(
                            (str(row[col]).strip() for col in [
                                'Status', 'STATUS', 'Employee_Status'
                            ] if col in df.columns and pd.notna(row[col])),
                            'A'
                        ),
                        coverage_dates=next(
                            (str(row[col]).strip() for col in [
                                'Coverage Dates', 'COVERAGE_DATES', 'Effective_Date', 'DATE'
                            ] if col in df.columns and pd.notna(row[col])),
                            'N/A - N/A'
                        ),
                        charge_amount=charge_amount,
                        month=month,
                        year=year,
                        insurance_file_id=insurance_file.id
                    )
                    employee_records.append(employee)

                except Exception as row_error:
                    errors.append(f"Row {idx}: {str(row_error)}")
                    print(f"Error processing row {idx}: {row_error}")
                    print(f"Row data: {row.to_dict()}")
                    continue

            # Bulk insert employee records
            if employee_records:
                print(f"\nAdding {len(employee_records)} employee records")
                self.db.bulk_save_objects(employee_records)
                self.db.commit()

                # Print processing summary
                print("\nProcessing Summary:")
                print(f"Total rows in file: {len(df)}")
                print(f"Successfully processed: {len(employee_records)}")
                print(f"Errors encountered: {len(errors)}")

                if errors:
                    print("\nError Summary:")
                    for error in errors[:10]:  # Show first 10 errors
                        print(error)

                # Verify the data
                verification = (
                    self.db.query(
                        Employee.plan,
                        func.count(Employee.id).label('count'),
                        func.sum(Employee.charge_amount).label('total')
                    )
                    .filter(Employee.insurance_file_id == insurance_file.id)
                    .group_by(Employee.plan)
                    .all()
                )
                
                print("\nVerifying stored data:")
                for v in verification:
                    print(f"Plan: {v.plan}, Count: {v.count}, Total: {v.total}")

            else:
                raise ValueError("No valid employee records found in the file")

        except Exception as e:
            print(f"Error processing file: {str(e)}")
            self.db.rollback()
            raise ValueError(str(e))

    def get_monthly_analysis(self, year: int) -> Dict:
        """Get monthly analysis for a specific year"""
        try:
            print(f"Getting monthly analysis for year: {year}")
            
            # Define months and plan types
            months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP']
            
            # Get unique plan types from the database for the given year
            db_plan_types = (
                self.db.query(Employee.plan)
                .filter(Employee.year == year)
                .distinct()
                .all()
            )
            plan_types = sorted([p[0] for p in db_plan_types])
            
            if not plan_types:
                plan_types = ['UHG-3000', 'UHG-2000', 'LIFE', 'DENTAL', 'VISION']
            
            print(f"Found plan types: {plan_types}")
            
            # Initialize data structures
            monthly_data = {plan: {month: 0.0 for month in months} for plan in plan_types}
            plan_totals = {plan: 0.0 for plan in plan_types}
            month_totals = {month: 0.0 for month in months}
            grand_total = 0.0

            # Get all employee records for the year with proper fiscal year handling
            results = (
                self.db.query(
                    Employee.plan,
                    Employee.month,
                    func.sum(Employee.charge_amount).label('total_amount'),
                    func.count(Employee.id).label('count')
                )
                .filter(Employee.year == year)
                .group_by(Employee.plan, Employee.month)
                .order_by(Employee.plan, Employee.month)
                .all()
            )

            print(f"Found {len(results)} monthly records for year {year}")
            
            # Process the results
            for record in results:
                plan = record[0]
                month = record[1]
                amount = float(record[2] or 0)
                count = int(record[3] or 0)
                
                print(f"Processing - Plan: {plan}, Month: {month}, Amount: {amount}, Count: {count}")

                # Ensure the plan is in our plan_types list
                if plan not in plan_types:
                    plan_types.append(plan)
                    monthly_data[plan] = {month: 0.0 for month in months}
                    plan_totals[plan] = 0.0

                # Update the data structures
                if month in months:
                    monthly_data[plan][month] = amount
                    plan_totals[plan] += amount
                    month_totals[month] += amount
                    grand_total += amount

            # Sort plan types to ensure consistent order
            plan_types.sort()

            return {
                'months': months,
                'plan_types': plan_types,
                'monthly_data': monthly_data,
                'plan_totals': plan_totals,
                'month_totals': month_totals,
                'grand_total': grand_total
            }
        except Exception as e:
            print(f"Error getting monthly analysis: {str(e)}")
            return {
                'months': [],
                'plan_types': [],
                'monthly_data': {},
                'plan_totals': {},
                'month_totals': {},
                'grand_total': 0
            }

    def get_metrics(self) -> Optional[InsuranceMetrics]:
        """Get overall metrics with unique employee counts"""
        try:
            # Get the latest file first
            latest_records = (
                self.db.query(
                    Employee.subscriber_name,
                    Employee.status,
                    Employee.charge_amount,
                    Employee.plan,
                    Employee.coverage_type,
                    Employee.month,
                    Employee.year
                )
                .distinct(Employee.subscriber_name)
                .order_by(
                    Employee.subscriber_name,
                    Employee.year.desc(),
                    Employee.month.desc()
                )
                .all()
            )

            if not latest_records:
                return None

            # Calculate metrics from latest records
            total_employees = len(latest_records)
            active_employees = sum(1 for r in latest_records if r.status == 'A')
            total_premium = sum(r.charge_amount for r in latest_records)
            average_premium = total_premium / total_employees if total_employees > 0 else 0

            # Calculate plan distribution
            plan_counts = {}
            for record in latest_records:
                plan_counts[record.plan] = plan_counts.get(record.plan, 0) + 1

            plan_distribution = [
                MetricsDistributionEntry(name=plan, value=count)
                for plan, count in plan_counts.items()
            ]

            # Calculate coverage distribution
            coverage_counts = {}
            for record in latest_records:
                coverage_counts[record.coverage_type] = coverage_counts.get(record.coverage_type, 0) + 1

            coverage_distribution = [
                MetricsDistributionEntry(name=coverage, value=count)
                for coverage, count in coverage_counts.items()
            ]

            print("Metrics calculated:")
            print(f"Total Employees: {total_employees}")
            print(f"Active Employees: {active_employees}")
            print(f"Total Premium: {total_premium}")
            print(f"Average Premium: {average_premium}")
            print("Plan Distribution:", plan_counts)
            print("Coverage Distribution:", coverage_counts)

            return InsuranceMetrics(
                total_employees=total_employees,
                active_employees=active_employees,
                total_premium=float(total_premium),
                average_premium=float(average_premium),
                plan_distribution=plan_distribution,
                coverage_distribution=coverage_distribution
            )

        except Exception as e:
            print(f"Error getting metrics: {str(e)}")
            return None

    def get_cost_analysis(self) -> List[Dict]:
        """Get cost analysis by plan"""
        try:
            results = (
                self.db.query(
                    Employee.plan,
                    func.sum(Employee.charge_amount).label('total_cost'),
                    func.avg(Employee.charge_amount).label('average_cost'),
                    func.count(Employee.id).label('policy_count'),
                    func.count(func.distinct(Employee.subscriber_name)).label('subscriber_count')
                )
                .group_by(Employee.plan)
                .all()
            )
            
            return [{
                'plan': r.plan,
                'total_cost': float(r.total_cost or 0),
                'average_cost': float(r.average_cost or 0),
                'policy_count': int(r.policy_count or 0),
                'subscriber_count': int(r.subscriber_count or 0)
            } for r in results]
        except Exception as e:
            print(f"Error in get_cost_analysis: {str(e)}")
            return []

    def get_coverage_analysis(self) -> List[Dict]:
        """Get coverage analysis"""
        try:
            results = (
                self.db.query(
                    Employee.coverage_type,
                    Employee.plan,
                    func.sum(Employee.charge_amount).label('total_premium'),
                    func.avg(Employee.charge_amount).label('average_premium'),
                    func.count(func.distinct(Employee.subscriber_name)).label('subscriber_count')
                )
                .group_by(Employee.coverage_type, Employee.plan)
                .all()
            )
            
            return [{
                'coverage_type': r.coverage_type,
                'plan': r.plan,
                'total_premium': float(r.total_premium or 0),
                'average_premium': float(r.average_premium or 0),
                'subscriber_count': int(r.subscriber_count or 0)
            } for r in results]
        except Exception as e:
            print(f"Error in get_coverage_analysis: {str(e)}")
            return []

    def get_employee_details(self, search_term: Optional[str] = None) -> List[Dict]:
        """Get employee details with history"""
        try:
            # First get all unique employees
            employee_query = (
                self.db.query(Employee.subscriber_name)
                .distinct()
            )
            
            if search_term:
                employee_query = employee_query.filter(
                    Employee.subscriber_name.ilike(f"%{search_term}%")
                )
            
            employees = employee_query.all()
            
            # Prepare result
            result = []
            for employee_record in employees:
                subscriber_name = employee_record.subscriber_name
                
                # Get all records for this employee ordered by upload date
                current_records = (
                    self.db.query(Employee)
                    .join(InsuranceFile)
                    .filter(Employee.subscriber_name == subscriber_name)
                    .order_by(InsuranceFile.upload_date.desc())
                    .all()
                )

                if not current_records:
                    continue

                # Group latest records by plan type
                latest_records = {}
                for record in current_records:
                    if record.plan not in latest_records:
                        latest_records[record.plan] = record

                # Convert each latest record to dict and add to results
                for plan, record in latest_records.items():
                    # Get history for this employee and plan
                    history = (
                        self.db.query(Employee)
                        .join(InsuranceFile)
                        .filter(
                            Employee.subscriber_name == subscriber_name,
                            Employee.plan == plan,
                            Employee.id != record.id  # Exclude current record
                        )
                        .order_by(InsuranceFile.upload_date.desc())
                        .all()
                    )

                    employee_dict = {
                        'subscriber_name': record.subscriber_name,
                        'plan': record.plan,
                        'coverage_type': record.coverage_type,
                        'status': record.status,
                        'coverage_dates': record.coverage_dates,
                        'charge_amount': float(record.charge_amount or 0),
                        'month': record.month,
                        'year': record.year,
                        'history': [{
                            'month': h.month,
                            'year': h.year,
                            'plan': h.plan,
                            'coverage_type': h.coverage_type,
                            'status': h.status,
                            'coverage_dates': h.coverage_dates,
                            'charge_amount': float(h.charge_amount or 0)
                        } for h in history]
                    }
                    
                    result.append(employee_dict)

                    print(f"Added record for {subscriber_name} - Plan: {plan}, "
                        f"Month: {record.month} {record.year}, "
                        f"History entries: {len(history)}")

            print(f"Total records returned: {len(result)}")
            return result

        except Exception as e:
            print(f"Error in get_employee_details: {str(e)}")
            return []

    def get_uploaded_files(self) -> List[Dict]:
        """Get a list of all uploaded insurance files"""
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
        """Delete a file and its associated records"""
        try:
            print(f"Attempting to delete file with plan name: {plan_name}")
            
            file = self.db.query(InsuranceFile).filter_by(plan_name=plan_name).first()
            if not file:
                raise ValueError(f"File not found: {plan_name}")
            
            print(f"Found file with ID: {file.id}")
            
            # Delete all associated employee records first
            deleted_employees = self.db.query(Employee).filter_by(insurance_file_id=file.id).delete()
            print(f"Deleted {deleted_employees} associated employee records")
            
            # Delete the file record itself
            self.db.delete(file)
            self.db.commit()
            print(f"Successfully deleted file and all associated records")
            
        except Exception as e:
            print(f"Error deleting file: {str(e)}")
            self.db.rollback()
            raise ValueError(f"Failed to delete file: {str(e)}")

    def debug_database_status(self):
        """Print current database status for debugging"""
        try:
            # Check insurance files
            files = self.db.query(InsuranceFile).all()
            print("\nInsurance Files:")
            for file in files:
                print(f"ID: {file.id}, Plan: {file.plan_name}, Month: {file.month}, Year: {file.year}")

            # Check employee records
            employees = (
                self.db.query(
                    Employee.month,
                    Employee.year,
                    Employee.plan,
                    func.count(Employee.id).label('count'),
                    func.sum(Employee.charge_amount).label('total')
                )
                .group_by(Employee.month, Employee.year, Employee.plan)
                .all()
            )
            
            print("\nEmployee Records:")
            for e in employees:
                print(f"Month: {e.month}, Year: {e.year}, Plan: {e.plan}, Count: {e.count}, Total: {e.total}")
                
        except Exception as e:
            print(f"Error in debug: {str(e)}")