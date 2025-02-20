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
  Select,
  MantineProvider,
} from "@mantine/core";
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
}

const InvoiceSummaryDashboard = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [planFilter, setPlanFilter] = useState<"ALL" | "UHC" | "UHG">("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const itemsPerPage = 10;

  const { data, loading, error } = useQuery<{ getInvoiceData: InvoiceData[] }>(
    GET_INVOICE_DATA,
    { fetchPolicy: "cache-first" }
  );

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

  const availableYears = useMemo(() => {
    if (!data?.getInvoiceData) return [];
    const years = new Set(
      data.getInvoiceData.map((item) => item.year.toString())
    );
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [data?.getInvoiceData]);

  const groupedByMonth = useMemo(() => {
    if (!data?.getInvoiceData) return {};

    const filteredData = data.getInvoiceData.filter((item) => {
      if (planFilter !== "ALL" && !item.planType.startsWith(planFilter))
        return false;
      return true;
    });

    return filteredData.reduce(
      (acc: Record<string, any>, item: InvoiceData) => {
        const monthKey = `${item.month}-${item.year}`;
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: item.month,
            year: item.year,
            uhcPlans: [],
            uhgPlans: [],
          };
        }
        if (item.planType.startsWith("UHC")) {
          acc[monthKey].uhcPlans.push(item);
        } else if (item.planType.startsWith("UHG")) {
          acc[monthKey].uhgPlans.push(item);
        }
        return acc;
      },
      {}
    );
  }, [data, planFilter]);

  const sortedMonths = useMemo(() => {
    return Object.entries(groupedByMonth).sort(([keyA], [keyB]) => {
      const [monthA, yearA] = keyA.split("-");
      const [monthB, yearB] = keyB.split("-");
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
      return monthOrder.indexOf(monthB) - monthOrder.indexOf(monthA);
    });
  }, [groupedByMonth]);

  const filteredSortedMonths = useMemo(() => {
    return sortedMonths.filter(([key]) => {
      const [month, year] = key.split("-");
      const monthMatch = selectedMonth === "ALL" || month === selectedMonth;
      const yearMatch = selectedYear === "ALL" || year === selectedYear;
      return monthMatch && yearMatch;
    });
  }, [sortedMonths, selectedMonth, selectedYear]);

  const totalPages = Math.ceil(filteredSortedMonths.length / itemsPerPage);
  const currentItems = filteredSortedMonths.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Updated cell styles using rem units
  const cellStyle = { padding: "0.5rem", textAlign: "center" } as const;
  const leftAlignCellStyle = { padding: "0.5rem", textAlign: "left" } as const;

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

  const calculateGroupTotals = (plans: InvoiceData[]) => {
    return plans.reduce(
      (acc, curr) => ({
        previousMonthsTotal: acc.previousMonthsTotal + curr.previousMonthsTotal,
        currentMonthTotal: acc.currentMonthTotal + curr.currentMonthTotal,
        grandTotal: acc.grandTotal + curr.grandTotal,
      }),
      { previousMonthsTotal: 0, currentMonthTotal: 0, grandTotal: 0 }
    );
  };

  const renderMonthData = (monthKey: string, monthData: any) => {
    const uhcTotals = calculateGroupTotals(monthData.uhcPlans);
    const uhgTotals = calculateGroupTotals(monthData.uhgPlans);

    const headerLabelStyle = {
      flex: "0 0 20%",
      textAlign: "left",
      paddingLeft: "2rem", // changed from 32px to 2rem
      marginRight: "1.5rem", // changed from 24px to 1.5rem
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
            data-with-row-border="true"
            data-hover="true"
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
                {monthData.uhcPlans.length > 0 && planFilter !== "UHG" && (
                  <Accordion.Item value={`${monthKey}-uhc`}>
                    <Accordion.Control
                      aria-label={`Toggle UHC details for ${monthKey}`}
                    >
                      <Group
                        style={{ width: "100%", paddingLeft: "3.5rem" }} // changed from 57px to 3.5rem
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
                          {monthData.uhcPlans.map(
                            (plan: InvoiceData, index: number) => (
                              <Table.Tr
                                key={`${monthKey}-uhc-${plan.planType}-${index}`}
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
                {monthData.uhgPlans.length > 0 && planFilter !== "UHC" && (
                  <Accordion.Item value={`${monthKey}-uhg`}>
                    <Accordion.Control
                      aria-label={`Toggle UHG details for ${monthKey}`}
                    >
                      <Group
                        style={{ width: "100%", paddingLeft: "3.5rem" }} // changed from 57px to 3.5rem
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
                          {monthData.uhgPlans.map(
                            (plan: InvoiceData, index: number) => (
                              <Table.Tr
                                key={`${monthKey}-uhg-${plan.planType}-${index}`}
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

  const overallTotals = useMemo(() => {
    return filteredSortedMonths.reduce(
      (acc, [_, monthData]) => {
        const totals = calculateGroupTotals([
          ...monthData.uhcPlans,
          ...monthData.uhgPlans,
        ]);
        return { grandTotal: acc.grandTotal + totals.grandTotal };
      },
      { grandTotal: 0 }
    );
  }, [filteredSortedMonths]);

  const renderTotalSection = (total: number) => (
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
        <Group justify="space-between" py="md">
          <Stack gap={2}>
            <Text
              size="xl"
              fw={700}
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                letterSpacing: "0.5px",
              }}
            >
              Overall Invoice Total
            </Text>
            <Text
              size="sm"
              style={{
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              {selectedMonth !== "ALL" && `${selectedMonth} `}
              {selectedYear !== "ALL" && `${selectedYear} `}
              {selectedMonth === "ALL" && selectedYear === "ALL" && "All Time "}
              Totals
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
              {formatAmount(total)}
            </Text>
          </Box>
        </Group>
      </Card>
    </Box>
  );

  let content;
  if (loading) {
    content = <LoadingSpinner />;
  } else if (error) {
    console.error("GraphQL Error:", error);
    content = <ErrorMessage message={error.message} />;
  } else if (!data?.getInvoiceData || data.getInvoiceData.length === 0) {
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
        <div className="filter-container">
          <Text component="h2" className="filter-title">
            Insurance Invoice Summary
          </Text>
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
            <Select
              label="Month"
              data={[
                { value: "ALL", label: "All Months" },
                ...monthOrder.map((month) => ({ value: month, label: month })),
              ]}
              value={selectedMonth}
              onChange={(value) => {
                setSelectedMonth(value || "ALL");
                setCurrentPage(1);
              }}
              placeholder="Select month"
              clearable={false}
            />
            <Select
              label="Year"
              data={[
                { value: "ALL", label: "All Years" },
                ...availableYears.map((year) => ({ value: year, label: year })),
              ]}
              value={selectedYear}
              onChange={(value) => {
                setSelectedYear(value || "ALL");
                setCurrentPage(1);
              }}
              placeholder="Select year"
              clearable={false}
            />
          </Group>
        </div>

        {currentItems.length === 0 ? (
          <Card shadow="sm" p="lg" radius="md">
            <Text component="div" c="dimmed">
              No invoice data available for the selected filters.
            </Text>
          </Card>
        ) : (
          <>
            <Accordion variant="contained" multiple>
              {currentItems.map(([monthKey, monthData]) => (
                <Accordion.Item key={monthKey} value={monthKey}>
                  <Accordion.Control aria-label={`Toggle ${monthKey} details`}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text component="div" fw={700} size="lg">
                        {monthData.month} {monthData.year}
                      </Text>
                      <Text component="div" fw={700} c="blue">
                        {formatAmount(
                          calculateGroupTotals([
                            ...monthData.uhcPlans,
                            ...monthData.uhgPlans,
                          ]).grandTotal
                        )}
                      </Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {renderMonthData(monthKey, monthData)}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>

            {renderTotalSection(overallTotals.grandTotal)}

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
      {/* Make sure your index.html includes a meta viewport tag:
          <meta name="viewport" content="width=device-width, initial-scale=1" />
      */}
      <Container fluid>
        <Card shadow="sm" p="lg" radius="md">
          {content}
        </Card>
      </Container>
    </MantineProvider>
  );
};

export default InvoiceSummaryDashboard;
