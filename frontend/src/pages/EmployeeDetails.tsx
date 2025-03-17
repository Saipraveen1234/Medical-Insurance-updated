import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  ThemeProvider,
  createTheme,
  Tooltip,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import { useQuery, gql } from "@apollo/client";

// GraphQL queries
const GET_UNIQUE_EMPLOYEES = gql`
  query GetUniqueEmployees($page: Int!, $limit: Int!, $searchText: String) {
    getUniqueEmployees(page: $page, limit: $limit, searchText: $searchText) {
      total
      employees {
        id
        subscriberId
        subscriberName
        coverageType
        coverageDates
        chargeAmount
        plan
        status
        month
        year
        insuranceFileId
      }
    }
  }
`;

// Fallback query
const GET_ALL_EMPLOYEES = gql`
  query GetAllEmployees {
    getAllEmployees {
      id
      subscriberId
      subscriberName
      coverageType
      coverageDates
      chargeAmount
      plan
      status
      month
      year
      insuranceFileId
    }
  }
`;

// Extended theme with customizations to match the image
const theme = createTheme({
  palette: {
    primary: {
      main: "#3b82f6", // Blue color from image
      light: "#60a5fa",
      dark: "#2563eb",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#64748b", // Slate color for secondary elements
      light: "#94a3b8",
      dark: "#475569",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f1f5f9", // Light gray background
      paper: "#ffffff", // White paper background
    },
    text: {
      primary: "#1e293b", // Dark text color
      secondary: "#64748b", // Secondary text color
    },
  },
  typography: {
    fontFamily: "'Bookman Old Style', serif",
    h4: {
      fontSize: "1.75rem",
      fontWeight: 600,
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
    button: {
      textTransform: "none",
      fontWeight: 500,
      fontFamily: "'Bookman Old Style', serif",
    },
  },
  components: {
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#e2e8f0", // Light gray for table header
          fontFamily: "'Bookman Old Style', serif",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: "#475569",
          padding: "0.75rem 1rem",
          backgroundColor: "#e2e8f0", // Light gray for table header
          borderBottom: "1px solid #cbd5e1",
          whiteSpace: "nowrap",
          fontFamily: "'Bookman Old Style', serif",
          "&:first-of-type": {
            borderTopLeftRadius: "0.5rem",
          },
          "&:last-of-type": {
            borderTopRightRadius: "0.5rem",
          },
        },
        body: {
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #e2e8f0",
          color: "#334155",
          fontFamily: "'Bookman Old Style', serif",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "#f8fafc",
          },
          "&:last-of-type td": {
            borderBottom: "none",
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          border: "none",
          padding: "0.5rem 1.5rem",
          backgroundColor: "transparent",
          color: "#64748b",
          textTransform: "none",
          fontWeight: 500,
          fontFamily: "'Bookman Old Style', serif",
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
          borderRadius: "0.5rem",
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: "#f1f5f9",
          borderRadius: "0.5rem",
          padding: "0.25rem",
          gap: "0.25rem",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: "'Bookman Old Style', serif",
        },
        input: {
          fontFamily: "'Bookman Old Style', serif",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontFamily: "'Bookman Old Style', serif",
        },
        input: {
          fontFamily: "'Bookman Old Style', serif",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.05)",
          borderRadius: "0.5rem",
        },
      },
    },
  },
});

// Employee data interface
interface EmployeeData {
  id: number;
  subscriberId: string;
  subscriberName: string;
  coverageType: string;
  coverageDates: string;
  chargeAmount: number;
  plan: string;
  status: string;
  month: string;
  year: number;
  insuranceFileId: number;
}

