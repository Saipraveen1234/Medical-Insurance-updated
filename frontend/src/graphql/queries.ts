import { gql } from '@apollo/client';

export const GET_METRICS = gql`
  query GetMetrics {
    getMetrics {
      totalEmployees
      activeEmployees
      totalPremium
      averagePremium
      planDistribution {
        name
        value
      }
      coverageDistribution {
        name
        value
      }
    }
  }
`;

export const GET_COST_ANALYSIS = gql`
  query GetCostAnalysis {
    getCostAnalysis {
      plan
      totalCost
      averageCost
      policyCount
      subscriberCount
    }
  }
`;

export const GET_EMPLOYEE_DETAILS = gql`
  query GetEmployeeDetails($search: String) {
    getEmployeeDetails(search: $search) {
      subscriberName
      plan
      coverageType
      status
      coverageDates
      chargeAmount
      month
      year
      sourcePlan
      history {
        month
        year
        plan
        coverageType
        status
        coverageDates
        chargeAmount
      }
    }
  }
`;

export const GET_COVERAGE_ANALYSIS = gql`
  query GetCoverageAnalysis {
    getCoverageAnalysis {
      coverageType
      plan
      totalPremium
      averagePremium
      subscriberCount
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

export const GET_MONTHLY_ANALYSIS = gql`
  query GetMonthlyAnalysis($year: Int!) {
    getMonthlyAnalysis(year: $year) {
      months
      planTypes
      planData {
        planType
        monthlyAmounts {
          month
          amount
        }
        total
      }
      monthTotals {
        month
        total
      }
      grandTotal
    }
  }
`;