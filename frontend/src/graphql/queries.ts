import { gql } from '@apollo/client';

// Ultra-fast totals-only query for initial dashboard loading
export const GET_FISCAL_YEAR_TOTALS = gql`
  query GetFiscalYearTotals {
    getFiscalYearTotals {
      fiscal2024Total
      fiscal2025Total
    }
  }
`;

// Paginated invoice data for faster loading and filtering
export const GET_INVOICE_DATA_PAGINATED = gql`
  query GetInvoiceDataPaginated(
    $page: Int = 1, 
    $limit: Int = 100,
    $filterPlan: String = null,
    $filterMonth: String = null,
    $filterYear: Int = null
  ) {
    getInvoiceDataPaginated(
      page: $page, 
      limit: $limit,
      filterPlan: $filterPlan,
      filterMonth: $filterMonth,
      filterYear: $filterYear
    ) {
      planType
      month
      year
      currentMonthTotal
      previousMonthsTotal
      fiscal2024Total
      fiscal2025Total
      allPreviousAdjustments
      grandTotal
    }
  }
`;

// Legacy full query - kept for compatibility
export const GET_INVOICE_DATA = gql`
  query GetInvoiceData {
    getInvoiceData {
      planType
      month
      year
      currentMonthTotal
      previousMonthsTotal
      fiscal2024Total
      fiscal2025Total
      allPreviousAdjustments
      grandTotal
    }
  }
`;

export const GET_UPLOADED_FILES = gql`
  query GetUploadedFiles {
    getUploadedFiles {
      planName
      fileName
      uploadDate
    }
  }
`;

// Employee details queries
export const GET_EMPLOYEE_DETAILS = gql`
  query GetEmployeeDetails($page: Int!, $limit: Int!, $searchText: String) {
    getEmployeeDetails(page: $page, limit: $limit, searchText: $searchText) {
      total
      employees {
        id
        subscriber_name
        coverage_type
        coverage_dates
        charge_amount
        plan
        status
        month
        year
        insurance_file_id
      }
    }
  }
`;

export const GET_ALL_EMPLOYEES = gql`
  query GetAllEmployees {
    getAllEmployees {
      id
      subscriber_name
      coverage_type
      coverage_dates
      charge_amount
      plan
      status
      month
      year
      insurance_file_id
    }
  }
`;

export const GET_UNIQUE_EMPLOYEES = gql`
  query GetUniqueEmployees($page: Int!, $limit: Int!, $searchText: String) {
    getUniqueEmployees(page: $page, limit: $limit, searchText: $searchText) {
      total
      employees {
        id
        subscriberId
        subscriberName
        coverageType
        coverageDates
        chargeAmount
        plan
        status
        month
        year
        insuranceFileId
      }
    }
  }
`;