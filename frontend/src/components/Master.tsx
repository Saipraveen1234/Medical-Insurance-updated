import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Chip,
  Divider,
  Switch,
  Tooltip,
  Badge,
  alpha,
} from "@mui/material";
import { useQuery, gql } from "@apollo/client";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CircleIcon from "@mui/icons-material/Circle";

// Define the GraphQL query using camelCase names
const GET_ALL_EMPLOYEES = gql`
  query GetAllEmployees {
    getAllEmployees {
      id
      subscriberId
      subscriberName
      plan
      coverageType
      status
      coverageDates
      chargeAmount
      month
      year
      insuranceFileId
    }
  }
`;

// ---------- Utility Functions for Fuzzy Matching & Grouping ----------

// Compute the Levenshtein Distance between two strings.
function getLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// Fuzzy-match first names by comparing their Levenshtein distance ratio.
function fuzzyMatchFirstNames(a: string, b: string, threshold = 0.66): boolean {
  const dist = getLevenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  const ratio = dist / maxLen;
  return ratio <= threshold;
}

// Parse a subscriber name and extract first and last names.
// It handles formats like "12345 - John Doe", "Doe, John", or "John Doe".
function parseName(raw: string): { firstName: string; lastName: string } {
  let namePart = raw;
  // If an ID is included (e.g. "12345 - John Doe"), use the part after the hyphen.
  if (raw.includes(" - ")) {
    const parts = raw.split(" - ");
    if (parts.length >= 2) {
      namePart = parts[1].trim();
    }
  }
  // If the name is in "Last, First" format
  if (namePart.includes(",")) {
    const parts = namePart.split(",");
    return {
      lastName: parts[0].trim().toUpperCase(),
      firstName: parts[1].trim().toUpperCase(),
    };
  }
  // Otherwise assume "First Last"
  const parts = namePart.split(" ");
  if (parts.length >= 2) {
    return {
      firstName: parts[0].trim().toUpperCase(),
      lastName: parts.slice(1).join(" ").trim().toUpperCase(),
    };
  }
  return { firstName: namePart.toUpperCase(), lastName: "" };
}

// ---------- Type Definitions ----------

interface Employee {
  id: number;
  subscriberId: string;
  subscriberName: string;
  plan: string;
  coverageType: string;
  status: string;
  coverageDates: string;
  chargeAmount: number;
  month: string;
  year: number;
  insuranceFileId: number;
}

interface GroupedEmployee {
  id?: number; // Added ID for tracking status overrides
  employeeName: string;
  firstName: string;
  lastName: string;
  coverageType: string;
  planCategory: string;
  lifeTotal: number;
  addTotal: number;
  dentalTotal: number;
  visionTotal: number;
  medicalTotal: number;
  grandTotal: number;
  records: Employee[];
  latestMonth?: {
    month: string;
    year: number;
    lifeTotal: number;
    addTotal: number;
    dentalTotal: number;
    visionTotal: number;
    medicalTotal: number;
    monthTotal: number;
  };
}

// Group employees whose names match (by same last name and fuzzy similar first names)
function fuzzyMatchEmployees(employees: Employee[]): GroupedEmployee[] {
  const groups: GroupedEmployee[] = [];
  employees.forEach((emp) => {
    const { firstName, lastName } = parseName(emp.subscriberName);
    // Try to find an existing group with the same last name and a matching first name
    const existingGroup = groups.find(
      (g) =>
        g.lastName === lastName && fuzzyMatchFirstNames(g.firstName, firstName)
    );
    if (existingGroup) {
      existingGroup.records.push(emp);
    } else {
      groups.push({
        employeeName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        coverageType: emp.coverageType,
        planCategory: "",
        lifeTotal: 0,
        addTotal: 0,
        dentalTotal: 0,
        visionTotal: 0,
        medicalTotal: 0,
        grandTotal: 0,
        records: [emp],
      });
    }
  });
  return groups;
}