// Main component
const EmployeeDetails: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [employeeStatus, setEmployeeStatus] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(
    null
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cachedEmployees, setCachedEmployees] = useState<EmployeeData[]>([]);

  // Debounce search text
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setPage(0); // Reset to first page when search changes
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchText]);

  // GraphQL query
  const { loading, error, data, refetch } = useQuery(GET_UNIQUE_EMPLOYEES, {
    variables: {
      page: page + 1,
      limit: rowsPerPage,
      searchText: debouncedSearchText || undefined,
    },
    fetchPolicy: "cache-and-network",
    onCompleted: (newData) => {
      // Cache data
      if (newData?.getUniqueEmployees?.employees) {
        setCachedEmployees((prev) => {
          const uniqueMap = new Map();

          prev.forEach((emp) => {
            if (!uniqueMap.has(emp.subscriberId)) {
              uniqueMap.set(emp.subscriberId, emp);
            }
          });

          newData.getUniqueEmployees.employees.forEach((emp) => {
            uniqueMap.set(emp.subscriberId, emp);
          });

          return Array.from(uniqueMap.values());
        });
      }
    },
  });

  // Fallback query
  const {
    loading: loadingAll,
    error: errorAll,
    data: allData,
  } = useQuery(GET_ALL_EMPLOYEES, {
    skip: !error,
    fetchPolicy: "cache-and-network",
    onCompleted: (newData) => {
      if (newData?.getAllEmployees) {
        const uniqueEmployees = new Map();
        newData.getAllEmployees.forEach((emp) => {
          const key = emp.subscriberId;
          if (
            !uniqueEmployees.has(key) ||
            isNewerRecord(emp, uniqueEmployees.get(key))
          ) {
            uniqueEmployees.set(key, emp);
          }
        });

        setCachedEmployees(Array.from(uniqueEmployees.values()));
      }
    },
  });

  // Helper function to determine if a record is newer
  const isNewerRecord = (current, existing) => {
    if (!existing) return true;
    if (current.year > existing.year) return true;
    if (current.year < existing.year) return false;

    const monthOrder = {
      JAN: 1,
      FEB: 2,
      MAR: 3,
      APR: 4,
      MAY: 5,
      JUN: 6,
      JUL: 7,
      AUG: 8,
      SEP: 9,
      OCT: 10,
      NOV: 11,
      DEC: 12,
    };

    return monthOrder[current.month] > monthOrder[existing.month];
  };

  // Helper functions to calculate previous month and year
  const getPreviousMonth = (currentMonth: string): string => {
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
    const currentIndex = monthOrder.indexOf(currentMonth);
    if (currentIndex <= 0) {
      return "DEC"; // If January, previous month is December
    }
    return monthOrder[currentIndex - 1];
  };

  const getPreviousMonthYear = (
    currentMonth: string,
    currentYear: number
  ): number => {
    if (currentMonth === "JAN") {
      return currentYear - 1; // If January, previous month is in previous year
    }
    return currentYear;
  };

  // Function to check if previous month data exists
  const hasPreviousMonthData = (employee: EmployeeData): boolean => {
    const prevMonth = getPreviousMonth(employee.month);
    const prevYear = getPreviousMonthYear(employee.month, employee.year);

    // Check cached employees for any record with this employee ID in the previous month
    return cachedEmployees.some(
      (emp) =>
        emp.subscriberId === employee.subscriberId &&
        emp.month === prevMonth &&
        emp.year === prevYear
    );
  };

  // Optional: Function to get the previous month data if it exists
  const getPreviousMonthData = (
    employee: EmployeeData
  ): EmployeeData | null => {
    const prevMonth = getPreviousMonth(employee.month);
    const prevYear = getPreviousMonthYear(employee.month, employee.year);

    return (
      cachedEmployees.find(
        (emp) =>
          emp.subscriberId === employee.subscriberId &&
          emp.month === prevMonth &&
          emp.year === prevYear
      ) || null
    );
  };

  // Filter and sort data
  const filteredEmployees = useMemo(() => {
    let resultData: EmployeeData[] = [];

    if (data?.getUniqueEmployees?.employees) {
      resultData = [...data.getUniqueEmployees.employees];
    } else if (allData?.getAllEmployees) {
      resultData = [...cachedEmployees];
    } else if (cachedEmployees.length > 0) {
      resultData = [...cachedEmployees];
    }

    // Apply status filter if not "ALL"
    if (employeeStatus !== "ALL") {
      resultData = resultData.filter((emp) => {
        if (employeeStatus === "ACTIVE") {
          return emp.status !== "TRM";
        }
        if (employeeStatus === "INACTIVE") {
          return emp.status === "TRM";
        }
        return true;
      });
    }

    // Apply client-side search if needed
    if (debouncedSearchText && !data?.getUniqueEmployees) {
      const searchLower = debouncedSearchText.toLowerCase();
      resultData = resultData.filter(
        (emp) =>
          (emp.subscriberId &&
            emp.subscriberId.toLowerCase().includes(searchLower)) ||
          (emp.subscriberName &&
            emp.subscriberName.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    resultData.sort((a, b) => {
      const aValue = a[sortColumn as keyof EmployeeData];
      const bValue = b[sortColumn as keyof EmployeeData];

      // Handle different types of values
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Handle string comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return resultData;
  }, [
    data,
    allData,
    cachedEmployees,
    debouncedSearchText,
    employeeStatus,
    sortColumn,
    sortDirection,
  ]);

  // Get total count for pagination
  const totalCount = useMemo(() => {
    if (data?.getUniqueEmployees?.total) {
      return data.getUniqueEmployees.total;
    }
    return filteredEmployees.length;
  }, [data, filteredEmployees]);

  // Paginate the data
  const paginatedEmployees = useMemo(() => {
    if (data?.getUniqueEmployees?.employees) {
      return filteredEmployees;
    }

    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredEmployees.slice(start, end);
  }, [filteredEmployees, page, rowsPerPage, data]);

  // Handlers
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  const handleStatusChange = (
    _event: React.MouseEvent<HTMLElement>,
    newStatus: string
  ) => {
    if (newStatus !== null) {
      setEmployeeStatus(newStatus);
      setPage(0);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Function to open employee details dialog
  const handleOpenDetails = (employee: EmployeeData) => {
    setSelectedEmployee(employee);
    setDetailDialogOpen(true);
  };

  // Function to close employee details dialog
  const handleCloseDetails = () => {
    setDetailDialogOpen(false);
    setSelectedEmployee(null);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper functions
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ArrowUpwardIcon fontSize="small" />
    ) : (
      <ArrowDownwardIcon fontSize="small" />
    );
  };

  // Loading state
  const isLoading = loading || loadingAll;

  // Error state
  const hasError = error && errorAll;

  // Custom pagination
  const CustomPagination = () => {
    const totalPages = Math.ceil(totalCount / rowsPerPage);
    const currentPage = page + 1;

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          py: 1.5,
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            variant="body2"
            sx={{
              mr: 2,
              color: "text.secondary",
              fontFamily: "'Bookman Old Style', serif",
            }}
          >
            Rows per page:
          </Typography>
          <select
            value={rowsPerPage.toString()}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            style={{
              padding: "0.25rem 0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.25rem",
              color: "#475569",
              backgroundColor: "transparent",
              fontFamily: "'Bookman Old Style', serif",
            }}
          >
            {[10, 25, 50, 100].map((size) => (
              <option
                key={size}
                value={size}
                style={{ fontFamily: "'Bookman Old Style', serif" }}
              >
                {size}
              </option>
            ))}
          </select>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            variant="body2"
            sx={{
              mr: 2,
              color: "text.secondary",
              fontFamily: "'Bookman Old Style', serif",
            }}
          >
            {page * rowsPerPage + 1} to{" "}
            {Math.min((page + 1) * rowsPerPage, totalCount)} of {totalCount}
          </Typography>

          <Box sx={{ display: "flex" }}>
            <IconButton
              onClick={() => setPage(0)}
              disabled={page === 0}
              size="small"
              sx={{ color: page === 0 ? "#cbd5e1" : "#475569" }}
            >
              <KeyboardDoubleArrowLeftIcon fontSize="small" />
            </IconButton>

            <IconButton
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              size="small"
              sx={{ color: page === 0 ? "#cbd5e1" : "#475569" }}
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>

            <Typography
              sx={{
                mx: 1,
                color: "text.secondary",
                alignSelf: "center",
                fontFamily: "'Bookman Old Style', serif",
              }}
            >
              Page {currentPage} of {totalPages}
            </Typography>

            <IconButton
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              size="small"
              sx={{ color: page >= totalPages - 1 ? "#cbd5e1" : "#475569" }}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>

            <IconButton
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              size="small"
              sx={{ color: page >= totalPages - 1 ? "#cbd5e1" : "#475569" }}
            >
              <KeyboardDoubleArrowRightIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ mb: 1, fontFamily: "'Bookman Old Style', serif" }}
          >
            Employees
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "'Bookman Old Style', serif" }}
          >
            Employee database with contact information and details
          </Typography>
        </Box>

        {/* Filters and Actions Row */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
          }}
        >
          <TextField
            placeholder="Search employees..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchText}
            onChange={handleSearchChange}
            sx={{
              maxWidth: { md: "400px" },
              backgroundColor: "white",
              "& .MuiOutlinedInput-root": {
                borderRadius: "0.5rem",
                fontFamily: "'Bookman Old Style', serif",
              },
              "& .MuiInputBase-input": {
                fontFamily: "'Bookman Old Style', serif",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              style: { fontFamily: "'Bookman Old Style', serif" },
            }}
          />

          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: { xs: "space-between", md: "flex-end" },
              alignItems: "center",
            }}
          >
            <ToggleButtonGroup
              value={employeeStatus}
              exclusive
              onChange={handleStatusChange}
              aria-label="employee status"
              size="small"
              sx={{
                "& .MuiToggleButtonGroup-grouped": {
                  fontFamily: "'Bookman Old Style', serif",
                },
              }}
            >
              <ToggleButton
                value="ALL"
                sx={{ fontFamily: "'Bookman Old Style', serif" }}
              >
                ALL
              </ToggleButton>
              <ToggleButton
                value="ACTIVE"
                sx={{ fontFamily: "'Bookman Old Style', serif" }}
              >
                ACTIVE
              </ToggleButton>
              <ToggleButton
                value="INACTIVE"
                sx={{ fontFamily: "'Bookman Old Style', serif" }}
              >
                INACTIVE
              </ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Refresh data">
              <IconButton
                onClick={handleRefresh}
                size="small"
                sx={{
                  bgcolor: "white",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  "&:hover": { bgcolor: "#f8fafc" },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Employee Table */}
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          {isLoading && (
            <Box
              sx={{
                width: "100%",
                py: 8,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {hasError && (
            <Alert
              severity="error"
              sx={{ m: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleRefresh}>
                  Retry
                </Button>
              }
            >
              Failed to load employee data. Please try again later.
            </Alert>
          )}

          {!isLoading && !hasError && (
            <>
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        onClick={() => handleSort("id")}
                        sx={{
                          cursor: "pointer",
                          userSelect: "none",
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          Employee Id {getSortIcon("id")}
                        </Box>
                      </TableCell>
                      <TableCell
                        onClick={() => handleSort("subscriberName")}
                        sx={{
                          cursor: "pointer",
                          userSelect: "none",
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          First Name {getSortIcon("subscriberName")}
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{ fontFamily: "'Bookman Old Style', serif" }}
                      >
                        Last Name
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontFamily: "'Bookman Old Style', serif" }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedEmployees.length > 0 ? (
                      paginatedEmployees.map((employee) => {
                        // Split name into first and last
                        const nameParts = employee.subscriberName.split(" ");
                        // Swap the names - last name is displayed as first name and vice versa
                        const lastName = nameParts[0] || "N/A";
                        const firstName = nameParts.slice(1).join(" ") || "N/A";

                        return (
                          <TableRow key={employee.id} hover>
                            <TableCell
                              sx={{ fontFamily: "'Bookman Old Style', serif" }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 500,
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                {employee.subscriberId}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{ fontFamily: "'Bookman Old Style', serif" }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                {lastName.toUpperCase()}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{ fontFamily: "'Bookman Old Style', serif" }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: "'Bookman Old Style', serif",
                                }}
                              >
                                {firstName.toUpperCase()}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="View details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDetails(employee)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          {debouncedSearchText ? (
                            <Typography
                              color="text.secondary"
                              sx={{ fontFamily: "'Bookman Old Style', serif" }}
                            >
                              No results found for "{debouncedSearchText}". Try
                              adjusting your search.
                            </Typography>
                          ) : (
                            <Typography
                              color="text.secondary"
                              sx={{ fontFamily: "'Bookman Old Style', serif" }}
                            >
                              No employee data available.
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <CustomPagination />
            </>
          )}
        </Paper>
      </Container>

      {/* Employee Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: "0.75rem",
            overflow: "hidden",
          },
        }}
      >
        {selectedEmployee && (
          <>
            <DialogTitle
              sx={{
                bgcolor: "#3b82f6",
                color: "white",
                fontFamily: "'Bookman Old Style', serif",
                py: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontFamily: "'Bookman Old Style', serif" }}
              >
                Employee Details
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              <Grid container>
                <Grid item xs={12}>
                  <Card sx={{ boxShadow: "none", borderRadius: 0 }}>
                    <CardContent>
                      <Grid container spacing={3}>
                        {/* Employee Basic Info */}
                        <Grid item xs={12}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: "#f8fafc",
                              borderRadius: "0.5rem",
                            }}
                          >
                            <Typography
                              variant="h6"
                              gutterBottom
                              sx={{
                                fontFamily: "'Bookman Old Style', serif",
                                color: "#1e293b",
                                fontWeight: 600,
                                fontSize: "1.1rem",
                              }}
                            >
                              Personal Information
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  ID
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                    fontWeight: 500,
                                  }}
                                >
                                  {selectedEmployee.subscriberId}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  Full Name
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                    fontWeight: 500,
                                  }}
                                >
                                  {selectedEmployee.subscriberName}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Grid>

                        {/* Current Plan Info */}
                        <Grid item xs={12} sm={6}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: "#f8fafc",
                              borderRadius: "0.5rem",
                              height: "100%",
                            }}
                          >
                            <Typography
                              variant="h6"
                              gutterBottom
                              sx={{
                                fontFamily: "'Bookman Old Style', serif",
                                color: "#1e293b",
                                fontWeight: 600,
                                fontSize: "1.1rem",
                              }}
                            >
                              Current Month
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  Period
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                    fontWeight: 500,
                                  }}
                                >
                                  {selectedEmployee.month}{" "}
                                  {selectedEmployee.year}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  Plan
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                    fontWeight: 500,
                                  }}
                                >
                                  {selectedEmployee.plan}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  Premium
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                    fontWeight: 600,
                                    color: "#3b82f6",
                                  }}
                                >
                                  {formatCurrency(
                                    selectedEmployee.chargeAmount
                                  )}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Grid>

                        {/* Previous Month Info */}
                        <Grid item xs={12} sm={6}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: "#f8fafc",
                              borderRadius: "0.5rem",
                              height: "100%",
                            }}
                          >
                            <Typography
                              variant="h6"
                              gutterBottom
                              sx={{
                                fontFamily: "'Bookman Old Style', serif",
                                color: "#1e293b",
                                fontWeight: 600,
                                fontSize: "1.1rem",
                              }}
                            >
                              Previous Month
                            </Typography>

                            {/* Check if there's uploaded data for the previous month - this is the fix */}
                            {hasPreviousMonthData(selectedEmployee) ? (
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontFamily: "'Bookman Old Style', serif",
                                    }}
                                  >
                                    Period
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontFamily: "'Bookman Old Style', serif",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {getPreviousMonth(selectedEmployee.month)}{" "}
                                    {getPreviousMonthYear(
                                      selectedEmployee.month,
                                      selectedEmployee.year
                                    )}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontFamily: "'Bookman Old Style', serif",
                                    }}
                                  >
                                    Plan
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontFamily: "'Bookman Old Style', serif",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {selectedEmployee.plan}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontFamily: "'Bookman Old Style', serif",
                                    }}
                                  >
                                    Premium
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontFamily: "'Bookman Old Style', serif",
                                      fontWeight: 600,
                                      color: "#3b82f6",
                                    }}
                                  >
                                    {formatCurrency(
                                      selectedEmployee.chargeAmount
                                    )}
                                  </Typography>
                                </Grid>
                              </Grid>
                            ) : (
                              <Typography
                                variant="body1"
                                sx={{
                                  fontFamily: "'Bookman Old Style', serif",
                                  fontStyle: "italic",
                                  color: "text.secondary",
                                  mt: 2,
                                }}
                              >
                                No previous month data available
                              </Typography>
                            )}
                          </Box>
                        </Grid>

                        {/* Additional Info */}
                        <Grid item xs={12}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: "#f8fafc",
                              borderRadius: "0.5rem",
                            }}
                          >
                            <Typography
                              variant="h6"
                              gutterBottom
                              sx={{
                                fontFamily: "'Bookman Old Style', serif",
                                color: "#1e293b",
                                fontWeight: 600,
                                fontSize: "1.1rem",
                              }}
                            >
                              Additional Information
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={4}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  Coverage Type
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                    fontWeight: 500,
                                  }}
                                >
                                  {selectedEmployee.coverageType ||
                                    "Employee Only"}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  Status
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                    fontWeight: 500,
                                    color:
                                      selectedEmployee.status === "TRM"
                                        ? "#ef4444"
                                        : "#10b981",
                                  }}
                                >
                                  {selectedEmployee.status === "TRM"
                                    ? "Terminated"
                                    : "Active"}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                  }}
                                >
                                  Coverage Dates
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontFamily: "'Bookman Old Style', serif",
                                    fontWeight: 500,
                                  }}
                                >
                                  {selectedEmployee.coverageDates || "N/A"}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                onClick={handleCloseDetails}
                variant="contained"
                sx={{
                  fontFamily: "'Bookman Old Style', serif",
                  textTransform: "none",
                }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </ThemeProvider>
  );
};

export default EmployeeDetails;
