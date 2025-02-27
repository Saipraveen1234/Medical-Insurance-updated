import React, { lazy, Suspense } from "react";
import { AppShell, Box, Stack, Text, Container } from "@mantine/core";
import { IconDashboard, IconDatabase } from "@tabler/icons-react";
import NavButton from "./components/NavButton";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";

// Lazy load components for better initial load time
const InvoiceSummaryDashboard = lazy(() => 
  import("./components/InvoiceSummaryDashboard")
);
const Datasets = lazy(() => 
  import("./components/Datasets")
);

const VIEWS = {
  DASHBOARD: "dashboard",
  DATASETS: "datasets",
} as const;

type ViewType = (typeof VIEWS)[keyof typeof VIEWS];

const App = () => {
  const [activeView, setActiveView] = React.useState<ViewType>(VIEWS.DASHBOARD);

  const renderView = () => {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        {activeView === VIEWS.DASHBOARD ? <InvoiceSummaryDashboard /> : <Datasets />}
      </Suspense>
    );
  };

  return (
    <AppShell navbar={{ width: 250, breakpoint: "sm" }} padding={0}>
      <AppShell.Navbar style={{ backgroundColor: "#2A3036", border: "none" }}>
        <Box p="md">
          <Box mb="3.75rem">
            <img
              src="/Untitled-5.png"
              alt="Company Logo"
              style={{ maxWidth: "100%" }}
            />
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
        <Container fluid className="wrapper">
          <Box p="md">{renderView()}</Box>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};

export default App;