// Determine the latest month and year for each employee group
function getLatestMonthData(group: GroupedEmployee): {
  month: string;
  year: number;
  lifeTotal: number;
  addTotal: number;
  dentalTotal: number;
  visionTotal: number;
  medicalTotal: number;
  monthTotal: number;
} {
  // Create a mapping of fiscal months to numbers for comparison
  const fiscalMonthOrder = {
    OCT: 1,
    NOV: 2,
    DEC: 3,
    JAN: 4,
    FEB: 5,
    MAR: 6,
    APR: 7,
    MAY: 8,
    JUN: 9,
    JUL: 10,
    AUG: 11,
    SEP: 12,
  };

  // Group records by month and year
  const monthYearGroups: Record<string, any> = {};

  group.records.forEach((rec) => {
    const key = `${rec.month}-${rec.year}`;
    if (!monthYearGroups[key]) {
      monthYearGroups[key] = {
        month: rec.month,
        year: rec.year,
        monthOrder: fiscalMonthOrder[rec.month.toUpperCase()] || 0,
        dental: 0,
        vision: 0,
        life: 0,
        add: 0,
        medical: 0,
      };
    }

    // Add amount to appropriate category based on plan
    const plan = rec.plan.toUpperCase();
    if (plan.includes("DENTAL")) {
      monthYearGroups[key].dental += rec.chargeAmount;
    } else if (plan.includes("VISION")) {
      monthYearGroups[key].vision += rec.chargeAmount;
    } else if (plan.includes("LIFE")) {
      monthYearGroups[key].life += rec.chargeAmount;
    } else if (plan.includes("ADD")) {
      monthYearGroups[key].add += rec.chargeAmount;
    } else if (
      plan.includes("2000") ||
      plan.includes("3000") ||
      plan.includes("UHC")
    ) {
      monthYearGroups[key].medical += rec.chargeAmount;
    } else {
      monthYearGroups[key].medical += rec.chargeAmount;
    }
  });

  // Find the latest month-year combination
  const monthYears = Object.values(monthYearGroups);

  if (monthYears.length === 0) {
    return {
      month: "",
      year: 0,
      lifeTotal: 0,
      addTotal: 0,
      dentalTotal: 0,
      visionTotal: 0,
      medicalTotal: 0,
      monthTotal: 0,
    };
  }

  // Sort by year (descending) and then by month order (descending)
  monthYears.sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }
    return b.monthOrder - a.monthOrder;
  });

  // Get the latest month data
  const latest = monthYears[0];

  return {
    month: latest.month,
    year: latest.year,
    lifeTotal: latest.life,
    addTotal: latest.add,
    dentalTotal: latest.dental,
    visionTotal: latest.vision,
    medicalTotal: latest.medical,
    monthTotal:
      latest.life + latest.add + latest.dental + latest.vision + latest.medical,
  };
}

// Aggregate coverage amounts and assign plan category.
// If any record has "UHC-2000" then the category is "2000";
// else if any record has "UHC-3000" then "3000";
// otherwise, the category is "General".
function groupCoverageAmounts(groups: GroupedEmployee[]): GroupedEmployee[] {
  return groups.map((group) => {
    const plans = group.records.map((r) => r.plan.toUpperCase());
    let planCategory = "General";
    if (plans.includes("UHC-2000")) {
      planCategory = "2000";
    } else if (plans.includes("UHC-3000")) {
      planCategory = "3000";
    }
    group.planCategory = planCategory;
    let lifeTotal = 0,
      addTotal = 0,
      dentalTotal = 0,
      visionTotal = 0,
      medicalTotal = 0;
    group.records.forEach((r) => {
      const plan = r.plan.toUpperCase();
      const amt = r.chargeAmount || 0;
      if (plan.includes("LIFE")) {
        lifeTotal += amt;
      } else if (plan.includes("ADD")) {
        addTotal += amt;
      } else if (plan.includes("DENTAL")) {
        dentalTotal += amt;
      } else if (plan.includes("VISION")) {
        visionTotal += amt;
      } else if (
        plan.includes("2000") ||
        plan.includes("3000") ||
        plan.includes("UHC")
      ) {
        medicalTotal += amt;
      } else {
        medicalTotal += amt;
      }
    });
    group.lifeTotal = lifeTotal;
    group.addTotal = addTotal;
    group.dentalTotal = dentalTotal;
    group.visionTotal = visionTotal;
    group.medicalTotal = medicalTotal;
    group.grandTotal =
      lifeTotal + addTotal + dentalTotal + visionTotal + medicalTotal;
    // Use the coverageType from the first record
    group.coverageType = group.records[0]?.coverageType || "EMPLOYEE";

    // Calculate latest month data
    group.latestMonth = getLatestMonthData(group);

    return group;
  });
}

// Determine whether a group is considered terminated.
// For instance, if any record's status includes "TRM", consider that group inactive.
function isTerminated(group: GroupedEmployee): boolean {
  return group.records.some((r) => r.status.toUpperCase().includes("TRM"));
}

// New function to manually control active status
function getActiveStatus(
  groupId: number,
  manualStatusMap: Record<number, boolean>,
  autoStatus: boolean
): boolean {
  // If there's a manual override, use it
  if (manualStatusMap.hasOwnProperty(groupId)) {
    return manualStatusMap[groupId];
  }
  // Otherwise use the auto-determined status
  return !autoStatus; // inverse of isTerminated
}

// Format currency for display
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};

// ---------- EmployeeTable Component ----------

