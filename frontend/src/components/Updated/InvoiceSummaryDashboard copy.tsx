import React, { useState, useMemo } from "react";
import { useQuery } from "@apollo/client";
import {
  Container,
  Card,
  Table,
  Text,
  Badge,
  Stack,
  Accordion,
  Group,
  Pagination,
  SegmentedControl,
  Box,
  MultiSelect,
  Select,
  MantineProvider,
} from "@mantine/core";
import { IconCalendar } from '@tabler/icons-react';
import { SimpleGrid } from '@mantine/core';
import { gql } from "@apollo/client";
import { LoadingSpinner } from "./shared/LoadingSpinner";
import "./InvoiceSummaryDashboard.css";
import { ErrorMessage } from "./shared/ErrorMessage";

const GET_INVOICE_DATA = gql`
  query GetInvoiceData {
    getInvoiceData {
      planType
      month
      year
      currentMonthTotal
      previousMonthsTotal
      grandTotal
    }
  }
`;

interface InvoiceData {
  planType: string;
  month: string;
  year: number;
  currentMonthTotal: number;
  previousMonthsTotal: number;
  grandTotal: number;
  coverage_dates: string;  // Add this field
}

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

/**
 * Check if a given item belongs to the specified fiscal year.
 * Fiscal year N = [Oct (N-1) .. Sep (N)].
 *
 * Example: isInFiscalYear(item, 2024)
 *  => item is from Oct 2023..Sep 2024
 */
function isInFiscalYear(item: InvoiceData, fiscalYear: number): boolean {
  const mIndex = monthOrder.indexOf(item.month);

  // For October's previous month adjustments, they belong to the previous fiscal year
  if (item.month === "OCT" && item.previousMonthsTotal !== 0) {
    return item.year === fiscalYear;  // October's adjustments go to the same calendar year's fiscal year
  }

  // Normal fiscal year logic
  if (item.year === fiscalYear - 1 && mIndex >= 9) {
    return true;  // Oct-Dec of previous year
  }
  if (item.year === fiscalYear && mIndex <= 8) {
    return true;  // Jan-Sep of current year
  }
  return false;
}

/**
 * Compute all possible "fiscal years" from the dataset.
 * For example, if data covers from 2023 to 2025, we might have
 * 2023 (which includes Oct 2022..Sep 2023),
 * 2024 (Oct 2023..Sep 2024),
 * 2025 (Oct 2024..Sep 2025), etc.
 *
 * This is optional; you can hardcode [2024,2025] if that's all you need.
 */
function getAllFiscalYears(data: InvoiceData[]): number[] {
  if (!data.length) return [];
  // Find min & max original year
  let minYear = Infinity;
  let maxYear = -Infinity;
  for (const item of data) {
    if (item.year < minYear) minYear = item.year;
    if (item.year > maxYear) maxYear = item.year;
  }
  // Because Oct of minYear-1 might be relevant,
  // we'll just guess you want fiscal years up to maxYear+1
  // Adjust as needed
  const result: number[] = [];
  for (let y = minYear; y <= maxYear + 1; y++) {
    result.push(y);
  }
  return result;
}

