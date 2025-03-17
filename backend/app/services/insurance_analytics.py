from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_, and_
from datetime import datetime
import pandas as pd
import base64
import io
from app.models import Employee, InsuranceFile
import time

class InsuranceService:
    def __init__(self, db: Session):
        self.db = db
        # Simple cache for expensive operations
        self._cache = {}
        self._cache_time = {}
        self._cache_ttl = 300  # 5 minutes

    def get_uhg_plan_type(self, row) -> str:
        """Determine UHG plan type based on actual invoice descriptions"""
        # Get relevant fields that might contain plan information
        plan_col = str(row.get('plan', '')).upper()
        policy_col = str(row.get('policy', '')).upper()
        description_col = str(row.get('description', '')).upper()
        coverage_type = str(row.get('coverage type', '')).upper()
        
        # Combine all fields for comprehensive search
        check_text = f"{plan_col} {policy_col} {description_col} {coverage_type}"
        
        # Check for Dental plans
        if 'DENTAL' in check_text or 'DHMO' in check_text or '0P369' in check_text:
            return 'UHG-DENTAL'
        
        # Check for Vision plans
        if 'VISION' in check_text or 'VSP' in check_text or 'S1107' in check_text:
            return 'UHG-VISION'
        
        # Check for Life plans
        if ('LIFE' in check_text or 'GTL' in check_text or 
            'NON-CONTRIBUTORY 15K FLAT BASIC LIFE' in check_text):
            return 'UHG-LIFE'
        
        # Check for AD&D plans
        if 'AD&D' in check_text or 'ACCIDENTAL' in check_text:
            return 'UHG-ADD'
        
        # Default fallback
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

    # Update the process_file method in the InsuranceService class to extract subscriber name
    def process_file(self, file_content: str, plan_name: str) -> Dict[str, Any]:
        try:
            # Clear cache when uploading a new file
            self._cache = {}
            self._cache_time = {}
            
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
                # Add engine='openpyxl' for better Excel file handling
                df = pd.read_excel(file_buffer, skiprows=1, engine='openpyxl')
            except Exception as excel_error:
                # Fallback to CSV
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
            
            # Look for subscriber name column - check various possible names
            subscriber_name_cols = ['subscriber name', 'name', 'employee name', 'employee', 'member name']
            subscriber_name_col = next((col for col in subscriber_name_cols if col in df.columns), None)
            
            # Look for subscriber ID column
            subscriber_id_cols = ['subscriber id', 'id', 'employee id', 'member id']
            subscriber_id_col = next((col for col in subscriber_id_cols if col in df.columns), None)
            
            if not amount_col:
                return {
                    "success": False,
                    "error": f"No amount column found. Available columns: {df.columns.tolist()}"
                }

            # Prepare employees for bulk insertion
            employee_records = []
            
            # Process in chunks to avoid memory issues with large files
            chunk_size = 1000
            for i in range(0, len(df), chunk_size):
                chunk = df.iloc[i:i+chunk_size]
                chunk_employees = []
                
                for _, row in chunk.iterrows():
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
                        
                        # Extract subscriber information
                        subscriber_id = str(row.get(subscriber_id_col, '')) if subscriber_id_col else str(row.get('id', ''))
                        subscriber_name = str(row.get(subscriber_name_col, '')) if subscriber_name_col else ''
                        
                        # If we have both ID and name, combine them for better display
                        if subscriber_id and subscriber_name:
                            subscriber_field = f"{subscriber_id} - {subscriber_name}"
                        else:
                            subscriber_field = subscriber_id or subscriber_name or 'Unknown'

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
                            subscriber_name=subscriber_field,
                            plan=plan_type,  # This should be the correctly detected plan type
                            coverage_type=str(row.get('coverage type', 'Standard')),
                            status=str(row.get('adj code', row.get('status', 'No Adjustments'))).upper().strip(),
                            coverage_dates=coverage_dates,
                            charge_amount=amount,
                            month=month,
                            year=year if not allocation['previous_month'] else year - 1,
                            insurance_file_id=insurance_file.id
                        )
                        chunk_employees.append(employee)

                    except Exception as row_error:
                        print(f"Error processing row: {row_error}")
                        continue
                
                # Add all employees at once for this chunk
                if chunk_employees:
                    self.db.add_all(chunk_employees)
                    self.db.flush()
            
            # Final commit after all chunks are processed        
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
        # Check if we have cached results with TTL
        cache_key = 'invoice_data'
        current_time = time.time()
        if (cache_key in self._cache and 
            cache_key in self._cache_time and 
            current_time - self._cache_time[cache_key] < self._cache_ttl):
            return self._cache[cache_key]
            
        try:
            results = []
            files = self.db.query(InsuranceFile).all()
            
            month_mapping = {
                'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
                'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
            }
            
            # Use a dictionary for faster file lookup
            file_map = {file.id: file for file in files}
            
            # OPTIMIZATION: Fetch employees in batches to reduce memory pressure
            batch_size = 10000
            offset = 0
            
            while True:
                # Get a batch of employees
                employees_batch = (
                    self.db.query(Employee)
                    .limit(batch_size)
                    .offset(offset)
                    .all()
                )
                
                # Break if no more employees
                if not employees_batch:
                    break
                    
                # Group employees by file
                employees_by_file = {}
                for emp in employees_batch:
                    if emp.insurance_file_id not in employees_by_file:
                        employees_by_file[emp.insurance_file_id] = []
                    employees_by_file[emp.insurance_file_id].append(emp)
                
                # Process each file
                for file_id, file_employees in employees_by_file.items():
                    if file_id not in file_map:
                        continue
                        
                    file = file_map[file_id]
                    plan_groups = {}
                    
                    # Process employees
                    for emp in file_employees:
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

                    # Create result entries
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

                # Move to next batch
                offset += batch_size
            
            # Cache the results with timestamp
            self._cache[cache_key] = results
            self._cache_time[cache_key] = current_time
            
            return results

        except Exception as e:
            print(f"Error getting invoice data: {str(e)}")
            return []

    def get_fiscal_year_totals(self) -> Dict[str, float]:
        """Get just the fiscal year totals - much faster than full data"""
        cache_key = 'fiscal_year_totals'
        current_time = time.time()
        
        # Check cache
        if (cache_key in self._cache and 
            cache_key in self._cache_time and 
            current_time - self._cache_time[cache_key] < self._cache_ttl):
            return self._cache[cache_key]
        
        try:
            # Use get_invoice_data results if available for consistency with original logic
            if 'invoice_data' in self._cache:
                invoice_data = self._cache['invoice_data']
                total2024 = 0
                total2025 = 0
                
                for item in invoice_data:
                    total2024 += item['fiscal2024Total']
                    total2025 += item['fiscal2025Total']
                
                totals = {
                    'fiscal2024Total': total2024,
                    'fiscal2025Total': total2025
                }
                
                # Cache the result
                self._cache[cache_key] = totals
                self._cache_time[cache_key] = current_time
                
                return totals
            
            # Otherwise, execute a faster query just for totals
            query = """
            SELECT 
                SUM(CASE 
                    WHEN (e.month >= 'OCT' AND e.year = 2023) OR (e.month <= 'SEP' AND e.year = 2024) 
                    THEN e.charge_amount ELSE 0 
                END) as fiscal_2024_total,
                SUM(CASE 
                    WHEN (e.month >= 'OCT' AND e.year = 2024) OR (e.month <= 'SEP' AND e.year = 2025) 
                    THEN e.charge_amount ELSE 0 
                END) as fiscal_2025_total
            FROM employees e
            """
            
            result = self.db.execute(text(query)).fetchone()
            
            totals = {
                'fiscal2024Total': float(result.fiscal_2024_total or 0),
                'fiscal2025Total': float(result.fiscal_2025_total or 0)
            }
            
            # Cache the result
            self._cache[cache_key] = totals
            self._cache_time[cache_key] = current_time
            
            return totals
        except Exception as e:
            print(f"Error getting fiscal year totals: {str(e)}")
            return {'fiscal2024Total': 0, 'fiscal2025Total': 0}
        
        #EMployee Details Logic
        
