import React, { useState, useMemo } from "react";
import { useQuery, gql } from "@apollo/client";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import "./InvoiceSummaryDashboard.css";

// Custom theme to match the Mantine styling
const theme = createTheme({
  palette: {
    primary: { main: "#3b82f6" },
    success: { main: "#10b981" },
  },
  typography: {
    h3: { fontSize: "1.75rem", fontWeight: 700, color: "#111827" },
    h4: { fontSize: "1.5rem", fontWeight: 600 },
    h5: { fontSize: "1.25rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
          textTransform: "none",
          fontWeight: 500,
          color: "#4b5563",
          "&.Mui-selected": {
            backgroundColor: "#3b82f6",
            color: "#fff",
            "&:hover": { backgroundColor: "#2563eb" },
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          "&:before": { display: "none" },
          "&.Mui-expanded": { margin: "0 0 16px" },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          backgroundColor: "#f9fafb",
          "&.Mui-expanded": { minHeight: "48px" },
        },
        content: {
          "&.Mui-expanded": { margin: "12px 0" },
        },
      },
    },
  },
});

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

const monthOrder = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

interface NumericCellProps {
  value: number;
  className?: string;
}

const NumericCell = ({ value, className = "" }: NumericCellProps) => {
  const isNegative = value < 0;
  return (
    <td className={`dashboard-td ${isNegative ? "negative" : ""} ${className}`}>
      $
      {typeof value === "number"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
            .format(value)
            .replace("$", "")
            .trim()
        : value}
    </td>
  );
};

