import { gql } from '@apollo/client';

// Query to get paginated employee details with search capability
export const GET_EMPLOYEE_DETAILS = gql`
  query GetEmployeeDetails($page: Int!, $limit: Int!, $searchText: String) {
    getEmployeeDetails(page: $page, limit: $limit, searchText: $searchText) {
      total
      employees {
        id
        subscriberName
        plan
        coverageType
        status
        coverageDates
        chargeAmount
        month
        year
        previousAdjustments
        previousFiscalAmount
      }
    }
  }
`;

// Fallback query to get all employees at once (for smaller datasets)
export const GET_ALL_EMPLOYEES = gql`
  query GetAllEmployees {
    getAllEmployees {
      id
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
`;

// Query to export employee data (with optional filters)
export const EXPORT_EMPLOYEE_DATA = gql`
  query ExportEmployeeData($searchText: String, $planFilter: String) {
    exportEmployeeData(searchText: $searchText, planFilter: $planFilter) {
      id
      subscriberName
      coverageType
      coverageDates
      chargeAmount
      plan
      status
      month
      year
    }
  }
`;