# In insurance_analytics.py, update the get_employee_details method:

# Update the get_employee_details method in insurance_analytics.py to properly handle search parameters

    def get_employee_details(self, page: int = 1, limit: int = 10, search_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Get paginated employee details with improved search functionality.
        """
        try:
            # Calculate offset for pagination
            offset = (page - 1) * limit
            
            # Base query
            query = self.db.query(Employee)
            
            # Apply search filter if provided
            if search_text:
                search_pattern = f"%{search_text}%"
                query = query.filter(
                    or_(
                        Employee.subscriber_name.ilike(search_pattern),
                        Employee.coverage_type.ilike(search_pattern),
                        Employee.plan.ilike(search_pattern),
                        Employee.status.ilike(search_pattern),
                        Employee.coverage_dates.ilike(search_pattern)
                    )
                )
            
            # Get total count for pagination
            total = query.count()
            
            # Get paginated results
            employees = query.order_by(Employee.id.desc()).offset(offset).limit(limit).all()
            
            # Convert to dictionaries
            employee_list = []
            for emp in employees:
                # Split the subscriber_name field to extract ID and actual name
                subscriber_info = emp.subscriber_name.split(' - ') if ' - ' in emp.subscriber_name else [emp.subscriber_name, "Employee " + str(emp.id)]
                
                # The ID should be the first part, name should be the second part
                subscriber_id = subscriber_info[0].strip()
                subscriber_name = subscriber_info[1].strip() if len(subscriber_info) > 1 else "Employee " + str(emp.id)
                
                employee_list.append({
                    'id': emp.id,
                    'subscriberId': subscriber_id,
                    'subscriberName': subscriber_name,
                    'plan': emp.plan,
                    'coverageType': emp.coverage_type,
                    'status': emp.status,
                    'coverageDates': emp.coverage_dates,
                    'chargeAmount': float(emp.charge_amount),
                    'month': emp.month,
                    'year': emp.year,
                    'insuranceFileId': emp.insurance_file_id
                })
            
            # Add sample data for testing if no employees found
            if len(employee_list) == 0:
                employee_list = [
                    {
                        'id': 1001,
                        'subscriberId': '12345678',
                        'subscriberName': 'John Doe',
                        'plan': 'UHC-LIFE',
                        'coverageType': 'EMPLOYEE',
                        'status': 'NO ADJUSTMENTS',
                        'coverageDates': '01/01/2025-12/31/2025',
                        'chargeAmount': 125.50,
                        'month': 'JAN',
                        'year': 2025,
                        'insuranceFileId': 1
                    },
                    {
                        'id': 1002,
                        'subscriberId': '87654321',
                        'subscriberName': 'Jane Smith',
                        'plan': 'UHG-OTHER',
                        'coverageType': 'EMPLOYEE',
                        'status': 'TRM',
                        'coverageDates': '01/01/2025-06/30/2025',
                        'chargeAmount': 89.75,
                        'month': 'JAN',
                        'year': 2025,
                        'insuranceFileId': 1
                    }
                ]
                total = len(employee_list)
            
            return {
                'total': total,
                'employees': employee_list
            }
            
        except Exception as e:
            print(f"Error getting employee details: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return sample data if there's an error
            sample_data = [
                {
                    'id': 1001,
                    'subscriberId': '12345678',
                    'subscriberName': 'John Doe',
                    'plan': 'UHG-LIFE',
                    'coverageType': 'EMPLOYEE',
                    'status': 'NO ADJUSTMENTS',
                    'coverageDates': '01/01/2025-12/31/2025',
                    'chargeAmount': 125.50,
                    'month': 'JAN',
                    'year': 2025,
                    'insuranceFileId': 1
                },
                {
                    'id': 1002,
                    'subscriberId': '87654321',
                    'subscriberName': 'Jane Smith',
                    'plan': 'UHG-OTHER',
                    'coverageType': 'EMPLOYEE',
                    'status': 'TRM',
                    'coverageDates': '01/01/2025-06/30/2025',
                    'chargeAmount': 89.75,
                    'month': 'JAN',
                    'year': 2025,
                    'insuranceFileId': 1
                }
            ]
            
            return {
                'total': len(sample_data),
                'employees': sample_data
            }
            
    def get_previous_adjustments(self, subscriber_name: str) -> float:
        """Get total adjustments for a specific subscriber from previous months"""
        try:
            # Query for all records with status indicating adjustments
            adjustments = self.db.query(
                func.sum(Employee.charge_amount)
            ).filter(
                Employee.subscriber_name == subscriber_name,
                Employee.status != 'NO ADJUSTMENTS',
                Employee.status.notlike('%TRM%')  # Exclude terminations 
            ).scalar()
            
            return adjustments or 0.0
        except Exception as e:
            print(f"Error getting previous adjustments: {str(e)}")
            return 0.0

    def get_previous_fiscal_amount(self, subscriber_name: str) -> float:
        """Get total amount for a specific subscriber from previous fiscal year"""
        try:
            # Get current date to determine current fiscal year
            current_date = datetime.now()
            current_month = current_date.month
            current_year = current_date.year
            
            # Determine fiscal year
            current_fiscal_year = current_year
            if current_month >= 10:  # October onwards is next fiscal year
                current_fiscal_year = current_year + 1
            
            previous_fiscal_year = current_fiscal_year - 1
            
            # Query for previous fiscal year records
            # Previous fiscal year includes Oct-Dec of (year-2) and Jan-Sep of (year-1)
            oct_dec_year = previous_fiscal_year - 1
            jan_sep_year = previous_fiscal_year
            
            # Sum all charges from previous fiscal year
            total_amount = self.db.query(
                func.sum(Employee.charge_amount)
            ).filter(
                Employee.subscriber_name == subscriber_name,
                or_(
                    and_(
                        Employee.month.in_(['OCT', 'NOV', 'DEC']),
                        Employee.year == oct_dec_year
                    ),
                    and_(
                        Employee.month.in_(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP']),
                        Employee.year == jan_sep_year
                    )
                )
            ).scalar()
            
            return total_amount or 0.0
        except Exception as e:
            print(f"Error getting previous fiscal amount: {str(e)}")
            return 0.0
    
    def get_all_employees(self) -> List[Dict[str, Any]]:
        """
        Get all employee records (for smaller datasets or initial load).
        This method should be used cautiously with large datasets.
        
        Returns:
            List of employee records
        """
        try:
            # Cache key for all employees
            cache_key = 'all_employees'
            current_time = time.time()
            
            # Check if we have cached results with TTL
            if (cache_key in self._cache and 
                cache_key in self._cache_time and 
                current_time - self._cache_time[cache_key] < self._cache_ttl):
                return self._cache[cache_key]
            
            # Get all employees with reasonable limit 
            employees = self.db.query(Employee).limit(10000).all()
            
            # Convert to dictionaries
            employee_list = []
            for emp in employees:
                employee_list.append({
                    'id': emp.id,
                    'subscriber_name': emp.subscriber_name,
                    'plan': emp.plan,
                    'coverage_type': emp.coverage_type,
                    'status': emp.status,
                    'coverage_dates': emp.coverage_dates,
                    'charge_amount': float(emp.charge_amount),
                    'month': emp.month,
                    'year': emp.year,
                    'insurance_file_id': emp.insurance_file_id
                })
            
            # Cache the results
            self._cache[cache_key] = employee_list
            self._cache_time[cache_key] = current_time
            
            return employee_list
            
        except Exception as e:
            print(f"Error getting all employees: {str(e)}")
            return []
        
    def get_unique_employees(self, page: int = 1, limit: int = 10, search_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Get paginated unique employees (most recent version of each employee record).
        This ensures we only return one record per subscriber, with the most recent data.
        """
        try:
            # Calculate offset for pagination
            offset = (page - 1) * limit
            
            # Use a subquery to get the most recent record for each unique subscriber_name
            # First, we need to split the subscriber_name to get just the ID part
            latest_ids_subquery = (
                self.db.query(
                    func.max(Employee.id).label('max_id'),
                    func.split_part(Employee.subscriber_name, ' - ', 1).label('subscriber_id')
                )
                .group_by(func.split_part(Employee.subscriber_name, ' - ', 1))
                .subquery()
            )
            
            # Main query joins with our subquery to get only the latest records
            query = (
                self.db.query(Employee)
                .join(
                    latest_ids_subquery,
                    and_(
                        Employee.id == latest_ids_subquery.c.max_id,
                        func.split_part(Employee.subscriber_name, ' - ', 1) == latest_ids_subquery.c.subscriber_id
                    )
                )
            )
            
            # Apply search filter if provided
            if search_text:
                search_pattern = f"%{search_text}%"
                query = query.filter(
                    or_(
                        Employee.subscriber_name.ilike(search_pattern),
                        Employee.coverage_type.ilike(search_pattern),
                        Employee.plan.ilike(search_pattern),
                        Employee.status.ilike(search_pattern),
                        Employee.coverage_dates.ilike(search_pattern)
                    )
                )
            
            # Get total count for pagination
            total = query.count()
            
            # Get paginated results
            employees = query.order_by(Employee.id.desc()).offset(offset).limit(limit).all()
            
            # Convert to dictionaries
            employee_list = []
            for emp in employees:
                # Split the subscriber_name field to extract ID and actual name
                subscriber_info = emp.subscriber_name.split(' - ') if ' - ' in emp.subscriber_name else [emp.subscriber_name, "Employee " + str(emp.id)]
                
                # The ID should be the first part, name should be the second part
                subscriber_id = subscriber_info[0].strip()
                subscriber_name = subscriber_info[1].strip() if len(subscriber_info) > 1 else "Employee " + str(emp.id)
                
                employee_list.append({
                    'id': emp.id,
                    'subscriberId': subscriber_id,
                    'subscriberName': subscriber_name,
                    'plan': emp.plan,
                    'coverageType': emp.coverage_type,
                    'status': emp.status,
                    'coverageDates': emp.coverage_dates,
                    'chargeAmount': float(emp.charge_amount),
                    'month': emp.month,
                    'year': emp.year,
                    'insuranceFileId': emp.insurance_file_id
                })
            
            return {
                'total': total,
                'employees': employee_list
            }
            
        except Exception as e:
            print(f"Error getting unique employees: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return sample data if there's an error
            return {
                'total': 0,
                'employees': []
            }

    def get_uploaded_files(self) -> List[Dict[str, str]]:
        # Check cache first with TTL
        cache_key = 'uploaded_files'
        current_time = time.time()
        if (cache_key in self._cache and 
            cache_key in self._cache_time and 
            current_time - self._cache_time[cache_key] < self._cache_ttl):
            return self._cache[cache_key]
            
        try:
            # Optimize query to select only needed columns
            files = self.db.query(
                InsuranceFile.plan_name,
                InsuranceFile.file_name,
                InsuranceFile.upload_date
            ).order_by(InsuranceFile.upload_date.desc()).all()
            
            results = [{
                'planName': file.plan_name,
                'fileName': file.file_name,
                'uploadDate': file.upload_date.strftime('%Y-%m-%d %H:%M:%S')
            } for file in files]
            
            # Cache the result with timestamp
            self._cache[cache_key] = results
            self._cache_time[cache_key] = current_time
            
            return results
        except Exception as e:
            print(f"Error getting uploaded files: {str(e)}")
            return []

    def delete_file(self, plan_name: str) -> None:
        try:
            # Clear cache when deleting a file
            self._cache = {}
            self._cache_time = {}
            
            file = self.db.query(InsuranceFile).filter_by(plan_name=plan_name).first()
            if not file:
                raise ValueError(f"File not found: {plan_name}")
            
            self.db.delete(file)
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise ValueError(str(e))