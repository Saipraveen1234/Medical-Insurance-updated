import React from "react";
import {
  Box,
  Container,
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
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
} from "@mui/icons-material";
import InvoiceSummaryDashboard from "./components/InvoiceSummaryDashboard";
import Datasets from "./components/Datasets";

const VIEWS = {
  DASHBOARD: "dashboard",
  DATASETS: "datasets",
} as const;

type ViewType = (typeof VIEWS)[keyof typeof VIEWS];
const drawerWidth = 250;

// Create a theme with consistent typography and styling
const theme = createTheme({
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    h3: {
      fontSize: "2rem",
      fontWeight: 700,
    },
    h4: {
      fontSize: "1.75rem",
      fontWeight: 600,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
    },
    h6: {
      fontSize: "1.1rem",
      fontWeight: 600,
    },
    body1: {
      fontSize: "1rem",
    },
    body2: {
      fontSize: "0.875rem",
    },
  },
  components: {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "6px",
          margin: "4px 0",
          '&.Mui-selected': {
            backgroundColor: "#1a1d20",
            '&:hover': {
              backgroundColor: "#1a1d20",
            },
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
          margin: "8px 0",
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
      default:
        return <InvoiceSummaryDashboard />;
    }
  };

  const drawer = (
    <Box
      sx={{
        p: 2,
        height: "100%",
        backgroundColor: "#2A3036",
        color: "white",
      }}
    >
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <img
          src="/Untitled-5.png"
          alt="Company Logo"
          style={{ maxWidth: "100%" }}
        />

      </Box>
      <List>
        <ListItemButton
          selected={activeView === VIEWS.DASHBOARD}
          onClick={() => setActiveView(VIEWS.DASHBOARD)}
          sx={{
            color: "white",
            mb: 1,
          }}
        >
          <ListItemIcon sx={{ color: "white" }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Dashboard" 
            primaryTypographyProps={{
              fontSize: "0.95rem",
              fontWeight: activeView === VIEWS.DASHBOARD ? 500 : 400
            }}
          />
        </ListItemButton>
        <Divider sx={{ bgcolor: "grey.700", my: 1 }} />
        <ListItemButton
          selected={activeView === VIEWS.DATASETS}
          onClick={() => setActiveView(VIEWS.DATASETS)}
          sx={{
            color: "white",
            mb: 1,
          }}
        >
          <ListItemIcon sx={{ color: "white" }}>
            <StorageIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Datasets" 
            primaryTypographyProps={{
              fontSize: "0.95rem",
              fontWeight: activeView === VIEWS.DATASETS ? 500 : 400
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
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            bgcolor: "#f5f7fa",
          }}
        >
          <Container maxWidth="xl">{renderView()}</Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;