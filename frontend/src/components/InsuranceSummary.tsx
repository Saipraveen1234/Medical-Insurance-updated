import React, { useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Grid,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";
import { useQuery, gql } from "@apollo/client";
import "./InsuranceSummary.css";

// GraphQL query for getting insurance data
const GET_INVOICE_DATA = gql`
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

// Theme to match the existing application
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
      fontFamily: "'Bookman Old Style', serif",
    },
    body2: {
      fontFamily: "'Bookman Old Style', serif",
    },
  },
  palette: {
    primary: {
      main: "#3b82f6",
    },
    background: {
      default: "#f1f5f9",
    },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: "#3b82f6",
          color: "#ffffff",
          fontWeight: 600,
          padding: "12px 16px",
          fontFamily: "'Bookman Old Style', serif",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        },
        body: {
          padding: "12px 16px",
          fontFamily: "'Bookman Old Style', serif",
          borderBottom: "1px solid #e5e7eb",
          borderRight: "1px solid #e5e7eb",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(odd)": {
            backgroundColor: "#f9fafb",
          },
          "&:hover": {
            backgroundColor: "#f1f5f9",
          },
        },
      },
    },
  },
});

// Month order for sorting
const monthOrder = [
  "SEP",
  "OCT",
  "NOV",
  "DEC",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
];

// Format currency values
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const InsuranceSummary = () => {
  // Fetch invoice data
  const { data, loading, error } = useQuery(GET_INVOICE_DATA, {
    fetchPolicy: "cache-and-network",
  });

  // Process data for the table
  const processedData = useMemo(() => {
    if (!data?.getInvoiceData) return { monthlyData: {}, totals: {} };

    // Initialize data structure
    const monthlyData: {
      [key: string]: {
        month: string;
        fiscal2024: {
          dvlUhg: number;
          uhc2000: number;
          uhc3000: number;
          total: number;
        };
        fiscal2025: {
          dvlUhg: number;
          uhc2000: number;
          uhc3000: number;
          total: number;
        };
        total: number;
      };
    } = {};
    monthOrder.forEach((month) => {
      monthlyData[month] = {
        month,
        fiscal2024: {
          dvlUhg: 0, // Dental, Vision, Life and Other UHG plans
          uhc2000: 0,
          uhc3000: 0,
          total: 0,
        },
        fiscal2025: {
          dvlUhg: 0,
          uhc2000: 0,
          uhc3000: 0,
          total: 0,
        },
        total: 0,
      };
    });

    // Calculate final totals
    const totals = {
      dvlUhg: { fiscal2024: 0, fiscal2025: 0, total: 0 },
      uhc2000: { fiscal2024: 0, fiscal2025: 0, total: 0 },
      uhc3000: { fiscal2024: 0, fiscal2025: 0, total: 0 },
      total: { fiscal2024: 0, fiscal2025: 0, total: 0 },
    };

    // Process each invoice item
    data.getInvoiceData.forEach((item: ItemType) => {
      const { planType, month, fiscal2024Total, fiscal2025Total, grandTotal } =
        item;
      const fiscalYear2024 = fiscal2024Total || 0;
      const fiscalYear2025 = fiscal2025Total || 0;

      // Skip if month is not valid
      if (!monthlyData[month]) return;

      // Update category data
      if (planType === "UHC-2000") {
        monthlyData[month].fiscal2024.uhc2000 += fiscalYear2024;
        monthlyData[month].fiscal2025.uhc2000 += fiscalYear2025;

        totals.uhc2000.fiscal2024 += fiscalYear2024;
        totals.uhc2000.fiscal2025 += fiscalYear2025;
        totals.uhc2000.total += grandTotal;
      } else if (planType === "UHC-3000") {
        monthlyData[month].fiscal2024.uhc3000 += fiscalYear2024;
        monthlyData[month].fiscal2025.uhc3000 += fiscalYear2025;

        totals.uhc3000.fiscal2024 += fiscalYear2024;
        totals.uhc3000.fiscal2025 += fiscalYear2025;
        totals.uhc3000.total += grandTotal;
      } else if (planType.startsWith("UHG-")) {
        monthlyData[month].fiscal2024.dvlUhg += fiscalYear2024;
        monthlyData[month].fiscal2025.dvlUhg += fiscalYear2025;

        totals.dvlUhg.fiscal2024 += fiscalYear2024;
        totals.dvlUhg.fiscal2025 += fiscalYear2025;
        totals.dvlUhg.total += grandTotal;
      }

      // Update totals for this month and fiscal year
      monthlyData[month].fiscal2024.total += fiscalYear2024;
      monthlyData[month].fiscal2025.total += fiscalYear2025;
      monthlyData[month].total += grandTotal;

      // Update overall totals
      totals.total.fiscal2024 += fiscalYear2024;
      totals.total.fiscal2025 += fiscalYear2025;
      totals.total.total += grandTotal;
    });

    return { monthlyData, totals };
  }, [data]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  // Get current month abbreviation for highlighting
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0-11
  // Convert to our month format (OCT is first, SEP is last)
  const currentMonthIndex = (currentMonth + 4) % 12; // Shift to match our ordering
  const currentMonthAbbr = monthOrder[currentMonthIndex];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" className="summary-title">
          Invoice Summary
        </Typography>

        {/* Summary Breakdown Cards - Above the table */}
        <Paper className="summary-paper">
          <Box className="summary-header">
            <Typography variant="h6" className="summary-header-title">
              Invoice Summary Breakdown
            </Typography>
          </Box>

          <Box className="summary-content">
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="body2" className="metric-label">
                        DVL/UHG Total
                      </Typography>
                      <Typography variant="h5" className="metric-value">
                        {formatCurrency(processedData.totals.dvlUhg.total)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="body2" className="metric-label">
                        UHC-2000 Total
                      </Typography>
                      <Typography variant="h5" className="metric-value">
                        {formatCurrency(processedData.totals.uhc2000.total)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="body2" className="metric-label">
                        UHC-3000 Total
                      </Typography>
                      <Typography variant="h5" className="metric-value">
                        {formatCurrency(processedData.totals.uhc3000.total)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box className="total-box">
                  <Typography variant="body2" className="total-label">
                    Final Total
                  </Typography>
                  <Typography variant="h4" className="total-value">
                    {formatCurrency(processedData.totals.total.total)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            <Box className="fiscal-summary">
              <Box className="fiscal-box">
                <Typography variant="body2" className="metric-label">
                  Fiscal Year 2024 Total
                </Typography>
                <Typography variant="h6" className="metric-value">
                  {formatCurrency(processedData.totals.total.fiscal2024)}
                </Typography>
              </Box>
              <Box className="fiscal-box">
                <Typography variant="body2" className="metric-label">
                  Fiscal Year 2025 Total
                </Typography>
                <Typography variant="h6" className="metric-value">
                  {formatCurrency(processedData.totals.total.fiscal2025)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Main Table */}
        <Paper className="table-container">
          <TableContainer>
            <Table sx={{ borderCollapse: "collapse" }}>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} align="center">
                    Months
                  </TableCell>
                  <TableCell colSpan={3} align="center">
                    2024
                  </TableCell>
                  <TableCell colSpan={3} align="center">
                    2025
                  </TableCell>
                  <TableCell rowSpan={2} align="center">
                    TOTAL
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell align="center">
                    DVL
                    <br />
                    UHG
                  </TableCell>
                  <TableCell align="center">
                    UHC
                    <br />
                    2000
                  </TableCell>
                  <TableCell align="center">
                    UHC
                    <br />
                    3000
                  </TableCell>
                  <TableCell align="center">
                    DVL
                    <br />
                    UHG
                  </TableCell>
                  <TableCell align="center">
                    UHC
                    <br />
                    2000
                  </TableCell>
                  <TableCell align="center">
                    UHC
                    <br />
                    3000
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Monthly Rows */}
                {monthOrder.map((month) => {
                  const monthData = processedData.monthlyData[month] || {
                    fiscal2024: { dvlUhg: 0, uhc2000: 0, uhc3000: 0, total: 0 },
                    fiscal2025: { dvlUhg: 0, uhc2000: 0, uhc3000: 0, total: 0 },
                    total: 0,
                  };

                  // Check if this row is the current month
                  const isCurrentMonth = month === currentMonthAbbr;

                  return (
                    <TableRow
                      key={month}
                      className={isCurrentMonth ? "current-month-row" : ""}
                    >
                      <TableCell
                        className={isCurrentMonth ? "current-month-cell" : ""}
                      >
                        {month}{" "}
                        {isCurrentMonth && (
                          <span className="current-month-indicator">
                            (Current)
                          </span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(monthData.fiscal2024.dvlUhg)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(monthData.fiscal2024.uhc2000)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(monthData.fiscal2024.uhc3000)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(monthData.fiscal2025.dvlUhg)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(monthData.fiscal2025.uhc2000)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(monthData.fiscal2025.uhc3000)}
                      </TableCell>
                      <TableCell align="right" className="total-cell">
                        {formatCurrency(monthData.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Final Totals Row */}
                <TableRow className="total-row">
                  <TableCell className="total-cell">Final Total</TableCell>
                  <TableCell align="right" className="total-cell">
                    {formatCurrency(processedData.totals.dvlUhg.fiscal2024)}
                  </TableCell>
                  <TableCell align="right" className="total-cell">
                    {formatCurrency(processedData.totals.uhc2000.fiscal2024)}
                  </TableCell>
                  <TableCell align="right" className="total-cell">
                    {formatCurrency(processedData.totals.uhc3000.fiscal2024)}
                  </TableCell>
                  <TableCell align="right" className="total-cell">
                    {formatCurrency(processedData.totals.dvlUhg.fiscal2025)}
                  </TableCell>
                  <TableCell align="right" className="total-cell">
                    {formatCurrency(processedData.totals.uhc2000.fiscal2025)}
                  </TableCell>
                  <TableCell align="right" className="total-cell">
                    {formatCurrency(processedData.totals.uhc3000.fiscal2025)}
                  </TableCell>
                  <TableCell align="right" className="total-cell">
                    {formatCurrency(processedData.totals.total.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default InsuranceSummary;
