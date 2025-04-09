import React from "react";
import {
  Box,
  CssBaseline,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import {
  Storage as StorageIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  Summarize as SummarizeIcon,
} from "@mui/icons-material";
import InvoiceSummaryDashboard from "./components/Insurance";
import Datasets from "./components/Datasets";
import { EmployeeDetails } from "./pages";
import InsuranceSummary from "./components/InsuranceSummary";

const VIEWS = {
  DASHBOARD: "dashboard",
  DATASETS: "datasets",
  EMPLOYEE_DETAILS: "employee_details",
  INSURANCE_SUMMARY: "insurance_summary",
} as const;

type ViewType = (typeof VIEWS)[keyof typeof VIEWS];
const drawerWidth = 250;

// Create a theme to match the provided screenshot
const theme = createTheme({
  typography: {
    fontFamily: "'Bookman Old Style', 'Segoe UI', 'Arial', sans-serif",
    h4: {
      fontSize: "1.75rem",
      fontWeight: 700,
    },
    h5: {
      fontSize: "1.5rem",
      fontWeight: 600,
    },
    h6: {
      fontSize: "1.1rem",
      fontWeight: 600,
    },
    body1: {
      fontSize: "1rem",
      fontFamily: "'Bookman Old Style', serif",
    },
    body2: {
      fontSize: "0.875rem",
      fontFamily: "'Bookman Old Style', serif",
    },
  },
  palette: {
    primary: {
      main: "#3b82f6",
      dark: "#2563eb",
    },
    secondary: {
      main: "#64748b",
    },
    background: {
      default: "#f1f5f9",
    },
  },
  components: {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "6px",
          margin: "4px 0",
          padding: "10px 16px",
          "&.Mui-selected": {
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#2563eb",
            },
          },
          "&:hover": {
            backgroundColor: "rgba(59, 130, 246, 0.08)",
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: "40px",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          margin: "12px 0",
          backgroundColor: "rgba(255, 255, 255, 0.12)",
        },
      },
    },
  },
});

const App = () => {
  const [activeView, setActiveView] = React.useState<ViewType>(VIEWS.DASHBOARD);

  const renderView = () => {
    switch (activeView) {
      case VIEWS.DASHBOARD:
        return <InvoiceSummaryDashboard />;
      case VIEWS.DATASETS:
        return <Datasets />;
      case VIEWS.EMPLOYEE_DETAILS:
        return <EmployeeDetails />;
      case VIEWS.INSURANCE_SUMMARY:
        return <InsuranceSummary />;
      default:
        return <InvoiceSummaryDashboard />;
    }
  };

  const drawer = (
    <Box
      sx={{
        p: 2,
        height: "100%",
        backgroundColor: "#ffffff",
        color: "#1e293b",
        display: "flex",
        flexDirection: "column",
        borderRadius: "10px",
        mx: 2,
        my: 2,
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            letterSpacing: "0.5px",
            color: "#1e293b",
            my: 2,
            fontFamily: "'Bookman Old Style', serif",
          }}
        >
          TABNER INC.
        </Typography>
      </Box>
      <List sx={{ flexGrow: 1 }}>
        <ListItemButton
          selected={activeView === VIEWS.DASHBOARD}
          onClick={() => setActiveView(VIEWS.DASHBOARD)}
          sx={{
            color: activeView === VIEWS.DASHBOARD ? "#ffffff" : "#475569",
            mb: 1,
            fontFamily: "'Bookman Old Style', serif",
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText
            primary="Dashboard"
            primaryTypographyProps={{
              fontSize: "0.95rem",
              fontWeight: 500,
              fontFamily: "'Bookman Old Style', serif",
            }}
          />
        </ListItemButton>

        <ListItemButton
          selected={activeView === VIEWS.INSURANCE_SUMMARY}
          onClick={() => setActiveView(VIEWS.INSURANCE_SUMMARY)}
          sx={{
            color:
              activeView === VIEWS.INSURANCE_SUMMARY ? "#ffffff" : "#475569",
            mb: 1,
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <SummarizeIcon />
          </ListItemIcon>
          <ListItemText
            primary="Insurance Summary"
            primaryTypographyProps={{
              fontSize: "0.95rem",
              fontWeight: 500,
              fontFamily: "'Bookman Old Style', serif",
            }}
          />
        </ListItemButton>

        <ListItemButton
          selected={activeView === VIEWS.EMPLOYEE_DETAILS}
          onClick={() => setActiveView(VIEWS.EMPLOYEE_DETAILS)}
          sx={{
            color:
              activeView === VIEWS.EMPLOYEE_DETAILS ? "#ffffff" : "#475569",
            mb: 1,
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText
            primary="Employees"
            primaryTypographyProps={{
              fontSize: "0.95rem",
              fontWeight: 500,
              fontFamily: "'Bookman Old Style', serif",
            }}
          />
        </ListItemButton>

        <Divider sx={{ bgcolor: "#e2e8f0", my: 2 }} />

        <ListItemButton
          selected={activeView === VIEWS.DATASETS}
          onClick={() => setActiveView(VIEWS.DATASETS)}
          sx={{
            color: activeView === VIEWS.DATASETS ? "#ffffff" : "#475569",
            mb: 1,
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <StorageIcon />
          </ListItemIcon>
          <ListItemText
            primary="Datasets"
            primaryTypographyProps={{
              fontSize: "0.95rem",
              fontWeight: 500,
              fontFamily: "'Bookman Old Style', serif",
            }}
          />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="navigation folders"
        >
          <Drawer
            variant="permanent"
            sx={{
              display: "block",
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
                border: "none",
                boxShadow: "none",
                bgcolor: "transparent",
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            bgcolor: "#f1f5f9",
            minHeight: "100vh",
            position: "relative",
          }}
        >
          {/* Main content - Removed top header with logout button */}
          {renderView()}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
