import React from 'react';
import { AppShell, Box, Stack, Text } from '@mantine/core';
import { IconDashboard, IconDatabase } from '@tabler/icons-react';
import InvoiceTable from './components/InvoiceTable';
import Datasets from './components/Datasets';
import NavButton from './components/NavButton';

const VIEWS = {
  DASHBOARD: 'dashboard',
  DATASETS: 'datasets'
} as const;

type ViewType = typeof VIEWS[keyof typeof VIEWS];

const App = () => {
  const [activeView, setActiveView] = React.useState<ViewType>(VIEWS.DASHBOARD);

  const renderView = () => {
    switch (activeView) {
      case VIEWS.DASHBOARD:
        return <InvoiceTable />;
      case VIEWS.DATASETS:
        return <Datasets />;
      default:
        return <InvoiceTable />;
    }
  };

  return (
    <AppShell
      navbar={{ width: 250, breakpoint: 'sm' }}
      padding={0}
    >
      <AppShell.Navbar style={{ backgroundColor: '#2A3036', border: 'none' }}>
        <Box p="md">
          <Box mb={60}>
            <img src="/Untitled-5.png" alt="Company Logo" style={{ maxWidth: '100%' }} />
          </Box>

          <Stack gap="md">
            <NavButton
              icon={<IconDashboard size={20} color="white" />}
              label="Dashboard"
              active={activeView === VIEWS.DASHBOARD}
              onClick={() => setActiveView(VIEWS.DASHBOARD)}
            />
            <NavButton
              icon={<IconDatabase size={20} color="white" />}
              label="Datasets"
              active={activeView === VIEWS.DATASETS}
              onClick={() => setActiveView(VIEWS.DATASETS)}
            />
          </Stack>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main bg="gray.0">
        <Box p="md">
          <Stack gap="md">
            <Text size="xl" fw={700}>
              {activeView === VIEWS.DASHBOARD ? 'Invoice Summary' : 'Datasets'}
            </Text>
            {renderView()}
          </Stack>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
};

export default App;