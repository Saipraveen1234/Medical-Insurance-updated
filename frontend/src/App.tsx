import React, { useState } from 'react';
import { 
  AppShell,
  Text,
  Group,
  Box,
  Stack,
} from '@mantine/core';
import { 
  IconDashboard,
  IconUsers,
  IconChartBar,
  IconDatabase,
  IconCalendarStats,
  IconLogout
} from '@tabler/icons-react';

import DashboardOverview from './components/DashboardOverview';
import EmployeeAnalysis from './components/EmployeeAnalysis';
import PlanComparison from './components/PlanComparison';
import Datasets from './components/Datasets';
import MonthlyAnalysis from './components/MonthlyAnalysis';

const VIEWS = {
  DASHBOARD: 'dashboard',
  EMPLOYEE_ANALYSIS: 'employees',
  PLAN_COMPARISON: 'plans',
  MONTHLY_ANALYSIS: 'monthly',
  DATASETS: 'datasets'
} as const;

type ViewType = typeof VIEWS[keyof typeof VIEWS];

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavButton = ({ icon, label, active, onClick }: NavButtonProps) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: '100%',
        padding: '16px 24px',
        backgroundColor: active ? '#1a1d20' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '8px',  // Add spacing between buttons
        '&:hover': {
          backgroundColor: '#1a1d20',
        }
      }}
    >
      <Group spacing="sm">
        {icon}
        <Text 
          size="md" 
          c="white" 
          fw={500}
          sx={{ lineHeight: '1.8' }}
        >
          {label}
        </Text>
      </Group>
    </Box>
  );
};

const App = () => {
  const [activeView, setActiveView] = useState<ViewType>(VIEWS.DASHBOARD);

  // Add console log to debug view changes
  const handleViewChange = (view: ViewType) => {
    console.log('Changing view to:', view);
    setActiveView(view);
  };

  const renderView = () => {
    console.log('Current active view:', activeView);
    
    switch (activeView) {
      case VIEWS.DASHBOARD:
        return <DashboardOverview />;
      case VIEWS.EMPLOYEE_ANALYSIS:
        return <EmployeeAnalysis />;
      case VIEWS.PLAN_COMPARISON:
        return <PlanComparison />;
      case VIEWS.MONTHLY_ANALYSIS:
        return <MonthlyAnalysis />;
      case VIEWS.DATASETS:
        return <Datasets />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <AppShell
      navbar={{ width: 250, breakpoint: 'sm' }}
      padding={0}
    >
      <AppShell.Navbar style={{ backgroundColor: '#2A3036', border: 'none' }}>
        <Box p="md">
          {/* Logo area */}
          <Box mb={60}>
            <img src="/Untitled-5.png" alt="Company Logo" style={{ maxWidth: '100%' }} />
          </Box>

          <Stack gap="md">
            <NavButton
              icon={<IconDashboard size={20} color="white" />}
              label="Dashboard"
              active={activeView === VIEWS.DASHBOARD}
              onClick={() => handleViewChange(VIEWS.DASHBOARD)}
            />
            <NavButton
              icon={<IconUsers size={20} color="white" />}
              label="Employee Analysis"
              active={activeView === VIEWS.EMPLOYEE_ANALYSIS}
              onClick={() => handleViewChange(VIEWS.EMPLOYEE_ANALYSIS)}
            />
            <NavButton
              icon={<IconChartBar size={20} color="white" />}
              label="Plan Comparison"
              active={activeView === VIEWS.PLAN_COMPARISON}
              onClick={() => handleViewChange(VIEWS.PLAN_COMPARISON)}
            />
            <NavButton
              icon={<IconCalendarStats size={20} color="white" />}
              label="Monthly Analysis"
              active={activeView === VIEWS.MONTHLY_ANALYSIS}
              onClick={() => handleViewChange(VIEWS.MONTHLY_ANALYSIS)}
            />
            <NavButton
              icon={<IconDatabase size={20} color="white" />}
              label="Datasets"
              active={activeView === VIEWS.DATASETS}
              onClick={() => handleViewChange(VIEWS.DATASETS)}
            />
          </Stack>

          <Box mt="auto" pt={20}>
            <NavButton
              icon={<IconLogout size={20} color="white" />}
              label="Logout"
              onClick={() => console.log('Logout clicked')}
            />
          </Box>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main bg="gray.0">
        <Box p="md">
          <Stack gap="md">
            <Text size="xl" fw={700}>
              {activeView === VIEWS.DASHBOARD && 'Dashboard Overview'}
              {activeView === VIEWS.EMPLOYEE_ANALYSIS && 'Employee Analysis'}
              {activeView === VIEWS.PLAN_COMPARISON && 'Plan Comparison'}
              {activeView === VIEWS.MONTHLY_ANALYSIS && 'Monthly Analysis'}
              {activeView === VIEWS.DATASETS && 'Datasets'}
            </Text>
            
            {renderView()}
          </Stack>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
};

export default App;