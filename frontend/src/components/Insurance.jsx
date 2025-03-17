import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@apollo/client";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  Button,
  Card,
  CardContent,
  IconButton,
  FormControl,
  InputLabel,
  Autocomplete
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { GET_INVOICE_DATA, GET_UPLOADED_FILES } from "../graphql/queries";
import FileUpload from "./FileUpload";

// Theme that matches the screenshot
const theme = createTheme({
  typography: {
    fontFamily: "'Bookman Old Style', serif",
    h4: { 
      fontSize: "1.75rem", 
      fontWeight: 700, 
      color: "#1e293b",
      fontFamily: "'Bookman Old Style', serif",
    },
    h5: { 
      fontSize: "1.25rem", 
      fontWeight: 600,
      color: "#1e293b",
      fontFamily: "'Bookman Old Style', serif",
    },
    h6: { 
      fontSize: "1.1rem", 
      fontWeight: 600,
      color: "#1e293b",
      fontFamily: "'Bookman Old Style', serif",
    },
    body1: {
      fontFamily: "'Bookman Old Style', serif",
    },
    body2: {
      fontFamily: "'Bookman Old Style', serif",
    },
  },
  components: {
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: "'Bookman Old Style', serif",
          textTransform: "none",
          fontWeight: 500,
          padding: "0.5rem 1.5rem",
          '&.Mui-selected': {
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#2563eb"
            }
          },
          "&:hover": {
            backgroundColor: "rgba(59, 130, 246, 0.08)",
          },
          border: "none",
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderRadius: "0.5rem",
          overflow: "hidden",
          marginBottom: "1rem",
          "&:before": {
            display: "none",
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          borderRadius: "0.5rem",
          padding: "0.75rem 1.25rem",
        },
        content: {
          margin: "0",
          "& > *": {
            margin: "0 !important",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: "'Bookman Old Style', serif",
          textTransform: "uppercase",
          fontWeight: 600,
          borderRadius: "0.5rem",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: "'Bookman Old Style', serif",
        },
      },
    },
  },
});

// Month order for sorting
const monthOrder = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

// Format currency amount
const formatAmount = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("$", "")
    .trim();
};