interface EmployeeTableProps {
  employees: GroupedEmployee[];
  title: string;
  tabIndex: number;
  onToggleStatus: (groupId: number) => void;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  title,
  tabIndex,
  onToggleStatus,
}) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedEmployee | null>(
    null
  );

  const handleOpenDetails = (group: GroupedEmployee) => {
    setSelectedGroup(group);
    setDetailOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailOpen(false);
    setSelectedGroup(null);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant="h5"
        sx={{
          mb: 3,
          fontWeight: 600,
          fontFamily: "'Bookman Old Style', serif",
          color: "#1e293b",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {title}
          <Badge
            badgeContent={employees.length}
            color={tabIndex === 0 ? "primary" : "error"}
            sx={{ ml: 2 }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: "#64748b",
            textTransform: "none",
            letterSpacing: "normal",
            display: "flex",
            alignItems: "center",
          }}
        >
          <CircleIcon
            fontSize="small"
            sx={{
              color: tabIndex === 0 ? "#10b981" : "#ef4444",
              mr: 1,
              fontSize: "0.75rem",
            }}
          />
          {tabIndex === 0 ? "Currently Active" : "Currently Inactive"}
        </Typography>
      </Typography>
      <Paper
        sx={{
          mb: 3,
          overflow: "hidden",
          borderRadius: 1,
          boxShadow: "0 3px 6px rgba(0,0,0,0.07)",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f7ff" }}>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Employee Name
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Plan Category
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Type
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Life
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                ADD
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Dental
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Vision
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Medical
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Month Total
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Grand Total
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: 600,
                  fontFamily: "'Bookman Old Style', serif",
                  color: "#1e293b",
                  borderBottom: "2px solid #a0c2f0",
                  py: 2,
                }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((group, idx) => (
              <TableRow
                key={idx}
                hover
                sx={{
                  "&:hover": { backgroundColor: "#fafbfe" },
                  "&:nth-of-type(even)": { backgroundColor: "#f9fbfd" },
                  transition: "background-color 0.15s ease-in-out",
                  height: "56px",
                }}
              >
                <TableCell
                  sx={{ fontFamily: "'Bookman Old Style', serif", py: 1.5 }}
                >
                  <Button
                    variant="text"
                    onClick={() => handleOpenDetails(group)}
                    sx={{
                      textTransform: "none",
                      color: "#000000",
                      fontFamily: "'Bookman Old Style', serif",
                      fontWeight: 700,
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                      display: "flex",
                      alignItems: "center",
                      px: 1.5,
                    }}
                  >
                    {group.employeeName}
                    <InfoOutlinedIcon
                      fontSize="small"
                      sx={{
                        ml: 1,
                        color: "#64748b",
                        opacity: 0.7,
                        fontSize: "1rem",
                      }}
                    />
                  </Button>
                </TableCell>
                <TableCell
                  sx={{
                    fontFamily: "'Bookman Old Style', serif",
                    fontWeight: 500,
                    py: 1.5,
                  }}
                >
                  <Chip
                    label={group.planCategory}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      backgroundColor:
                        group.planCategory === "2000"
                          ? alpha("#3b82f6", 0.1)
                          : group.planCategory === "3000"
                          ? alpha("#10b981", 0.1)
                          : alpha("#f59e0b", 0.1),
                      color:
                        group.planCategory === "2000"
                          ? "#3b82f6"
                          : group.planCategory === "3000"
                          ? "#10b981"
                          : "#f59e0b",
                      borderRadius: "4px",
                    }}
                  />
                </TableCell>
                <TableCell
                  sx={{
                    fontFamily: "'Bookman Old Style', serif",
                    fontWeight: 500,
                    py: 1.5,
                  }}
                >
                  <Chip
                    label={group.coverageType}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 500,
                      borderColor: "#94a3b8",
                      color: "#64748b",
                      borderRadius: "4px",
                    }}
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: "'Bookman Old Style', serif",
                    color:
                      (group.latestMonth?.lifeTotal || 0) > 0 ? "#000" : "#666",
                  }}
                >
                  {formatCurrency(group.latestMonth?.lifeTotal || 0).replace(
                    /^(\$)/,
                    ""
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: "'Bookman Old Style', serif",
                    color:
                      (group.latestMonth?.addTotal || 0) > 0 ? "#000" : "#666",
                  }}
                >
                  {formatCurrency(group.latestMonth?.addTotal || 0).replace(
                    /^(\$)/,
                    ""
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: "'Bookman Old Style', serif",
                    color:
                      (group.latestMonth?.dentalTotal || 0) > 0
                        ? "#000"
                        : "#666",
                  }}
                >
                  {formatCurrency(group.latestMonth?.dentalTotal || 0).replace(
                    /^(\$)/,
                    ""
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: "'Bookman Old Style', serif",
                    color:
                      (group.latestMonth?.visionTotal || 0) > 0
                        ? "#000"
                        : "#666",
                  }}
                >
                  {formatCurrency(group.latestMonth?.visionTotal || 0).replace(
                    /^(\$)/,
                    ""
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: "'Bookman Old Style', serif",
                    color:
                      (group.latestMonth?.medicalTotal || 0) > 0
                        ? "#000"
                        : "#666",
                  }}
                >
                  {formatCurrency(group.latestMonth?.medicalTotal || 0).replace(
                    /^(\$)/,
                    ""
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    fontFamily: "'Bookman Old Style', serif",
                    color:
                      (group.latestMonth?.monthTotal || 0) < 0
                        ? "#ef4444"
                        : "#1976d2",
                    fontSize: "0.95rem",
                  }}
                >
                  {formatCurrency(group.latestMonth?.monthTotal || 0).replace(
                    /^(\$)/,
                    ""
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    fontFamily: "'Bookman Old Style', serif",
                    color: group.grandTotal < 0 ? "#ef4444" : "#000000",
                    fontSize: "0.95rem",
                  }}
                >
                  {formatCurrency(group.grandTotal).replace(/^(\$)/, "")}
                </TableCell>
                <TableCell align="center">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Tooltip
                      title={`Toggle employee ${
                        tabIndex === 0 ? "inactive" : "active"
                      } status`}
                      arrow
                      placement="top"
                    >
                      <Switch
                        checked={tabIndex === 0}
                        onChange={() => onToggleStatus(group.id || 0)}
                        color={tabIndex === 0 ? "primary" : "error"}
                        size="small"
                        sx={{
                          "& .MuiSwitch-switchBase": {
                            color: tabIndex === 0 ? "#1976d2" : "#aaa",
                          },
                          "& .MuiSwitch-track": {
                            backgroundColor:
                              tabIndex === 0
                                ? "#1976d2 !important"
                                : "#d32f2f !important",
                            opacity:
                              tabIndex === 0
                                ? "0.3 !important"
                                : "0.1 !important",
                          },
                        }}
                      />
                    </Tooltip>
                    <Typography
                      variant="caption"
                      sx={{
                        ml: 1,
                        fontWeight: 600,
                        color: tabIndex === 0 ? "#1976d2" : "#d32f2f",
                        fontSize: "0.7rem",
                      }}
                    >
                      {tabIndex === 0 ? "ACTIVE" : "INACTIVE"}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={11}
                  align="center"
                  sx={{ py: 4, fontFamily: "'Bookman Old Style', serif" }}
                >
                  No employees found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Employee Details Dialog */}
      <Dialog
        open={detailOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{
          elevation: 1,
          sx: { borderRadius: 1 },
        }}
      >
        {selectedGroup && (
          <>
            <DialogTitle
              sx={{
                backgroundColor: "#f0f7ff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "'Bookman Old Style', serif",
                py: 1.5,
                borderBottom: "3px solid #1976d2",
              }}
            >
              <Typography
                fontFamily="'Bookman Old Style', serif"
                fontWeight={600}
              >
                Employee Details
              </Typography>
              <Button
                onClick={handleCloseDetails}
                variant="contained"
                sx={{
                  bgcolor: "#1976d2",
                  color: "white",
                  fontFamily: "'Bookman Old Style', serif",
                  textTransform: "none",
                  boxShadow: "none",
                  minWidth: "auto",
                }}
              >
                Close
              </Button>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: "1px solid #e0e0e0" }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    fontFamily: "'Bookman Old Style', serif",
                    fontSize: "1.3rem",
                    color: "#1e293b",
                  }}
                >
                  {selectedGroup.employeeName}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    mb: 2,
                    fontFamily: "'Bookman Old Style', serif",
                  }}
                >
                  Plan Category: {selectedGroup.planCategory} | Type:{" "}
                  {selectedGroup.coverageType}
                  {selectedGroup.latestMonth?.month && (
                    <>
                      {" "}
                      | Latest Month: {selectedGroup.latestMonth.month}{" "}
                      {selectedGroup.latestMonth.year}
                    </>
                  )}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    fontFamily: "'Bookman Old Style', serif",
                  }}
                >
                  Latest Month Total:{" "}
                  {formatCurrency(selectedGroup.latestMonth?.monthTotal || 0)} |
                  Grand Total: {formatCurrency(selectedGroup.grandTotal)}
                </Typography>
              </Box>

              <Box sx={{ p: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    fontFamily: "'Bookman Old Style', serif",
                  }}
                >
                  Record Details:
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        Month
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        Fiscal Year
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        Dental
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        Vision
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        Life
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        ADD
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontFamily: "'Bookman Old Style', serif",
                        }}
                      >
                        Medical
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      // Group records by month and year
                      const monthYearGroups = {};
                      selectedGroup.records.forEach((rec) => {
                        const key = `${rec.month}-${rec.year}`;
                        if (!monthYearGroups[key]) {
                          // Calculate fiscal year based on month
                          // Oct-Dec of year N belongs to fiscal year N+1
                          // Jan-Sep of year N belongs to fiscal year N
                          const calendarYear = rec.year;
                          const monthName = rec.month.toUpperCase();
                          let fiscalYear = calendarYear;

                          if (["OCT", "NOV", "DEC"].includes(monthName)) {
                            fiscalYear = calendarYear + 1;
                          }

                          monthYearGroups[key] = {
                            month: rec.month,
                            year: calendarYear,
                            fiscalYear: fiscalYear,
                            dental: 0,
                            vision: 0,
                            life: 0,
                            add: 0,
                            medical: 0,
                          };
                        }

                        // Add amount to appropriate category based on plan
                        const plan = rec.plan.toUpperCase();
                        if (plan.includes("DENTAL")) {
                          monthYearGroups[key].dental += rec.chargeAmount;
                        } else if (plan.includes("VISION")) {
                          monthYearGroups[key].vision += rec.chargeAmount;
                        } else if (plan.includes("LIFE")) {
                          monthYearGroups[key].life += rec.chargeAmount;
                        } else if (plan.includes("ADD")) {
                          monthYearGroups[key].add += rec.chargeAmount;
                        } else if (
                          plan.includes("UHC-2000") ||
                          plan.includes("UHC-3000")
                        ) {
                          monthYearGroups[key].medical += rec.chargeAmount;
                        } else {
                          monthYearGroups[key].medical += rec.chargeAmount;
                        }
                      });

                      // Convert to array and sort by fiscal year (newest first) and month (newest first)
                      const fiscalMonthOrder = {
                        OCT: 1,
                        NOV: 2,
                        DEC: 3,
                        JAN: 4,
                        FEB: 5,
                        MAR: 6,
                        APR: 7,
                        MAY: 8,
                        JUN: 9,
                        JUL: 10,
                        AUG: 11,
                        SEP: 12,
                      };

                      // Get current month to determine the sorting
                      const currentDate = new Date();
                      const currentMonth = currentDate
                        .toLocaleString("en-US", { month: "short" })
                        .toUpperCase();
                      const currentMonthOrder =
                        fiscalMonthOrder[currentMonth] ||
                        fiscalMonthOrder["APR"]; // Default to APR if not found

                      const sortedGroups = Object.values(monthYearGroups).sort(
                        (a, b) => {
                          // First sort by fiscal year (newest first)
                          if (a.fiscalYear !== b.fiscalYear)
                            return b.fiscalYear - a.fiscalYear;

                          // Get month orders
                          let aOrder = fiscalMonthOrder[a.month];
                          let bOrder = fiscalMonthOrder[b.month];

                          // Adjust the order so that the current month is first
                          // For months past the current month, add 12 to make them "earlier" when sorting
                          if (aOrder > currentMonthOrder) aOrder -= 12;
                          if (bOrder > currentMonthOrder) bOrder -= 12;

                          // Sort by adjusted month order (most recent first)
                          return bOrder - aOrder;
                        }
                      );

                      return sortedGroups.map((group, index) => (
                        <TableRow key={index}>
                          <TableCell
                            sx={{ fontFamily: "'Bookman Old Style', serif" }}
                          >
                            {group.month}
                          </TableCell>
                          <TableCell
                            sx={{ fontFamily: "'Bookman Old Style', serif" }}
                          >
                            {group.fiscalYear}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "'Bookman Old Style', serif" }}
                          >
                            {group.dental > 0
                              ? formatCurrency(group.dental).replace(
                                  /^(\$)/,
                                  ""
                                )
                              : "-"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "'Bookman Old Style', serif" }}
                          >
                            {group.vision > 0
                              ? formatCurrency(group.vision).replace(
                                  /^(\$)/,
                                  ""
                                )
                              : "-"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "'Bookman Old Style', serif" }}
                          >
                            {group.life > 0
                              ? formatCurrency(group.life).replace(/^(\$)/, "")
                              : "-"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "'Bookman Old Style', serif" }}
                          >
                            {group.add > 0
                              ? formatCurrency(group.add).replace(/^(\$)/, "")
                              : "-"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "'Bookman Old Style', serif" }}
                          >
                            {group.medical > 0
                              ? formatCurrency(group.medical).replace(
                                  /^(\$)/,
                                  ""
                                )
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

// ---------- Main MASTER Component ----------

const Master: React.FC = () => {
  // Tab state: 0 = Active; 1 = Inactive
  const [tabIndex, setTabIndex] = useState(0);
  const handleTabChange = (_event: React.SyntheticEvent, newIndex: number) => {
    setTabIndex(newIndex);
  };

  // State for search and filters
  const [searchText, setSearchText] = useState("");
  const [planFilters, setPlanFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

  // Filter state for showing/hiding the filter options
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search text to avoid excessive filtering
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Query all employees from the server (using the correct camelCase fields)
  const { data, loading, error, refetch } = useQuery(GET_ALL_EMPLOYEES, {
    fetchPolicy: "network-only", // This ensures we don't use cached data
  });

  // Set up an interval to periodically refresh the data
  useEffect(() => {
    // Initial data fetch when component mounts
    refetch();

    // Set up periodic refresh
    const intervalId = setInterval(() => {
      refetch();
    }, 10000); // Refetch every 10 seconds

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [refetch]);

  // State for grouped (fuzzy-matched) and aggregated employee data
  const [groupedEmployees, setGroupedEmployees] = useState<GroupedEmployee[]>(
    []
  );

  // Initialize manualStatusOverrides from localStorage
  const [manualStatusOverrides, setManualStatusOverrides] = useState<
    Record<number, boolean>
  >(() => {
    try {
      const saved = localStorage.getItem("employeeStatusOverrides");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error loading status overrides from localStorage", e);
      return {};
    }
  });

  // Available plans and coverage types for filters
  const [availablePlans, setAvailablePlans] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  useEffect(() => {
    if (data && data.getAllEmployees) {
      // Group employees using fuzzy matching and then aggregate coverage amounts.
      const groups = fuzzyMatchEmployees(data.getAllEmployees);
      const aggregated = groupCoverageAmounts(groups);

      // Assign IDs to each group for tracking status overrides
      aggregated.forEach((group, index) => {
        group.id = index; // Add an ID to each group
      });

      setGroupedEmployees(aggregated);

      // Extract unique plan categories and coverage types for filters
      const plans = new Set<string>();
      const types = new Set<string>();

      aggregated.forEach((group) => {
        plans.add(group.planCategory);
        types.add(group.coverageType);
      });

      setAvailablePlans(Array.from(plans));
      setAvailableTypes(Array.from(types));
    }
  }, [data]);

  // Effect to save status overrides to localStorage if they change
  useEffect(() => {
    localStorage.setItem(
      "employeeStatusOverrides",
      JSON.stringify(manualStatusOverrides)
    );
  }, [manualStatusOverrides]);

  // Handle toggling active/inactive status with persistence to localStorage
  const handleToggleStatus = (groupId: number) => {
    setManualStatusOverrides((prev) => {
      const newOverrides = { ...prev };

      // If there's already an override for this group
      if (newOverrides.hasOwnProperty(groupId)) {
        // Toggle the current override
        newOverrides[groupId] = !newOverrides[groupId];
      } else {
        // Create a new override - opposite of current tab
        // If on active tab (0), set to inactive (false)
        // If on inactive tab (1), set to active (true)
        newOverrides[groupId] = tabIndex === 1;
      }

      // Save to localStorage
      localStorage.setItem(
        "employeeStatusOverrides",
        JSON.stringify(newOverrides)
      );

      return newOverrides;
    });
  };

  // Filter employees based on search and filter criteria
  const filteredEmployees = groupedEmployees.filter((group) => {
    // Search text filter
    if (debouncedSearchText) {
      const searchLower = debouncedSearchText.toLowerCase();
      const nameMatch = group.employeeName.toLowerCase().includes(searchLower);
      const planMatch = group.planCategory.toLowerCase().includes(searchLower);
      const typeMatch = group.coverageType.toLowerCase().includes(searchLower);

      if (!nameMatch && !planMatch && !typeMatch) return false;
    }

    // Plan category filter
    if (planFilters.length > 0 && !planFilters.includes(group.planCategory)) {
      return false;
    }

    // Coverage type filter
    if (typeFilters.length > 0 && !typeFilters.includes(group.coverageType)) {
      return false;
    }

    return true;
  });

  // Get active and inactive employees based on automatic status and manual overrides
  const activeEmployees = filteredEmployees.filter((group) => {
    const autoStatus = isTerminated(group);
    const isActive =
      group.id !== undefined
        ? getActiveStatus(group.id, manualStatusOverrides, autoStatus)
        : !autoStatus;
    return isActive;
  });

  const inactiveEmployees = filteredEmployees.filter((group) => {
    const autoStatus = isTerminated(group);
    const isActive =
      group.id !== undefined
        ? getActiveStatus(group.id, manualStatusOverrides, autoStatus)
        : !autoStatus;
    return !isActive;
  });

  // Handle filter toggles
  const handlePlanFilterToggle = (plan: string) => {
    setPlanFilters((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  };

  const handleTypeFilterToggle = (type: string) => {
    setTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchText("");
    setPlanFilters([]);
    setTypeFilters([]);
  };

  if (loading)
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          minHeight: "200px",
          backgroundColor: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: "8px",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "#64748b",
            fontFamily: "'Bookman Old Style', serif",
            mb: 2,
          }}
        >
          Loading Employee Data...
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: "#1976d2",
              borderRadius: "50%",
              animation: "pulse 1.5s infinite ease-in-out",
              "@keyframes pulse": {
                "0%": {
                  transform: "scale(0.8)",
                  opacity: 0.5,
                },
                "50%": {
                  transform: "scale(1)",
                  opacity: 1,
                },
                "100%": {
                  transform: "scale(0.8)",
                  opacity: 0.5,
                },
              },
            }}
          />
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: "#3b82f6",
              borderRadius: "50%",
              animation: "pulse 1.5s infinite ease-in-out 0.3s",
            }}
          />
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: "#60a5fa",
              borderRadius: "50%",
              animation: "pulse 1.5s infinite ease-in-out 0.6s",
            }}
          />
        </Box>
      </Paper>
    );

  if (error)
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          minHeight: "200px",
          backgroundColor: "#fff2f2",
          border: "1px dashed #fecaca",
          borderRadius: "8px",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "#ef4444",
            fontFamily: "'Bookman Old Style', serif",
            mb: 2,
          }}
        >
          Error Loading Data
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "#b91c1c",
            fontFamily: "'Bookman Old Style', serif",
            fontWeight: 500,
            maxWidth: "500px",
            mb: 2,
          }}
        >
          {error.message}
        </Typography>
        <Button
          variant="contained"
          color="error"
          onClick={() => refetch()}
          sx={{
            textTransform: "none",
            fontFamily: "'Bookman Old Style', serif",
            fontWeight: 600,
            px: 3,
            py: 1,
          }}
        >
          Try Again
        </Button>
      </Paper>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3, backgroundColor: "#f8f9fa" }}>
      {/* Search and filter bar */}
      <Paper
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 1,
          boxShadow: "0 3px 6px rgba(0,0,0,0.07)",
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "#64748b",
                  mb: 0.5,
                  fontSize: "0.875rem",
                }}
              >
                Search Employees
              </Typography>
              <TextField
                fullWidth
                placeholder="Search by name, plan category, or coverage type..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchText && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchText("")}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    fontFamily: "'Bookman Old Style', serif",
                    borderRadius: 1,
                    height: "42px",
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "#e0e0e0",
                    },
                    "&:hover fieldset": {
                      borderColor: "#1976d2",
                    },
                  },
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "#64748b",
                  mb: 0.5,
                  fontSize: "0.875rem",
                }}
              >
                Filter Options
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                {(planFilters.length > 0 || typeFilters.length > 0) && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleClearFilters}
                    sx={{
                      textTransform: "none",
                      fontFamily: "'Bookman Old Style', serif",
                      fontWeight: 600,
                      borderColor: "#e2e8f0",
                      color: "#64748b",
                      borderRadius: "6px",
                      "&:hover": {
                        borderColor: "#94a3b8",
                        backgroundColor: "rgba(148, 163, 184, 0.04)",
                      },
                      height: "42px",
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
                <Button
                  variant={showFilters ? "contained" : "outlined"}
                  size="small"
                  startIcon={<FilterListIcon />}
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{
                    textTransform: "none",
                    fontFamily: "'Bookman Old Style', serif",
                    fontWeight: 600,
                    borderColor: showFilters ? "transparent" : "#e2e8f0",
                    color: showFilters ? "white" : "#64748b",
                    backgroundColor: showFilters ? "#1976d2" : "transparent",
                    borderRadius: "6px",
                    "&:hover": {
                      borderColor: showFilters ? "transparent" : "#94a3b8",
                      backgroundColor: showFilters
                        ? "#1565c0"
                        : "rgba(148, 163, 184, 0.04)",
                    },
                    height: "42px",
                  }}
                >
                  Filters{" "}
                  {planFilters.length + typeFilters.length > 0 && (
                    <Badge
                      badgeContent={planFilters.length + typeFilters.length}
                      color="error"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Filter options */}
          {showFilters && (
            <Grid item xs={12}>
              <Box
                sx={{
                  mt: 2,
                  p: 3,
                  backgroundColor: "#f8fafc",
                  borderRadius: 1,
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      fontFamily: "'Bookman Old Style', serif",
                      color: "#334155",
                      fontSize: "0.9rem",
                    }}
                  >
                    Plan Category Filters
                  </Typography>
                  {planFilters.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => setPlanFilters([])}
                      sx={{
                        textTransform: "none",
                        fontFamily: "'Bookman Old Style', serif",
                        color: "#64748b",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        "&:hover": {
                          backgroundColor: "transparent",
                          textDecoration: "underline",
                        },
                      }}
                    >
                      Clear Category Filters
                    </Button>
                  )}
                </Box>
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 3 }}
                >
                  {availablePlans.map((plan) => (
                    <Chip
                      key={plan}
                      label={plan}
                      clickable
                      color={planFilters.includes(plan) ? "primary" : "default"}
                      variant={
                        planFilters.includes(plan) ? "filled" : "outlined"
                      }
                      onClick={() => handlePlanFilterToggle(plan)}
                      sx={{
                        fontFamily: "'Bookman Old Style', serif",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        borderRadius: "4px",
                        backgroundColor: planFilters.includes(plan)
                          ? plan === "2000"
                            ? "#3b82f6"
                            : plan === "3000"
                            ? "#10b981"
                            : "#f59e0b"
                          : "transparent",
                        borderColor:
                          plan === "2000"
                            ? "#3b82f6"
                            : plan === "3000"
                            ? "#10b981"
                            : "#f59e0b",
                        "& .MuiChip-label": {
                          px: 1.5,
                        },
                      }}
                    />
                  ))}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 3,
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      fontFamily: "'Bookman Old Style', serif",
                      color: "#334155",
                      fontSize: "0.9rem",
                    }}
                  >
                    Coverage Type Filters
                  </Typography>
                  {typeFilters.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => setTypeFilters([])}
                      sx={{
                        textTransform: "none",
                        fontFamily: "'Bookman Old Style', serif",
                        color: "#64748b",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        "&:hover": {
                          backgroundColor: "transparent",
                          textDecoration: "underline",
                        },
                      }}
                    >
                      Clear Type Filters
                    </Button>
                  )}
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                  {availableTypes.map((type) => (
                    <Chip
                      key={type}
                      label={type}
                      clickable
                      color={typeFilters.includes(type) ? "primary" : "default"}
                      variant={
                        typeFilters.includes(type) ? "filled" : "outlined"
                      }
                      onClick={() => handleTypeFilterToggle(type)}
                      sx={{
                        fontFamily: "'Bookman Old Style', serif",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        borderRadius: "4px",
                        "& .MuiChip-label": {
                          px: 1.5,
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Tab navigation */}
      <Paper
        sx={{
          mb: 4,
          overflow: "hidden",
          borderRadius: 1,
          boxShadow: "0 3px 6px rgba(0,0,0,0.07)",
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 0,
            borderColor: "divider",
            "& .MuiTabs-indicator": {
              backgroundColor: tabIndex === 0 ? "#1976d2" : "#d32f2f",
              height: "3px",
            },
            "& .MuiTab-root": {
              fontFamily: "'Bookman Old Style', serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              py: 2,
              "&.Mui-selected": {
                color: tabIndex === 0 ? "#1976d2" : "#d32f2f",
              },
            },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CircleIcon
                  fontSize="small"
                  sx={{
                    color: "#10b981",
                    mr: 1,
                    fontSize: "0.75rem",
                  }}
                />
                {`ACTIVE EMPLOYEES (${activeEmployees.length})`}
              </Box>
            }
            sx={{
              fontWeight: 600,
              "&.Mui-selected": {
                backgroundColor: alpha(
                  tabIndex === 0 ? "#1976d2" : "#d32f2f",
                  0.08
                ),
              },
            }}
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CircleIcon
                  fontSize="small"
                  sx={{
                    color: "#ef4444",
                    mr: 1,
                    fontSize: "0.75rem",
                  }}
                />
                {`INACTIVE EMPLOYEES (${inactiveEmployees.length})`}
              </Box>
            }
            sx={{
              fontWeight: 600,
              "&.Mui-selected": {
                backgroundColor: alpha(
                  tabIndex === 0 ? "#1976d2" : "#d32f2f",
                  0.08
                ),
              },
            }}
          />
        </Tabs>
      </Paper>

      {tabIndex === 0 && (
        <EmployeeTable
          employees={activeEmployees}
          title="Active Employees"
          tabIndex={tabIndex}
          onToggleStatus={handleToggleStatus}
        />
      )}
      {tabIndex === 1 && (
        <EmployeeTable
          employees={inactiveEmployees}
          title="Inactive Employees"
          tabIndex={tabIndex}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </Container>
  );
};

export default Master;
