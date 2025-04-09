import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  ThemeProvider,
  createTheme,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import { useQuery, gql } from "@apollo/client";

// -------------------------------------
// GraphQL QUERIES
// -------------------------------------
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

// -------------------------------------
// PARSE NAME (helper to separate first/last names)
// -------------------------------------
function parseName(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.includes(",")) {
    // e.g. "SMITH, JOHN"
    const [l, f = ""] = trimmed.split(",", 2).map((s) => s.trim());
    return {
      lastName: l.toUpperCase(),
      firstName: f.toUpperCase(),
    };
  } else {
    // e.g. "JOHN SMITH"
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const first = parts.slice(0, parts.length - 1).join(" ");
      return {
        lastName: last.toUpperCase(),
        firstName: first.toUpperCase(),
      };
    } else {
      // single token => treat as lastName
      return {
        lastName: trimmed.toUpperCase(),
        firstName: "",
      };
    }
  }
}

// -------------------------------------
// LEVENSHTEIN DISTANCE (for fuzzy first-name match)
// -------------------------------------
function getLevenshteinDist(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

function fuzzyMatchFirstNames(a: string, b: string, ratioThreshold = 0.69) {
  const dist = getLevenshteinDist(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return false;
  const ratio = dist / maxLen;
  return ratio <= ratioThreshold;
}

// -------------------------------------
// GroupedRow structure:
//   - coverageType: a single coverage type from the earliest record
//   - monthlyPremium: from that earliest record
//   - totalPremium: sum of all charges
// -------------------------------------
interface GroupedRow {
  id: number;
  lastName: string;
  firstName: string;
  plans: Set<string>;
  coverageType: string; // single coverage type
  monthlyPremium: number; // from earliest ID
  totalPremium: number; // sum of all charges
}

// -------------------------------------
// GROUP EMPLOYEES => returns array of GroupedRow
// -------------------------------------
function groupEmployees(emps: EmployeeData[]): GroupedRow[] {
  const map: Record<string, GroupedRow[]> = {};

  for (const emp of emps) {
    const { lastName, firstName } = parseName(emp.subscriberName);

    if (!map[lastName]) {
      map[lastName] = [];
    }

    let found = false;
    for (const grp of map[lastName]) {
      if (fuzzyMatchFirstNames(grp.firstName, firstName)) {
        // Merge this record into the existing group
        grp.plans.add(emp.plan);
        grp.totalPremium += emp.chargeAmount;

        // If this new record has a smaller ID, treat it as the "earliest"
        // => update coverageType & monthlyPremium
        if (emp.id < grp.id) {
          grp.id = emp.id;
          grp.coverageType = emp.coverageType;
          grp.monthlyPremium = emp.chargeAmount;
        }
        found = true;
        break;
      }
    }

    // If no existing group matched, create a new one
    if (!found) {
      map[lastName].push({
        id: emp.id,
        lastName,
        firstName,
        plans: new Set([emp.plan]),
        coverageType: emp.coverageType,
        monthlyPremium: emp.chargeAmount,
        totalPremium: emp.chargeAmount,
      });
    }
  }

  // Flatten all groups into a single array
  const result: GroupedRow[] = [];
  Object.values(map).forEach((arr) => {
    result.push(...arr);
  });
  return result;
}

// -------------------------------------
// MUI THEME
// -------------------------------------
const theme = createTheme({
  palette: {
    background: { default: "#f8fafc" },
    primary: { main: "#3b82f6", contrastText: "#ffffff" },
    text: { primary: "#1e293b", secondary: "#64748b" },
  },
  typography: {
    fontFamily: "'Bookman Old Style', serif",
    h4: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "0.5rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: "#3b82f6",
          color: "#ffffff",
          fontWeight: 600,
        },
        body: {
          borderBottom: "1px solid #e2e8f0",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          backgroundColor: "#3b82f6",
          color: "#fff",
        },
      },
    },
  },
});