const InvoiceSummaryDashboard = () => {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [planFilter, setPlanFilter] = useState<"ALL" | "UHC" | "UHG">("ALL");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // This is the "fiscal year" the user picks from the dropdown
  // (not the original calendar year).
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>("ALL");

  const itemsPerPage = 10;

  const { data, loading, error } = useQuery<{ getInvoiceData: InvoiceData[] }>(
    GET_INVOICE_DATA,
    { fetchPolicy: "cache-first" }
  );

  // 1) Build an array of all possible fiscal years from the data
  const allFiscalYears = useMemo(() => {
    if (!data?.getInvoiceData) return [];
    return getAllFiscalYears(data.getInvoiceData).sort((a, b) => b - a);
  }, [data?.getInvoiceData]);

  // 2) Filter logic:
  //    - If user picks "ALL," we keep all items
  //    - Else we keep items that are in the chosen fiscal year
  //    - Also filter by plan & months
  const filteredData = useMemo(() => {
    if (!data?.getInvoiceData) return [];

    return data.getInvoiceData.filter((item) => {
      // a) Check if item is in the selected fiscal year
      let inYear = true;
      if (selectedFiscalYear !== "ALL") {
        const fy = parseInt(selectedFiscalYear, 10);
        inYear = isInFiscalYear(item, fy);
      }

      // b) Check plan filter
      let inPlan = planFilter === "ALL" || item.planType.startsWith(planFilter);

      // c) Check month filter
      let inMonths =
        selectedMonths.length === 0 || selectedMonths.includes(item.month);

      return inYear && inPlan && inMonths;
    });
  }, [data, selectedFiscalYear, planFilter, selectedMonths]);

  // 3) Group by original "month-year" so the Accordion name remains the same
  //    e.g. "OCT 2023"
  const groupedByMonthYear = useMemo(() => {
    const acc: Record<
      string,
      {
        month: string;
        year: number;
        uhcPlans: InvoiceData[];
        uhgPlans: InvoiceData[];
      }
    > = {};
    for (const item of filteredData) {
      // We'll use the literal "month-year" from the original data
      const groupKey = `${item.month}-${item.year}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          month: item.month,
          year: item.year,
          uhcPlans: [],
          uhgPlans: [],
        };
      }
      if (item.planType.startsWith("UHC")) {
        acc[groupKey].uhcPlans.push(item);
      } else {
        acc[groupKey].uhgPlans.push(item);
      }
    }
    return acc;
  }, [filteredData]);

  // 4) Sort descending by the original year, then by month index
  //    (So you'll see DEC 2024, NOV 2024, OCT 2024, SEP 2024, etc.)
  const sortedMonths = useMemo(() => {
    return Object.entries(groupedByMonthYear).sort(([keyA], [keyB]) => {
      const [monthA, yearA] = keyA.split("-");
      const [monthB, yearB] = keyB.split("-");
      if (yearA !== yearB) {
        return parseInt(yearB) - parseInt(yearA);
      }
      return monthOrder.indexOf(monthB) - monthOrder.indexOf(monthA);
    });
  }, [groupedByMonthYear]);

  // 5) Pagination
  const totalPages = Math.ceil(sortedMonths.length / itemsPerPage);
  const currentItems = sortedMonths.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summation
  function calculateGroupTotals(plans: InvoiceData[]) {
    return plans.reduce(
      (acc, curr) => ({
        previousMonthsTotal: acc.previousMonthsTotal + curr.previousMonthsTotal,
        currentMonthTotal: acc.currentMonthTotal + curr.currentMonthTotal,
        grandTotal: acc.grandTotal + curr.grandTotal,
      }),
      { previousMonthsTotal: 0, currentMonthTotal: 0, grandTotal: 0 }
    );
  }

  const formatAmount = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
    return (
      <Text
        component="div"
        fw={500}
        c={amount < 0 ? "red" : "inherit"}
        style={{ position: "relative" }}
      >
        {amount < 0 ? `-${formatted}` : formatted}
      </Text>
    );
  };

  const getPlanBadgeColor = (planType: string) => {
    if (planType === "UHC-2000") return "blue";
    if (planType === "UHC-3000") return "green";
    if (planType === "UHG-LIFE") return "violet";
    if (planType === "UHG-VISION") return "cyan";
    if (planType === "UHG-DENTAL") return "indigo";
    return "gray";
  };

  const formatPlanType = (planType: string) => {
    if (planType.startsWith("UHG-")) {
      return planType.split("-")[1];
    }
    return planType.replace(/([A-Z])(\d)/g, "$1 $2");
  };

  // 6) Render the data for a single month-year group
  const renderMonthData = (monthKey: string, group: any) => {
    const uhcTotals = calculateGroupTotals(group.uhcPlans);
    const uhgTotals = calculateGroupTotals(group.uhgPlans);

    const cellStyle = { padding: "0.5rem", textAlign: "center" } as const;
    const headerLabelStyle = {
      flex: "0 0 20%",
      textAlign: "left",
      paddingLeft: "2rem",
      marginRight: "1.5rem",
    } as const;
    const headerValueStyle = {
      flex: "1",
      textAlign: "center",
      minWidth: "20%",
    } as const;

    return (
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-evenly",
            }}
          >
            <Table.Th style={cellStyle}>Plan Type</Table.Th>
            <Table.Th style={cellStyle}>Previous Months Adjustments</Table.Th>
            <Table.Th style={cellStyle}>Current Month Amount</Table.Th>
            <Table.Th style={cellStyle}>Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td colSpan={4}>
              <Accordion variant="contained" multiple>
                {group.uhcPlans.length > 0 && (
                  <Accordion.Item value={`${monthKey}-uhc`}>
                    <Accordion.Control
                      aria-label={`Toggle UHC details for ${monthKey}`}
                    >
                      <Group
                        style={{ width: "100%", paddingLeft: "3.5rem" }}
                        wrap="wrap"
                      >
                        <Text component="div" fw={700} style={headerLabelStyle}>
                          UHC
                        </Text>
                        <div style={headerValueStyle}>
                          {formatAmount(uhcTotals.previousMonthsTotal)}
                        </div>
                        <div style={headerValueStyle}>
                          {formatAmount(uhcTotals.currentMonthTotal)}
                        </div>
                        <div style={headerValueStyle}>
                          {formatAmount(uhcTotals.grandTotal)}
                        </div>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Table className="invoice-summary-table">
                        <Table.Tbody>
                          {group.uhcPlans.map(
                            (plan: InvoiceData, idx: number) => (
                              <Table.Tr
                                key={`${monthKey}-uhc-${plan.planType}-${idx}`}
                              >
                                <Table.Td style={cellStyle}>
                                  <Badge
                                    color={getPlanBadgeColor(plan.planType)}
                                    variant="light"
                                    size="lg"
                                  >
                                    {formatPlanType(plan.planType)}
                                  </Badge>
                                </Table.Td>
                                <Table.Td style={cellStyle}>
                                  {formatAmount(plan.previousMonthsTotal)}
                                </Table.Td>
                                <Table.Td style={cellStyle}>
                                  {formatAmount(plan.currentMonthTotal)}
                                </Table.Td>
                                <Table.Td style={cellStyle}>
                                  {formatAmount(plan.grandTotal)}
                                </Table.Td>
                              </Table.Tr>
                            )
                          )}
                        </Table.Tbody>
                      </Table>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}

                {group.uhgPlans.length > 0 && (
                  <Accordion.Item value={`${monthKey}-uhg`}>
                    <Accordion.Control
                      aria-label={`Toggle UHG details for ${monthKey}`}
                    >
                      <Group
                        style={{ width: "100%", paddingLeft: "3.5rem" }}
                        wrap="wrap"
                      >
                        <Text component="div" fw={700} style={headerLabelStyle}>
                          UHG
                        </Text>
                        <div style={headerValueStyle}>
                          {formatAmount(uhgTotals.previousMonthsTotal)}
                        </div>
                        <div style={headerValueStyle}>
                          {formatAmount(uhgTotals.currentMonthTotal)}
                        </div>
                        <div style={headerValueStyle}>
                          {formatAmount(uhgTotals.grandTotal)}
                        </div>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Table className="invoice-summary-table">
                        <Table.Tbody>
                          {group.uhgPlans.map(
                            (plan: InvoiceData, idx: number) => (
                              <Table.Tr
                                key={`${monthKey}-uhg-${plan.planType}-${idx}`}
                              >
                                <Table.Td style={cellStyle}>
                                  <Badge
                                    color={getPlanBadgeColor(plan.planType)}
                                    variant="light"
                                    size="lg"
                                  >
                                    {formatPlanType(plan.planType)}
                                  </Badge>
                                </Table.Td>
                                <Table.Td style={cellStyle}>
                                  {formatAmount(plan.previousMonthsTotal)}
                                </Table.Td>
                                <Table.Td style={cellStyle}>
                                  {formatAmount(plan.currentMonthTotal)}
                                </Table.Td>
                                <Table.Td style={cellStyle}>
                                  {formatAmount(plan.grandTotal)}
                                </Table.Td>
                              </Table.Tr>
                            )
                          )}
                        </Table.Tbody>
                      </Table>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
              </Accordion>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    );
  };

  // 7) For the top boxes labeled "2024, 2025, TOTAL", we can do a sum of the entire dataset
  //    by each fiscal year. If you only need 2024 & 2025, you can just compute those two.
  //    Otherwise, you can do it more dynamically.
  //    Example: sum everything that isInFiscalYear(item, 2024) => total2024
// Replace the existing fiscal year calculation with this:
// Function to determine fiscal year based on coverage dates
const getFiscalYear = (coverageDates: string, invoiceYear: number): number => {
  // Parse coverage date
  if (coverageDates) {
    const startDate = coverageDates.split('-')[0].trim();
    const [month, _, year] = startDate.split('/').map(x => parseInt(x));
    
    // Check if coverage year matches invoice year
    if (!isNaN(year) && !isNaN(month) && year === invoiceYear) {
      // If month is before October, goes to previous fiscal year
      if (month < 10) {
        return invoiceYear;
      }
      // If month is October or later, goes to next fiscal year
      return invoiceYear + 1;
    }
  }
  
  // Default to invoice year if we can't determine
  return invoiceYear;
};

// Calculate fiscal year totals
const fiscalYearTotals = useMemo(() => {
  const totals = {
    2024: 0,
    2025: 0
  };
  
  if (data?.getInvoiceData) {
    for (const item of data.getInvoiceData) {
      // Get fiscal year based on coverage dates and invoice year
      const fiscalYear = getFiscalYear(item.coverage_dates, item.year);
      
      // Add both current charges and adjustments to the determined fiscal year
      totals[fiscalYear] = (totals[fiscalYear] || 0) + item.currentMonthTotal + item.previousMonthsTotal;
    }
  }
  
  return totals;
}, [data]);

// Calculate totals for easy reference
const total2024 = fiscalYearTotals[2024] || 0;
const total2025 = fiscalYearTotals[2025] || 0;
const overallTotal = total2024 + total2025;

  // 8) Summation of the *currently displayed page* items
  const overallFilteredTotal = useMemo(() => {
    return currentItems.reduce((acc, [_, group]) => {
      const totals = calculateGroupTotals([
        ...group.uhcPlans,
        ...group.uhgPlans,
      ]);
      return acc + totals.grandTotal;
    }, 0);
  }, [currentItems]);

  // Final content
  let content;
  if (loading) {
    content = <LoadingSpinner />;
  } else if (error) {
    console.error("GraphQL Error:", error);
    content = <ErrorMessage message={error.message} />;
  } else if (!data?.getInvoiceData.length) {
    content = (
      <Card shadow="sm" p="lg" radius="md">
        <Text component="div" c="dimmed">
          No invoice data available. Please upload files through the Datasets
          tab.
        </Text>
      </Card>
    );
  } else {
    content = (
      <Stack>
{/* Fiscal Year Summary Cards */}
<SimpleGrid cols={3} mb="xl">
  {/* FY2024 Card */}
  <Card 
    shadow="sm" 
    p="xl" 
    radius="md"
    style={{
      background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      border: 'none'
    }}
  >
    <Stack gap="xs">
      <Group align="center" gap="xs">
        <IconCalendar size={24} color="white" />
        <Text size="xl" fw={500} c="white">
          Fiscal Year 2024
        </Text>
      </Group>
      <Text size="sm" c="gray.3">
        OCT 2023 - SEP 2024
      </Text>
      <Text 
        size="28px" 
        fw={700} 
        c="white"
        mt="md"
        style={{
          fontFamily: 'monospace',
          letterSpacing: '0.5px'
        }}
      >
        {formatAmount(total2024)}
      </Text>
    </Stack>
  </Card>

  {/* FY2025 Card */}
  <Card 
    shadow="sm" 
    p="xl" 
    radius="md"
    style={{
      background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      border: 'none'
    }}
  >
    <Stack gap="xs">
      <Group align="center" gap="xs">
        <IconCalendar size={24} color="white" />
        <Text size="xl" fw={500} c="white">
          Fiscal Year 2025
        </Text>
      </Group>
      <Text size="sm" c="gray.3">
        OCT 2024 - SEP 2025
      </Text>
      <Text 
        size="28px" 
        fw={700} 
        c="white"
        mt="md"
        style={{
          fontFamily: 'monospace',
          letterSpacing: '0.5px'
        }}
      >
        {formatAmount(total2025)}
      </Text>
    </Stack>
  </Card>

  {/* Combined Total Card */}
  <Card 
    shadow="sm" 
    p="xl" 
    radius="md"
    style={{
      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      border: 'none'
    }}
  >
    <Stack gap="xs">
      <Group align="center" gap="xs">
        <IconCalendar size={24} color="white" />
        <Text size="xl" fw={500} c="white">
          Combined Total
        </Text>
      </Group>
      <Text size="sm" c="gray.3">
        All Fiscal Years
      </Text>
      <Text 
        size="28px" 
        fw={700} 
        c="white"
        mt="md"
        style={{
          fontFamily: 'monospace',
          letterSpacing: '0.5px'
        }}
      >
        {formatAmount(overallTotal)}
      </Text>
    </Stack>
  </Card>
</SimpleGrid>
    
        {/* FILTERS */}
        <div
          className="filter-container"
          style={{ display: "flex", justifyContent: "flex-start" }}
        >
          <Group gap="md" align="flex-end">
            <SegmentedControl
              value={planFilter}
              onChange={(value: string) => {
                setPlanFilter(value as "ALL" | "UHC" | "UHG");
                setCurrentPage(1);
              }}
              data={[
                { label: "All Plans", value: "ALL" },
                { label: "UHC Only", value: "UHC" },
                { label: "UHG Only", value: "UHG" },
              ]}
              aria-label="Filter plans"
            />
    
            <MultiSelect
              label="Month(s)"
              data={monthOrder.map((m) => ({ value: m, label: m }))}
              placeholder="Select one or more months"
              value={selectedMonths}
              onChange={(val) => {
                setSelectedMonths(val);
                setCurrentPage(1);
              }}
              clearable
              nothingFound="No months found"
            />
    
            <Select
              label="Year (Fiscal)"
              data={[
                { value: "ALL", label: "All Years" },
                ...allFiscalYears.map((fy) => ({
                  value: fy.toString(),
                  label: fy.toString(),
                })),
              ]}
              value={selectedFiscalYear}
              onChange={(val) => {
                setSelectedFiscalYear(val || "ALL");
                setCurrentPage(1);
              }}
              placeholder="Select year"
              clearable={false}
            />
          </Group>
        </div>
    
        {/* ACCORDION */}
        {currentItems.length === 0 ? (
          <Card shadow="sm" p="lg" radius="md">
            <Text component="div" c="dimmed">
              No invoice data available for the selected filters.
            </Text>
          </Card>
        ) : (
          <>
            <Accordion variant="contained" multiple>
              {currentItems.map(([key, group]) => (
                <Accordion.Item key={key} value={key}>
                  <Accordion.Control aria-label={`Toggle ${key} details`}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text component="div" fw={700} size="lg">
                        {group.month} {group.year}
                      </Text>
                      <Text component="div" fw={700} c="blue">
                        {formatAmount(
                          calculateGroupTotals([
                            ...group.uhcPlans,
                            ...group.uhgPlans,
                          ]).grandTotal
                        )}
                      </Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {renderMonthData(key, group)}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
    
            {/* OVERALL FILTERED TOTAL */}
            <Box mt="xl">
              <Card
                p="lg"
                radius="md"
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
                  border: "none",
                  transition: "transform 0.2s ease",
                  cursor: "default",
                }}
                className="total-section"
              >
                <Group position="apart" py="md">
                  <Stack spacing={2}>
                    <Text
                      size="xl"
                      fw={700}
                      style={{
                        color: "rgba(255, 255, 255, 0.9)",
                        letterSpacing: "0.5px",
                      }}
                    >
                      OVERALL INVOICE TOTAL
                    </Text>
                    <Text
                      size="sm"
                      style={{
                        color: "rgba(255, 255, 255, 0.7)",
                      }}
                    >
                      {selectedMonths.length > 0
                        ? `Months: ${selectedMonths.join(", ")} `
                        : "All Months "}
                      {selectedFiscalYear !== "ALL"
                        ? `| Fiscal Year: ${selectedFiscalYear}`
                        : ""}
                    </Text>
                  </Stack>
                  <Box
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "1rem 1.5rem",
                      borderRadius: "0.75rem",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 0.25rem 0.375rem rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <Text
                      size="28px"
                      fw={700}
                      style={{
                        color: "white",
                        fontFamily: "monospace",
                        letterSpacing: "0.5px",
                        textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                      }}
                      component="div"
                    >
                      {formatAmount(overallFilteredTotal)}
                    </Text>
                  </Box>
                </Group>
              </Card>
            </Box>
    
            {/* PAGINATION */}
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                color="blue"
                size="lg"
                mt="xl"
                aria-label="Invoice pagination"
              />
            )}
          </>
        )}
      </Stack>
    );
  }

  return (
    <MantineProvider
      theme={{ colorScheme: "dark" }}
      withGlobalStyles
      withNormalizeCSS
    >
      <Container fluid>
        <Box mb="lg">
          <Text
            component="h1"
            style={{
              fontSize: "1.8rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            MEDICAL INSURANCE INVOICE SUMMARY
          </Text>
        </Box>
        <Card shadow="sm" p="lg" radius="md">
          {content}
        </Card>
      </Container>
    </MantineProvider>
  );
};

export default InvoiceSummaryDashboard;
