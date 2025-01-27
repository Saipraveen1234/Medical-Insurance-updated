export interface Metrics {
    totalEmployees: number;
    activeEmployees: number;
    totalPremium: number;
    averagePremium: number;
    planDistribution: Record<string, number>;
    coverageDistribution: Record<string, number>;
  }
  
  export interface CostAnalysis {
    plan: string;
    totalCost: number;
    averageCost: number;
    policyCount: number;
    subscriberCount: number;
  }
  
  export interface EmployeeDetail {
    subscriberName: string;
    plan: string;
    coverageType: string;
    status: string;
    coverageDates: string;
    chargeAmount: number;
  }
  
  export interface CoverageAnalysis {
    coverageType: string;
    plan: string;
    totalPremium: number;
    averagePremium: number;
    subscriberCount: number;
  }
  