// -------------------------------------
// MAIN COMPONENT
// -------------------------------------
const EmployeeDetails: React.FC = () => {
  const [rawEmployees, setRawEmployees] = useState<EmployeeData[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof GroupedRow>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<GroupedRow | null>(null);

  // Debounce search text
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  // GraphQL
  const { loading, error } = useQuery(GET_ALL_EMPLOYEES, {
    fetchPolicy: "cache-and-network",
    onCompleted: (resp) => {
      if (resp?.getAllEmployees) {
        setRawEmployees(resp.getAllEmployees);
      }
    },
  });

  const isLoading = loading;
  const hasError = !!error;

  // 1) Build grouped rows
  const groupedRows = useMemo(() => {
    let filtered = rawEmployees;
    if (selectedPlans.length > 0) {
      filtered = filtered.filter((e) => selectedPlans.includes(e.plan));
    }
    if (debouncedSearchText) {
      const lower = debouncedSearchText.toLowerCase();
      filtered = filtered.filter((e) =>
        e.subscriberName.toLowerCase().includes(lower)
      );
    }
    const grouped = groupEmployees(filtered);
    grouped.sort((a, b) => {
      let aVal = a[sortColumn] as string | number | Set<string>;
      let bVal = b[sortColumn] as string | number | Set<string>;

      if (typeof aVal === "object") aVal = 0;
      if (typeof bVal === "object") bVal = 0;

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
        return sortDirection === "asc"
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      } else {
        return sortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
    return grouped;
  }, [
    rawEmployees,
    selectedPlans,
    debouncedSearchText,
    sortColumn,
    sortDirection,
  ]);

  // 2) Pagination
  const totalCount = groupedRows.length;
  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return groupedRows.slice(start, start + rowsPerPage);
  }, [groupedRows, page, rowsPerPage]);

  // Format currency
  const formatPremium = (amt: number) => {
    const s = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amt);
    if (amt < 0) {
      return (
        <Typography component="span" sx={{ color: "red", fontWeight: 600 }}>
          {s}
        </Typography>
      );
    } else {
      return (
        <Typography
          component="span"
          sx={{ color: "primary.main", fontWeight: 600 }}
        >
          {s}
        </Typography>
      );
    }
  };

  // Sort icon
  const getSortIcon = (col: keyof GroupedRow) => {
    if (col !== sortColumn) return null;
    return sortDirection === "asc" ? (
      <ArrowUpwardIcon fontSize="small" />
    ) : (
      <ArrowDownwardIcon fontSize="small" />
    );
  };

  // Handlers
  const handleSort = (col: keyof GroupedRow) => {
    if (col === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const handlePlanFilterChange = (e: SelectChangeEvent<string[]>) => {
    const val = e.target.value as string[];
    setSelectedPlans(val);
    setPage(0);
  };

  const handleOpenDetails = (row: GroupedRow) => {
    setSelectedRow(row);
    setDetailDialogOpen(true);
  };
  const handleCloseDetails = () => {
    setSelectedRow(null);
    setDetailDialogOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Employees
        </Typography>

        {/* Top metric */}
        <Paper
          sx={{
            p: 1.5,
            mb: 3,
            display: "inline-flex",
            alignItems: "center",
            minWidth: "200px",
            backgroundColor: "primary.main",
            color: "#ffffff",
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: "bold", m: 0 }}>
              Total Employees
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: "bold", m: 0 }}>
              {totalCount}
            </Typography>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3, display: "flex", gap: 2 }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="plan-filter-label">Filter by Plan</InputLabel>
            <Select
              labelId="plan-filter-label"
              multiple
              value={selectedPlans}
              onChange={handlePlanFilterChange}
              label="Filter by Plan"
              renderValue={(selected) => (selected as string[]).join(", ")}
            >
              {[
                "UHC-2000",
                "UHC-3000",
                "UHG-LIFE",
                "UHG-VISION",
                "UHG-DENTAL",
                "UHG-ADD",
              ].map((plan) => (
                <MenuItem key={plan} value={plan}>
                  <Checkbox checked={selectedPlans.indexOf(plan) > -1} />
                  <ListItemText primary={plan} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          {isLoading && (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          )}
          {hasError && (
            <Alert severity="error" sx={{ m: 2 }}>
              Failed to load employees. Please try again.
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
                        sx={{ cursor: "pointer", userSelect: "none" }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          ID {getSortIcon("id")}
                        </Box>
                      </TableCell>
                      <TableCell
                        onClick={() => handleSort("lastName")}
                        sx={{ cursor: "pointer", userSelect: "none" }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          Last Name {getSortIcon("lastName")}
                        </Box>
                      </TableCell>
                      <TableCell
                        onClick={() => handleSort("firstName")}
                        sx={{ cursor: "pointer", userSelect: "none" }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          First Name {getSortIcon("firstName")}
                        </Box>
                      </TableCell>
                      <TableCell>Plans</TableCell>
                      <TableCell
                        onClick={() => handleSort("totalPremium")}
                        sx={{
                          cursor: "pointer",
                          userSelect: "none",
                          textAlign: "center",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          Total Premium {getSortIcon("totalPremium")}
                        </Box>
                      </TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map((row) => {
                      const planStr = Array.from(row.plans).join(", ");
                      return (
                        <TableRow key={row.id}>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            {row.id}
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            {row.lastName}
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            {row.firstName}
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            {planStr}
                          </TableCell>
                          <TableCell align="center">
                            {formatPremium(row.totalPremium)}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip
                              title={
                                <React.Fragment>
                                  <Typography variant="body2">
                                    Coverage Type: {row.coverageType}
                                  </Typography>
                                  <Typography variant="body2">
                                    Monthly Premium:{" "}
                                    {formatPremium(row.monthlyPremium)}
                                  </Typography>
                                </React.Fragment>
                              }
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDetails(row)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {paginated.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          sx={{ textAlign: "center", py: 4 }}
                        >
                          No data found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
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
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    Rows per page:
                  </Typography>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    style={{
                      padding: "0.25rem 0.5rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.25rem",
                    }}
                  >
                    {[10, 25, 50].map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    {page * rowsPerPage + 1} to{" "}
                    {Math.min((page + 1) * rowsPerPage, totalCount)} of{" "}
                    {totalCount}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() => setPage(0)}
                    disabled={page === 0}
                  >
                    <KeyboardDoubleArrowLeftIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setPage(Math.max(page - 1, 0))}
                    disabled={page === 0}
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>

                  <Typography variant="body2" sx={{ mx: 1 }}>
                    Page {page + 1}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() =>
                      setPage(
                        Math.min(
                          page + 1,
                          Math.ceil(totalCount / rowsPerPage) - 1
                        )
                      )
                    }
                    disabled={page >= Math.ceil(totalCount / rowsPerPage) - 1}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() =>
                      setPage(Math.ceil(totalCount / rowsPerPage) - 1)
                    }
                    disabled={page >= Math.ceil(totalCount / rowsPerPage) - 1}
                  >
                    <KeyboardDoubleArrowRightIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Container>

      {/* Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
      >
        {selectedRow && (
          <>
            <DialogTitle>Details for ID #{selectedRow.id}</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Last Name: {selectedRow.lastName}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                First Name: {selectedRow.firstName}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Plans: {Array.from(selectedRow.plans).join(", ")}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Coverage Type: {selectedRow.coverageType}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Monthly Premium: {formatPremium(selectedRow.monthlyPremium)}
              </Typography>
              <Typography variant="body1">
                Total Premium: {formatPremium(selectedRow.totalPremium)}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={handleCloseDetails}>
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
