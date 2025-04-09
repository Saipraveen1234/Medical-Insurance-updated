import React, { useState, useMemo } from "react";
import { useQuery } from "@apollo/client";
import "./Insurance.css";
import { CalendarIcon } from "@heroicons/react/24/solid";
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
  Pagination,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  Dialog,
  Button,
} from "@material-tailwind/react";
import { GET_INVOICE_DATA, GET_UPLOADED_FILES } from "../graphql/queries";
import FileUpload from "./FileUpload";
import Datasets from "./Datasets";

// Placeholder for StatisticsCard
// Placeholder for StatisticsCard
const StatisticsCard = ({ icon, title, value, color }) => {
  return (
    <Paper
      style={{
        padding: "16px",
        display: "flex",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        marginBottom: "16px",
      }}
    >
      <Box
        sx={{
          bgcolor: "#3b82f6",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          minWidth: "80px",
        }}
      >
        {React.createElement(icon, {
          className: "w-6 h-6 text-white",
        })}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          p: 2,
          width: "100%",
          textAlign: "right",
          bgcolor: "white",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "#64748b",
            mb: 0.5,
            fontFamily: "Bookman Old Style",
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            fontFamily: "Bookman Old Style",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};

// Theme that matches the screenshot
const theme = createTheme({
  palette: {
    primary: { main: "#2196f3" },
    success: { main: "#10b981" },
  },
  typography: {
    fontFamily: ["Bookman Old Style", "sans-serif"].join(","),
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
    MuiButtonBase: {
      styleOverrides: {
        root: {
          border: "none",
          padding: 0,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: "Bookman Old Style",
          borderRadius: "10px",
          borderColor: "#bdbdbd",
          textTransform: "none",
          fontWeight: 500,
          color: "black",
          padding: 0,
          "&.Mui-selected": {
            backgroundColor: "#42a5f5",
            color: "#fff",
            "&:hover": { backgroundColor: "#42a5f5" },
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
    MuiTextField: {
      styleOverrides: {
        root: {
          fontFamily: "Bookman Old Style",
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          fontFamily: "Bookman Old Style",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: "1.2rem",
        },
      },
    },
  },
});

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

export const StatisticsSection = ({ total2024, total2025, totalCombined }) => {
  const statisticsInsuranceData = [
    {
      color: "blue",
      icon: CalendarIcon,
      title: "Fiscal year 2024",
      value: `$${formatAmount(total2024)}`,
    },
    {
      color: "blue",
      icon: CalendarIcon,
      title: "Fiscal year 2025",
      value: `$${formatAmount(total2025)}`,
    },
    {
      color: "blue",
      icon: CalendarIcon,
      title: "Combined Total",
      value: `$${formatAmount(totalCombined)}`,
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {statisticsInsuranceData.map(({ icon, title, value, color }) => (
        <Grid item xs={12} md={4} key={title}>
          <StatisticsCard
            icon={icon}
            title={title}
            value={value}
            color={color}
          />
        </Grid>
      ))}
    </Grid>
  );
};

const NumericCell = ({ value, className, style = {} }) => {
  const isNegative = value < 0;
  return (
    <td
      className={className || "numeric-value"}
      style={{
        textAlign: "left",
        padding: "10px",
        fontFamily: "Bookman Old Style",
        borderBottom: "1px solid #e5e7eb",
        ...(isNegative ? { color: "#ef4444" } : {}),
        ...style,
      }}
    >
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
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState("ALL");
  const [expandedMonth, setExpandedMonth] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const itemsPerPage = 6;

  const { data, loading, error } = useQuery(GET_INVOICE_DATA, {
    fetchPolicy: "cache-and-network",
  });
  const {
    data: getUploadedData,
    loading: getUploadedLoading,
    error: getUploadederror,
    refetch,
  } = useQuery(GET_UPLOADED_FILES, {
    fetchPolicy: "network-only",
  });

  const handleOpen = () => {
    setIsModalOpen((prev) => !prev);
  };

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
      (acc, item) => ({
        total2024: acc.total2024 + item.fiscal2024Total,
        total2025: acc.total2025 + item.fiscal2025Total,
      }),
      { total2024: 0, total2025: 0 }
    );
  }, [data]);

  const overallTotal = total2024 + total2025;

  const overallFilteredTotal = useMemo(() => {
    return currentItems.reduce((acc, [_, group]) => {
      const sumUHC = group.uhc.reduce((s, p) => s + p.grandTotal, 0);
      const sumUHG = group.uhg.reduce((s, p) => s + p.grandTotal, 0);
      return acc + sumUHC + sumUHG;
    }, 0);
  }, [currentItems]);

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

  const formatPlanType = (planType) => {
    if (planType.startsWith("UHG-")) {
      return planType.split("-")[1];
    }
    return planType.replace(/([A-Z])(\d)/g, "$1 $2");
  };

  const handleMonthAccordionChange = (panel) => (_event, isExpanded) => {
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
        <Typography
          color="text.secondary"
          sx={{ fontFamily: "Bookman Old Style" }}
        >
          No invoice data available. Please upload files.
        </Typography>
        <Box sx={{ marginTop: "10px" }}>
          <FileUpload onUploadSuccess={() => refetch()} />
        </Box>
      </Paper>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container
        maxWidth="xl"
        sx={{ py: 3, bgcolor: "#f9fafb", minHeight: "100%" }}
      >
        <StatisticsSection
          total2024={total2024}
          total2025={total2025}
          totalCombined={overallTotal}
        />
        {/* Filters */}
        <Grid container spacing={4} alignItems="center" marginBottom={5}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500, fontFamily: "Bookman Old Style" }}
              >
                Plan Type
              </Typography>
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
                  sx={{
                    flex: 1,
                    py: 1,
                    borderRadius: "4px 0 0 4px",
                    fontSize: 14,
                    fontFamily: "Bookman Old Style",
                  }}
                >
                  ALL PLANS
                </ToggleButton>
                <ToggleButton
                  value="UHC"
                  sx={{
                    flex: 1,
                    py: 1,
                    borderRadius: 0,
                    fontFamily: "Bookman Old Style",
                    fontSize: 14,
                  }}
                >
                  UHC
                </ToggleButton>
                <ToggleButton
                  value="UHG"
                  sx={{
                    flex: 1,
                    py: 1,
                    borderRadius: "0 4px 4px 0",
                    fontFamily: "Bookman Old Style",
                    fontSize: 14,
                  }}
                >
                  UHG
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500, fontFamily: "Bookman Old Style" }}
              >
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
                sx={{ fontFamily: "Bookman Old Style" }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select one or more months"
                    variant="outlined"
                    size="small"
                    sx={{
                      bgcolor: "white",
                      fontFamily: "Bookman Old Style",
                      "& .MuiOutlinedInput-root": { borderRadius: "4px" },
                    }}
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500, fontFamily: "Bookman Old Style" }}
              >
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
                  sx={{
                    bgcolor: "white",
                    borderRadius: "4px",
                    fontFamily: "Bookman Old Style",
                    padding: "1px",
                  }}
                >
                  <MenuItem
                    value="ALL"
                    sx={{ fontFamily: "Bookman Old Style" }}
                  >
                    All Years
                  </MenuItem>
                  {allFiscalYears.map((fy) => (
                    <MenuItem
                      key={fy}
                      value={fy.toString()}
                      sx={{ fontFamily: "Bookman Old Style" }}
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
              color="blue"
              style={{ marginTop: "28px", textAlign: "left" }}
              onClick={handleOpen}
            >
              Datasets
            </Button>
          </Grid>
        </Grid>

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
                sx={{
                  mb: 2,
                  border: "1px solid #e5e7eb",
                  bgcolor: "white",
                  maxHeight: "80%",
                  overflow: "scroll",
                }}
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
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, fontFamily: "Bookman Old Style" }}
                    >
                      {month} {year}
                    </Typography>
                    <Typography
                      variant="h6"
                      className="numeric-value"
                      fontFamily="Bookman Old Style"
                      sx={{
                        color: monthTotal < 0 ? "#ef4444" : "black",
                        fontWeight: 600,
                      }}
                    >
                      ${formatAmount(monthTotal)}
                    </Typography>
                  </Box>
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
                              padding: "10px",
                              borderBottom: "1px solid #e5e7eb",
                              fontSize: "1rem",
                              fontWeight: "bold",
                              color: "#374151",
                              fontFamily: "Bookman Old Style",
                            }}
                          >
                            Plan Type
                          </th>
                          <th
                            style={{
                              width: "23.33%",
                              textAlign: "left",
                              padding: "10px",
                              borderBottom: "1px solid #e5e7eb",
                              fontSize: "1rem",
                              fontWeight: "bold",
                              color: "#374151",
                              fontFamily: "Bookman Old Style",
                            }}
                          >
                            Previous Adjustments
                          </th>
                          <th
                            style={{
                              width: "23.33%",
                              textAlign: "left",
                              padding: "10px",
                              borderBottom: "1px solid #e5e7eb",
                              fontSize: "1rem",
                              fontWeight: "bold",
                              color: "#374151",
                              fontFamily: "Bookman Old Style",
                            }}
                          >
                            Current Month
                          </th>
                          <th
                            style={{
                              width: "23.33%",
                              textAlign: "left",
                              padding: "10px",
                              borderBottom: "1px solid #e5e7eb",
                              fontSize: "1rem",
                              fontWeight: "bold",
                              color: "#374151",
                              fontFamily: "Bookman Old Style",
                            }}
                          >
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {uhc.length > 0 && (
                          <>
                            <tr
                              style={{
                                backgroundColor: "#bbdefb",
                                fontWeight: "bold",
                                color: "black",
                                fontFamily: "Bookman Old Style",
                              }}
                            >
                              <td
                                style={{
                                  textAlign: "left",
                                  padding: "10px",
                                  borderBottom: "1px solid #e5e7eb",
                                  fontFamily: "Bookman Old Style",
                                }}
                              >
                                UHC
                              </td>
                              <NumericCell
                                value={calcTotals(uhc).allPreviousAdjustments}
                                style={{ fontWeight: "bold", color: "black" }}
                              />
                              <NumericCell
                                value={calcTotals(uhc).currentMonthTotal}
                                style={{ fontWeight: "bold", color: "black" }}
                              />
                              <NumericCell
                                value={calcTotals(uhc).grandTotal}
                                style={{ fontWeight: "bold", color: "black" }}
                              />
                            </tr>
                            {uhc.map((plan, idx) => {
                              const rowTotal =
                                plan.allPreviousAdjustments +
                                plan.currentMonthTotal;
                              return (
                                <tr key={`uhc-${key}-${idx}`}>
                                  <td
                                    style={{
                                      textAlign: "left",
                                      padding: "10px",
                                      borderBottom: "1px solid #e5e7eb",
                                      fontFamily: "Bookman Old Style",
                                    }}
                                  >
                                    <Typography
                                      sx={{ fontFamily: "Bookman Old Style" }}
                                    >
                                      {formatPlanType(plan.planType)}
                                    </Typography>
                                  </td>
                                  <NumericCell
                                    value={plan.allPreviousAdjustments}
                                    style={{ fontWeight: "bold" }}
                                  />
                                  <NumericCell
                                    value={plan.currentMonthTotal}
                                    style={{ fontWeight: "bold" }}
                                  />
                                  <NumericCell
                                    value={rowTotal}
                                    style={{ fontWeight: "bold" }}
                                  />
                                </tr>
                              );
                            })}
                          </>
                        )}
                        {uhg.length > 0 && (
                          <>
                            <tr
                              style={{
                                backgroundColor: "#bbdefb",
                                fontWeight: "bold",
                                color: "black",
                                fontFamily: "Bookman Old Style",
                                marginTop: 10,
                              }}
                            >
                              <td
                                style={{
                                  textAlign: "left",
                                  padding: "10px",
                                  borderBottom: "1px solid #e5e7eb",
                                  fontFamily: "Bookman Old Style",
                                }}
                              >
                                UHG
                              </td>
                              <NumericCell
                                value={calcTotals(uhg).allPreviousAdjustments}
                                style={{ fontWeight: "bold", color: "black" }}
                              />
                              <NumericCell
                                value={calcTotals(uhg).currentMonthTotal}
                                style={{ fontWeight: "bold", color: "black" }}
                              />
                              <NumericCell
                                value={calcTotals(uhg).grandTotal}
                                style={{ fontWeight: "bold", color: "black" }}
                              />
                            </tr>
                            {uhg.map((plan, idx) => {
                              const rowTotal =
                                plan.allPreviousAdjustments +
                                plan.currentMonthTotal;
                              return (
                                <tr key={`uhg-${key}-${idx}`}>
                                  <td
                                    style={{
                                      textAlign: "left",
                                      padding: "10px",
                                      borderBottom: "1px solid #e5e7eb",
                                      fontFamily: "Bookman Old Style",
                                    }}
                                  >
                                    <Typography
                                      sx={{ fontFamily: "Bookman Old Style" }}
                                    >
                                      {formatPlanType(plan.planType)}
                                    </Typography>
                                  </td>
                                  <NumericCell
                                    value={plan.allPreviousAdjustments}
                                    style={{ fontWeight: "bold" }}
                                  />
                                  <NumericCell
                                    value={plan.currentMonthTotal}
                                    style={{ fontWeight: "bold" }}
                                  />
                                  <NumericCell
                                    value={rowTotal}
                                    style={{ fontWeight: "bold" }}
                                  />
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
        <Dialog
          open={isModalOpen}
          handler={() => setIsModalOpen(false)}
          size="xl"
          className="p-5"
        >
          <DialogBody>
            <Datasets />
          </DialogBody>
          <DialogFooter>
            <Button
              variant="text"
              color="blue"
              onClick={() => setIsModalOpen(false)}
              className="mr-1 bg-blue-500 text-white rounded-md hover:bg-blue-700"
            >
              <span>Close</span>
            </Button>
          </DialogFooter>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default InvoiceSummaryDashboard;