// Component for the fiscal year statistics cards
export const StatisticsSection = ({ total2024, total2025, totalCombined }) => {
  const fiscalYearData = [
    {
      title: "Fiscal year 2024",
      amount: total2024,
      icon: <CalendarTodayIcon style={{ color: 'white' }} />
    },
    {
      title: "Fiscal year 2025",
      amount: total2025,
      icon: <CalendarTodayIcon style={{ color: 'white' }} />
    },
    {
      title: "Combined Total",
      amount: totalCombined,
      icon: <CalendarTodayIcon style={{ color: 'white' }} />
    }
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {fiscalYearData.map((item, index) => (
        <Grid item xs={12} md={4} key={index}>
          <Card sx={{ 
            display: "flex", 
            borderRadius: "0.75rem", 
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            bgcolor: "white"
          }}>
            <Box sx={{ 
              bgcolor: "#3b82f6", 
              color: "white", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              p: 3,
              minWidth: "80px" 
            }}>
              {item.icon}
            </Box>
            <Box sx={{ 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center", 
              p: 2,
              width: "100%",
              textAlign: "right"
            }}>
              <Typography variant="body2" sx={{ color: "#64748b", mb: 0.5, fontFamily: "'Bookman Old Style', serif" }}>
                {item.title}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", fontFamily: "'Bookman Old Style', serif" }}>
                ${formatAmount(item.amount)}
              </Typography>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Main component
const InsuranceDashboard = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [planFilter, setPlanFilter] = useState("ALL");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState("ALL");
  const [expandedMonth, setExpandedMonth] = useState("");
  const itemsPerPage = 3; // Only show 3 items per page as in the screenshot

  // GraphQL queries
  const { data, loading, error } = useQuery(GET_INVOICE_DATA, {
    fetchPolicy: "cache-and-network",
  });

  const { data: uploadedData, refetch: refetchUploadedFiles } = useQuery(
    GET_UPLOADED_FILES,
    {
      fetchPolicy: "network-only",
    }
  );

  // Get all fiscal years
  const allFiscalYears = useMemo(() => {
    if (!data?.getInvoiceData) return [];
    const yearsSet = new Set();
    data.getInvoiceData.forEach((item) => {
      const idx = monthOrder.indexOf(item.month);
      if (idx >= 9) {
        yearsSet.add(item.year);
        yearsSet.add(item.year + 1);
      } else {
        yearsSet.add(item.year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [data]);

  // Filter data based on user selections
  const filteredData = useMemo(() => {
    if (!data?.getInvoiceData) return [];
    return data.getInvoiceData.filter((item) => {
      if (planFilter !== "ALL" && !item.planType.startsWith(planFilter)) {
        return false;
      }
      if (selectedMonths.length > 0 && !selectedMonths.includes(item.month)) {
        return false;
      }
      if (selectedFiscalYear !== "ALL") {
        const fy = parseInt(selectedFiscalYear, 10);
        const idx = monthOrder.indexOf(item.month);
        if (idx >= 9) {
          return item.year === fy - 1;
        } else {
          return item.year === fy;
        }
      }
      return true;
    });
  }, [data, planFilter, selectedMonths, selectedFiscalYear]);

  // Group data by month and year
  const groupedByMonthYear = useMemo(() => {
    const acc = {};
    filteredData.forEach((item) => {
      const key = `${item.month}-${item.year}`;
      if (!acc[key]) {
        acc[key] = { month: item.month, year: item.year, uhc: [], uhg: [] };
      }
      if (item.planType.startsWith("UHC")) {
        acc[key].uhc.push(item);
      } else {
        acc[key].uhg.push(item);
      }
    });
    return acc;
  }, [filteredData]);

  // Sort months for display
  const sortedMonths = useMemo(() => {
    return Object.entries(groupedByMonthYear).sort(([keyA], [keyB]) => {
      const [mA, yA] = keyA.split("-");
      const [mB, yB] = keyB.split("-");
      const yearA = parseInt(yA, 10);
      const yearB = parseInt(yB, 10);
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return monthOrder.indexOf(mB) - monthOrder.indexOf(mA);
    });
  }, [groupedByMonthYear]);

  // Pagination
  const totalPages = Math.ceil(sortedMonths.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedMonths.slice(start, start + itemsPerPage);
  }, [sortedMonths, currentPage, itemsPerPage]);

  // Calculate totals
  const { total2024, total2025 } = useMemo(() => {
    if (!data?.getInvoiceData) return { total2024: 0, total2025: 0 };
    return data.getInvoiceData.reduce(
      (acc, item) => ({
        total2024: acc.total2024 + item.fiscal2024Total,
        total2025: acc.total2025 + item.fiscal2025Total,
      }),
      { total2024: 0, total2025: 0 }
    );
  }, [data]);

  const overallTotal = total2024 + total2025;

  // Calculate totals for plans
  const calcTotals = (plans) =>
    plans.reduce(
      (acc, curr) => ({
        previousMonthsTotal: acc.previousMonthsTotal + curr.previousMonthsTotal,
        currentMonthTotal: acc.currentMonthTotal + curr.currentMonthTotal,
        allPreviousAdjustments:
          acc.allPreviousAdjustments + curr.allPreviousAdjustments,
        grandTotal: acc.grandTotal + curr.grandTotal,
      }),
      {
        previousMonthsTotal: 0,
        currentMonthTotal: 0,
        allPreviousAdjustments: 0,
        grandTotal: 0,
      }
    );

  // Format plan type for display
  const formatPlanType = (planType) => {
    if (planType.startsWith("UHG-")) {
      return planType.split("-")[1];
    }
    return planType.replace(/([A-Z])(\d)/g, "$1 $2");
  };

  // Handle accordion expansion
  const handleMonthAccordionChange = (panel) => (_event, isExpanded) => {
    setExpandedMonth(isExpanded ? panel : "");
  };

  // Handle navigation
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Loading and error states
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!data?.getInvoiceData?.length) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          sx={{ mb: 3, fontFamily: "'Bookman Old Style', serif" }}
        >
          Insurance
        </Typography>
        <Paper sx={{ p: 4, borderRadius: "0.75rem" }}>
          <Typography
            fontFamily="'Bookman Old Style', serif"
            color="text.secondary"
            gutterBottom
          >
            No invoice data available. Please upload files.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <FileUpload onUploadSuccess={() => refetchUploadedFiles()} />
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          sx={{ mb: 3, fontFamily: "'Bookman Old Style', serif" }}
        >
          Insurance
        </Typography>

        {/* Statistics section with fiscal year cards */}
        <StatisticsSection
          total2024={962.49}
          total2025={46371.83}
          totalCombined={47334.32}
        />

        {/* Filters section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ mb: 1 }}>
            <Typography
              variant="body2"
              sx={{
                mb: 1,
                fontWeight: 500,
                fontFamily: "'Bookman Old Style', serif",
              }}
            >
              Plan Type
            </Typography>
          </Box>

          <Grid container spacing={3} alignItems="flex-end">
            <Grid item xs={12} md={4}>
              <ToggleButtonGroup
                value={planFilter}
                exclusive
                onChange={(_e, newValue) => {
                  if (newValue) {
                    setPlanFilter(newValue);
                    setCurrentPage(1);
                  }
                }}
                sx={{
                  width: "100%",
                  maxWidth: "350px",
                  bgcolor: "white",
                  borderRadius: "0.375rem",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  "& .MuiToggleButtonGroup-grouped": {
                    fontFamily: "'Bookman Old Style', serif",
                  },
                }}
              >
                <ToggleButton
                  value="ALL"
                  sx={{
                    flex: 1,
                    borderRadius: 0,
                    fontFamily: "'Bookman Old Style', serif",
                  }}
                >
                  ALL PLANS
                </ToggleButton>
                <ToggleButton
                  value="UHC"
                  sx={{
                    flex: 1,
                    borderRadius: 0,
                    fontFamily: "'Bookman Old Style', serif",
                    borderLeft: "1px solid #e2e8f0",
                    borderRight: "1px solid #e2e8f0",
                  }}
                >
                  UHC
                </ToggleButton>
                <ToggleButton
                  value="UHG"
                  sx={{
                    flex: 1,
                    borderRadius: 0,
                    fontFamily: "'Bookman Old Style', serif",
                  }}
                >
                  UHG
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box>
                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      fontFamily: "'Bookman Old Style', serif",
                    }}
                  >
                    Month(s)
                  </Typography>
                </Box>
                <Autocomplete
                  multiple
                  options={monthOrder}
                  value={selectedMonths}
                  onChange={(_, newValue) => {
                    setSelectedMonths(newValue);
                    setCurrentPage(1);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select one or more months"
                      variant="outlined"
                      size="small"
                      sx={{
                        bgcolor: "white",
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "0.5rem",
                          padding: "2px 8px",
                          fontFamily: "'Bookman Old Style', serif",
                        },
                        "& .MuiInputBase-root": {
                          fontFamily: "'Bookman Old Style', serif",
                        },
                      }}
                      InputProps={{
                        ...params.InputProps,
                        style: { fontFamily: "'Bookman Old Style', serif" },
                      }}
                    />
                  )}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box>
                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      fontFamily: "'Bookman Old Style', serif",
                    }}
                  >
                    Year (Fiscal)
                  </Typography>
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedFiscalYear}
                    onChange={(e) => {
                      setSelectedFiscalYear(e.target.value);
                      setCurrentPage(1);
                    }}
                    displayEmpty
                    sx={{
                      bgcolor: "white",
                      borderRadius: "0.5rem",
                      "& .MuiSelect-select": {
                        padding: "0.5rem 1rem",
                        fontFamily: "'Bookman Old Style', serif",
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: "0.5rem",
                          mt: 0.5,
                        },
                      },
                    }}
                  >
                    <MenuItem
                      value="ALL"
                      sx={{ fontFamily: "'Bookman Old Style', serif" }}
                    >
                      All Years
                    </MenuItem>
                    {allFiscalYears.map((fy) => (
                      <MenuItem
                        key={fy}
                        value={fy.toString()}
                        sx={{ fontFamily: "'Bookman Old Style', serif" }}
                      >
                        {fy}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => (window.location.href = "/dashboard/datasets")}
                sx={{
                  fontFamily: "'Bookman Old Style', serif",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  width: "100%",
                  borderRadius: "0.5rem",
                }}
              >
                DATASETS
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Month-by-month accordions */}
        <Box sx={{ mb: 3 }}>
          {currentItems.map(([key, group]) => {
            const { month, year, uhc, uhg } = group;
            const monthTotal = [...uhc, ...uhg].reduce(
              (s, p) => s + p.grandTotal,
              0
            );

            return (
              <Accordion
                key={key}
                expanded={expandedMonth === key}
                onChange={handleMonthAccordionChange(key)}
                sx={{
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: "64px",
                    "& .MuiAccordionSummary-content": {
                      justifyContent: "space-between",
                      alignItems: "center",
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontFamily: "'Bookman Old Style', serif",
                    }}
                  >
                    {month} {year}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: monthTotal < 0 ? "#ef4444" : "inherit",
                      fontFamily: "'Bookman Old Style', serif",
                    }}
                  >
                    ${formatAmount(monthTotal)}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Box>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              width: "30%",
                              textAlign: "left",
                              padding: "12px 16px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "#475569",
                              fontFamily: "'Bookman Old Style', serif",
                            }}
                          >
                            Plan Type
                          </th>
                          <th
                            style={{
                              width: "23.33%",
                              textAlign: "left",
                              padding: "12px 16px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "#475569",
                              fontFamily: "'Bookman Old Style', serif",
                            }}
                          >
                            Previous Adjustments
                          </th>
                          <th
                            style={{
                              width: "23.33%",
                              textAlign: "left",
                              padding: "12px 16px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "#475569",
                              fontFamily: "'Bookman Old Style', serif",
                            }}
                          >
                            Current Month
                          </th>
                          <th
                            style={{
                              width: "23.33%",
                              textAlign: "left",
                              padding: "12px 16px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "#475569",
                              fontFamily: "'Bookman Old Style', serif",
                            }}
                          >
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {uhc.length > 0 && (
                          <>
                            {/* UHC header row */}
                            <tr
                              style={{
                                backgroundColor: "#bbdefb",
                                fontWeight: 600,
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #e2e8f0",
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                UHC
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "left",
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                ${" "}
                                {formatAmount(
                                  calcTotals(uhc).allPreviousAdjustments
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "left",
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                ${" "}
                                {formatAmount(
                                  calcTotals(uhc).currentMonthTotal
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "left",
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                $ {formatAmount(calcTotals(uhc).grandTotal)}
                              </td>
                            </tr>

                            {/* UHC detail rows */}
                            {uhc.map((plan, idx) => (
                              <tr key={`uhc-${idx}`}>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  {formatPlanType(plan.planType)}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #e2e8f0",
                                    textAlign: "left",
                                    color:
                                      plan.allPreviousAdjustments < 0
                                        ? "#ef4444"
                                        : "inherit",
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  $ {formatAmount(plan.allPreviousAdjustments)}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #e2e8f0",
                                    textAlign: "left",
                                    color:
                                      plan.currentMonthTotal < 0
                                        ? "#ef4444"
                                        : "inherit",
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  $ {formatAmount(plan.currentMonthTotal)}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #e2e8f0",
                                    textAlign: "left",
                                    color:
                                      plan.currentMonthTotal +
                                        plan.allPreviousAdjustments <
                                      0
                                        ? "#ef4444"
                                        : "inherit",
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  ${" "}
                                  {formatAmount(
                                    plan.currentMonthTotal +
                                      plan.allPreviousAdjustments
                                  )}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}

                        {uhg.length > 0 && (
                          <>
                            {/* UHG header row */}
                            <tr
                              style={{
                                backgroundColor: "#bbdefb",
                                fontWeight: 600,
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #e2e8f0",
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                UHG
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "left",
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                ${" "}
                                {formatAmount(
                                  calcTotals(uhg).allPreviousAdjustments
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "left",
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                ${" "}
                                {formatAmount(
                                  calcTotals(uhg).currentMonthTotal
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "left",
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                $ {formatAmount(calcTotals(uhg).grandTotal)}
                              </td>
                            </tr>

                            {/* UHG detail rows */}
                            {uhg.map((plan, idx) => (
                              <tr key={`uhg-${idx}`}>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  {formatPlanType(plan.planType)}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #e2e8f0",
                                    textAlign: "left",
                                    color:
                                      plan.allPreviousAdjustments < 0
                                        ? "#ef4444"
                                        : "inherit",
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  $ {formatAmount(plan.allPreviousAdjustments)}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #e2e8f0",
                                    textAlign: "left",
                                    color:
                                      plan.currentMonthTotal < 0
                                        ? "#ef4444"
                                        : "inherit",
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  $ {formatAmount(plan.currentMonthTotal)}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #e2e8f0",
                                    textAlign: "left",
                                    color:
                                      plan.currentMonthTotal +
                                        plan.allPreviousAdjustments <
                                      0
                                        ? "#ef4444"
                                        : "inherit",
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  ${" "}
                                  {formatAmount(
                                    plan.currentMonthTotal +
                                      plan.allPreviousAdjustments
                                  )}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>

        {/* Pagination controls */}
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              sx={{ color: currentPage === 1 ? "#cbd5e1" : "#3b82f6" }}
            >
              <NavigateBeforeIcon />
            </IconButton>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#3b82f6",
                color: "white",
                width: 32,
                height: 32,
                borderRadius: "50%",
                fontWeight: 500,
                fontFamily: "'Bookman Old Style', serif",
              }}
            >
              {currentPage}
            </Box>

            <IconButton
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              sx={{ color: currentPage === totalPages ? "#cbd5e1" : "#3b82f6" }}
            >
              <NavigateNextIcon />
            </IconButton>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default InsuranceDashboard;