const InvoiceSummaryDashboard = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [planFilter, setPlanFilter] = useState("ALL");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState("ALL");
  const [expandedMonth, setExpandedMonth] = useState<string>("");
  const itemsPerPage = 6;

  const { data, loading, error } = useQuery(GET_INVOICE_DATA, {
    fetchPolicy: "cache-and-network",
  });

  const formatAmount = (amount: number) => {
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

  const getValueStyle = (amount: number) => {
    return amount < 0 ? { color: "#ef4444" } : {};
  };

  const allFiscalYears = useMemo(() => {
    if (!data?.getInvoiceData) return [];
    const yearsSet = new Set<number>();
    data.getInvoiceData.forEach((item: any) => {
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

  const filteredData = useMemo(() => {
    if (!data?.getInvoiceData) return [];
    return data.getInvoiceData.filter((item: any) => {
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

  const groupedByMonthYear = useMemo(() => {
    const acc: Record<
      string,
      { month: string; year: number; uhc: any[]; uhg: any[] }
    > = {};
    filteredData.forEach((item: any) => {
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

  const totalPages = Math.ceil(sortedMonths.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedMonths.slice(start, start + itemsPerPage);
  }, [sortedMonths, currentPage, itemsPerPage]);

  const { total2024, total2025 } = useMemo(() => {
    if (!data?.getInvoiceData) return { total2024: 0, total2025: 0 };
    return data.getInvoiceData.reduce(
      (acc: any, item: any) => ({
        total2024: acc.total2024 + item.fiscal2024Total,
        total2025: acc.total2025 + item.fiscal2025Total,
      }),
      { total2024: 0, total2025: 0 }
    );
  }, [data]);

  const overallTotal = total2024 + total2025;

  const calcTotals = (plans: any[]) =>
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

  const getPlanBadgeColor = (planType: string) => {
    if (planType === "UHC-2000") return "primary";
    if (planType === "UHC-3000") return "success";
    if (planType === "UHG-LIFE") return "warning";
    if (planType === "UHG-VISION") return "info";
    if (planType === "UHG-DENTAL") return "secondary";
    return "default";
  };

  const formatPlanType = (planType: string) => {
    if (planType.startsWith("UHG-")) {
      return planType.split("-")[1];
    }
    return planType.replace(/([A-Z])(\d)/g, "$1 $2");
  };

  const handleMonthAccordionChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedMonth(isExpanded ? panel : "");
    };

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
  if (!data?.getInvoiceData?.length) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography color="text.secondary">
          No invoice data available. Please upload files.
        </Typography>
      </Paper>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 3, bgcolor: "#f9fafb" }}>
        {/* Header */}
        <Box sx={{ mb: 5, textAlign: "center" }}>
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, letterSpacing: "0.2px" }}
          >
            MEDICAL INSURANCE INVOICE SUMMARY
          </Typography>
        </Box>

        {/* Fiscal Year Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                bgcolor: "#3b82f6",
                color: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CalendarTodayIcon sx={{ mr: 1 }} />
                <Typography variant="h5">Fiscal Year 2024</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                OCT 2023 - SEP 2024
              </Typography>
              <Typography
                variant="h4"
                className="numeric-value"
                sx={{
                  mt: "auto",
                  letterSpacing: "0.5px",
                  fontWeight: 600,
                  ...getValueStyle(total2024),
                }}
              >
                ${formatAmount(total2024)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                bgcolor: "#3b82f6",
                color: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CalendarTodayIcon sx={{ mr: 1 }} />
                <Typography variant="h5">Fiscal Year 2025</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                OCT 2024 - SEP 2025
              </Typography>
              <Typography
                variant="h4"
                className="numeric-value"
                sx={{
                  mt: "auto",
                  letterSpacing: "0.5px",
                  fontWeight: 600,
                  ...getValueStyle(total2025),
                }}
              >
                ${formatAmount(total2025)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                bgcolor: "#10b981",
                color: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CalendarTodayIcon sx={{ mr: 1 }} />
                <Typography variant="h5">Combined Total</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                All Fiscal Years
              </Typography>
              <Typography
                variant="h4"
                className="numeric-value"
                sx={{
                  mt: "auto",
                  letterSpacing: "0.5px",
                  fontWeight: 600,
                  ...getValueStyle(overallTotal),
                }}
              >
                ${formatAmount(overallTotal)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
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
                sx={{ width: "100%" }}
              >
                <ToggleButton
                  value="ALL"
                  sx={{ flex: 1, py: 1, borderRadius: "4px 0 0 4px" }}
                >
                  All Plans
                </ToggleButton>
                <ToggleButton
                  value="UHC"
                  sx={{ flex: 1, py: 1, borderRadius: 0 }}
                >
                  UHC Only
                </ToggleButton>
                <ToggleButton
                  value="UHG"
                  sx={{ flex: 1, py: 1, borderRadius: "0 4px 4px 0" }}
                >
                  UHG Only
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Month(s)
                </Typography>
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
                        "& .MuiOutlinedInput-root": { borderRadius: "4px" },
                      }}
                    />
                  )}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Year (Fiscal)
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedFiscalYear}
                    onChange={(e) => {
                      setSelectedFiscalYear(e.target.value);
                      setCurrentPage(1);
                    }}
                    displayEmpty
                    sx={{ bgcolor: "white", borderRadius: "4px" }}
                  >
                    <MenuItem value="ALL">All Years</MenuItem>
                    {allFiscalYears.map((fy) => (
                      <MenuItem key={fy} value={fy.toString()}>
                        {fy}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Month-by-month Accordions */}
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
                sx={{ mb: 2, border: "1px solid #e5e7eb", bgcolor: "white" }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 2,
                    "&.Mui-expanded": { borderBottom: "1px solid #e5e7eb" },
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {month} {year}
                    </Typography>
                    <Typography
                      variant="h6"
                      className="numeric-value"
                      sx={{
                        color: monthTotal < 0 ? "#ef4444" : "#3b82f6",
                        fontWeight: 600,
                      }}
                    >
                      ${formatAmount(monthTotal)}
                    </Typography>
                  </Box>
                </AccordionSummary>

                <AccordionDetails className="dashboard-accordion-details">
                  <Box>
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th className="dashboard-th dashboard-th-plan">
                            Plan Type
                          </th>
                          <th className="dashboard-th dashboard-th-other">
                            Previous Adjustments
                          </th>
                          <th className="dashboard-th dashboard-th-other">
                            Current Month
                          </th>
                          <th className="dashboard-th dashboard-th-other">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {uhc.length > 0 && (
                          <>
                            {/* UHC summary row */}
                            <tr className="dashboard-summary-row">
                              <td className="dashboard-td">UHC</td>
                              <NumericCell
                                value={calcTotals(uhc).allPreviousAdjustments}
                              />
                              <NumericCell
                                value={calcTotals(uhc).currentMonthTotal}
                              />
                              <NumericCell value={calcTotals(uhc).grandTotal} />
                            </tr>
                            {uhc.map((plan: any, idx: number) => {
                              const rowTotal =
                                plan.allPreviousAdjustments +
                                plan.currentMonthTotal;
                              return (
                                <tr key={`uhc-${key}-${idx}`}>
                                  <td className="dashboard-td">
                                    <Chip
                                      label={formatPlanType(plan.planType)}
                                      color={getPlanBadgeColor(plan.planType)}
                                      size="small"
                                      sx={{ fontWeight: 500 }}
                                    />
                                  </td>
                                  <NumericCell
                                    value={plan.allPreviousAdjustments}
                                  />
                                  <NumericCell value={plan.currentMonthTotal} />
                                  <NumericCell value={rowTotal} />
                                </tr>
                              );
                            })}
                          </>
                        )}
                        {uhg.length > 0 && (
                          <>
                            {/* UHG summary row */}
                            <tr className="dashboard-summary-row">
                              <td className="dashboard-td">UHG</td>
                              <NumericCell
                                value={calcTotals(uhg).allPreviousAdjustments}
                              />
                              <NumericCell
                                value={calcTotals(uhg).currentMonthTotal}
                              />
                              <NumericCell value={calcTotals(uhg).grandTotal} />
                            </tr>
                            {uhg.map((plan: any, idx: number) => {
                              const rowTotal =
                                plan.allPreviousAdjustments +
                                plan.currentMonthTotal;
                              return (
                                <tr key={`uhg-${key}-${idx}`}>
                                  <td className="dashboard-td">
                                    <Chip
                                      label={formatPlanType(plan.planType)}
                                      color={getPlanBadgeColor(plan.planType)}
                                      size="small"
                                      sx={{ fontWeight: 500 }}
                                    />
                                  </td>
                                  <NumericCell
                                    value={plan.allPreviousAdjustments}
                                  />
                                  <NumericCell value={plan.currentMonthTotal} />
                                  <NumericCell value={rowTotal} />
                                </tr>
                              );
                            })}
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

        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_e, newPage) => setCurrentPage(newPage)}
            color="primary"
          />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default InvoiceSummaryDashboard;
