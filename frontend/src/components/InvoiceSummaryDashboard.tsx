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
  const itemsPerPage = 10;

  const { data, loading, error } = useQuery<{ getInvoiceData: InvoiceData[] }>(
    GET_INVOICE_DATA,
    { fetchPolicy: "cache-first" }
  );

  const groupedByMonth = useMemo(() => {
    if (!data?.getInvoiceData) return {};

    const filteredData = data.getInvoiceData.filter((item) => {
      if (planFilter === "ALL") return true;
      return item.planType.startsWith(planFilter);
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

  const monthOrder = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const sortedMonths = useMemo(() => {
    return Object.entries(groupedByMonth).sort(([keyA], [keyB]) => {
      const [monthA, yearA] = keyA.split("-");
      const [monthB, yearB] = keyB.split("-");
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
      return monthOrder.indexOf(monthB) - monthOrder.indexOf(monthA);
    });
  }, [groupedByMonth]);

  const totalPages = useMemo(
    () => Math.ceil(sortedMonths.length / itemsPerPage),
    [sortedMonths, itemsPerPage]
  );

  const currentItems = useMemo(() => {
    return sortedMonths.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedMonths, currentPage, itemsPerPage]);

  const cellStyle = { padding: "8px", textAlign: "center" } as const;

  const formatAmount = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));

    return (
      <Text component="div" fw={500} c={amount < 0 ? "red" : "inherit"}>
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

    const headerLabelStyle = { flex: "0 0 20%", textAlign: "left" } as const;
    const headerValueStyle = { flex: "1", textAlign: "center" } as const;

    return (
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
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
                      <Group style={{ width: "100%" }} wrap="wrap">
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
                      <Group style={{ width: "100%" }} wrap="wrap">
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
    return sortedMonths.reduce(
      (acc, [_, monthData]) => {
        const totals = calculateGroupTotals([
          ...monthData.uhcPlans,
          ...monthData.uhgPlans,
        ]);
        return { grandTotal: acc.grandTotal + totals.grandTotal };
      },
      { grandTotal: 0 }
    );
  }, [sortedMonths]);

  const renderTotalSection = (total: number) => (
    <Box mt="xl">
      <Card
        p="lg"
        radius="md"
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          border: 'none',
          transition: 'transform 0.2s ease',
          cursor: 'default',
        }}
        className="total-section"
      >
        <Group position="apart" py="md">
          <Stack spacing={2}>
            <Text
              size="xl"
              weight={700}
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px'
              }}
            >
              Overall Invoice Total
            </Text>
            <Text
              size="sm"
              style={{
                color: 'rgba(255, 255, 255, 0.7)'
              }}
            >
              All months combined
            </Text>
          </Stack>
          <Box
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '16px 24px',
              borderRadius: '12px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Text
              size="28px"
              weight={700}
              style={{
                color: 'white',
                fontFamily: 'monospace',
                letterSpacing: '0.5px',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
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
          No invoice data available. Please upload files through the Datasets tab.
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
            styles={{
              root: { minWidth: 400 },
              label: { fontSize: "1rem" },
              indicator: {
                backgroundColor: "#228be6",
                height: "38px",
                borderRadius: "8px",
              },
            }}
          />
        </div>

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

        {/* Enhanced Total Section */}
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
      </Stack>
    );
  }

  return (
    <Container size="xl">
      <Card shadow="sm" p="lg" radius="md">
        {content}
      </Card>
    </Container>
  );
};

export default InvoiceSummaryDashboard;