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
  SimpleGrid,
} from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
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
      fiscal2024Total
      fiscal2025Total
      allPreviousAdjustments
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
  allPreviousAdjustments: number;
  grandTotal: number;
  fiscal2024Total: number;
  fiscal2025Total: number;
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

const InvoiceSummaryDashboard = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [planFilter, setPlanFilter] = useState<"ALL" | "UHC" | "UHG">("ALL");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>("ALL");

  const itemsPerPage = 10;

  const { data, loading, error } = useQuery<{ getInvoiceData: InvoiceData[] }>(
    GET_INVOICE_DATA,
    { fetchPolicy: "cache-first" }
  );

  const allFiscalYears = useMemo(() => {
    if (!data?.getInvoiceData) return [];
    let yearsSet = new Set<number>();
    for (const item of data.getInvoiceData) {
      const idx = monthOrder.indexOf(item.month);
      if (idx >= 9) {
        // OCT(9) - DEC(11) belongs to the next fiscal year
        yearsSet.add(item.year);
        yearsSet.add(item.year + 1);
      } else {
        yearsSet.add(item.year);
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [data?.getInvoiceData]);

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
        // If month is OCT - DEC, it's the next fiscal year
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
      {
        month: string;
        year: number;
        uhcPlans: InvoiceData[];
        uhgPlans: InvoiceData[];
      }
    > = {};
    for (const item of filteredData) {
      const key = `${item.month}-${item.year}`;
      if (!acc[key]) {
        acc[key] = {
          month: item.month,
          year: item.year,
          uhcPlans: [],
          uhgPlans: [],
        };
      }
      if (item.planType.startsWith("UHC")) {
        acc[key].uhcPlans.push(item);
      } else {
        acc[key].uhgPlans.push(item);
      }
    }
    return acc;
  }, [filteredData]);

  const sortedMonths = useMemo(() => {
    return Object.entries(groupedByMonthYear).sort(([keyA], [keyB]) => {
      const [mA, yA] = keyA.split("-");
      const [mB, yB] = keyB.split("-");
      const yearA = parseInt(yA, 10);
      const yearB = parseInt(yB, 10);
      if (yearA !== yearB) return yearB - yearA;
      return monthOrder.indexOf(mB) - monthOrder.indexOf(mA);
    });
  }, [groupedByMonthYear]);

  const totalPages = Math.ceil(sortedMonths.length / itemsPerPage);
  const currentItems = useMemo(() => {
    return sortedMonths.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
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

  /** Utility: calculate totals for a group of plans. */
  const calculateGroupTotals = (plans: InvoiceData[]) => {
    return plans.reduce(
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
  };

  /** Format currency with optional red color for negative values. */
  const formatAmount = (amount: number) => {
    const val = Math.abs(amount);
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);
    return (
      <Text fw={500} c={amount < 0 ? "red" : "inherit"}>
        {amount < 0 ? `-${formatted}` : formatted}
      </Text>
    );
  };

  /** Badge color based on plan type. */
  const getPlanBadgeColor = (planType: string) => {
    if (planType === "UHC-2000") return "blue";
    if (planType === "UHC-3000") return "green";
    if (planType === "UHG-LIFE") return "violet";
    if (planType === "UHG-VISION") return "cyan";
    if (planType === "UHG-DENTAL") return "indigo";
    return "gray";
  };

  /** Clean up plan type text, e.g. "UHC-3000" => "UHC 3000", "UHG-LIFE" => "LIFE". */
  const formatPlanType = (planType: string) => {
    if (planType.startsWith("UHG-")) {
      return planType.split("-")[1];
    }
    return planType.replace(/([A-Z])(\d)/g, "$1 $2");
  };

  /**
   * Renders a table for each month/year group:
   *   - One <thead> row (4 columns)
   *   - One <tbody> row that spans all columns & holds the <Accordion>.
   */
  const renderMonthData = (monthKey: string, group: any) => {
    const uhcTotals = calculateGroupTotals(group.uhcPlans);
    const uhgTotals = calculateGroupTotals(group.uhgPlans);

    return (
      <Table style={{ tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ width: "30%", textAlign: "center" }}>Plan Type</th>
            <th style={{ width: "23.33%", textAlign: "center" }}>
              Previous Months Adjustments
            </th>
            <th style={{ width: "23.33%", textAlign: "center" }}>
              Current Month Amount
            </th>
            <th style={{ width: "23.33%", textAlign: "center" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ border: "none" }}>
            {/* Make sure to remove default padding on the <td> as well */}
            <td colSpan={4} style={{ padding: 0, margin: 0, border: "none" }}>
              <Accordion variant="contained" multiple>
                {/* UHC Item */}
                {group.uhcPlans.length > 0 && (
                  <Accordion.Item value={`${monthKey}-uhc`}>
                    <Accordion.Control style={{ padding: 0 }}>
                      {/* UHC summary row */}
                      <Table
                        style={{
                          tableLayout: "fixed",
                          width: "100%",
                          border: "none",
                          margin: 0,
                        }}
                      >
                        <tbody>
                          <tr style={{ border: "none" }}>
                            <td
                              style={{
                                width: "30%",
                                textAlign: "center",
                                padding: "0.5rem",
                                border: "none",
                              }}
                            >
                              <Text fw={700}>UHC</Text>
                            </td>
                            <td
                              style={{
                                width: "23.33%",
                                textAlign: "center",
                                padding: "0.5rem",
                                border: "none",
                              }}
                            >
                              {formatAmount(uhcTotals.allPreviousAdjustments)}
                            </td>
                            <td
                              style={{
                                width: "23.33%",
                                textAlign: "center",
                                padding: "0.5rem",
                                border: "none",
                              }}
                            >
                              {formatAmount(uhcTotals.currentMonthTotal)}
                            </td>
                            <td
                              style={{
                                width: "23.33%",
                                textAlign: "center",
                                padding: "0.5rem",
                                border: "none",
                              }}
                            >
                              {formatAmount(
                                uhcTotals.currentMonthTotal +
                                  uhcTotals.allPreviousAdjustments
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {/* UHC detailed plan rows */}
                      <Table
                        style={{
                          tableLayout: "fixed",
                          width: "100%",
                          margin: 0,
                        }}
                      >
                        <tbody>
                          {group.uhcPlans.map(
                            (plan: InvoiceData, idx: number) => (
                              <tr
                                key={`${monthKey}-uhc-${plan.planType}-${idx}`}
                              >
                                <td
                                  style={{
                                    width: "30%",
                                    textAlign: "center",
                                    padding: "0.5rem",
                                  }}
                                >
                                  <Badge
                                    color={getPlanBadgeColor(plan.planType)}
                                    variant="light"
                                    size="lg"
                                  >
                                    {formatPlanType(plan.planType)}
                                  </Badge>
                                </td>
                                <td
                                  style={{
                                    width: "23.33%",
                                    textAlign: "center",
                                    padding: "0.5rem",
                                  }}
                                >
                                  {formatAmount(plan.allPreviousAdjustments)}
                                </td>
                                <td
                                  style={{
                                    width: "23.33%",
                                    textAlign: "center",
                                    padding: "0.5rem",
                                  }}
                                >
                                  {formatAmount(plan.currentMonthTotal)}
                                </td>
                                <td
                                  style={{
                                    width: "23.33%",
                                    textAlign: "center",
                                    padding: "0.5rem",
                                  }}
                                >
                                  {formatAmount(
                                    plan.currentMonthTotal +
                                      plan.allPreviousAdjustments
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </Table>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}

                {/* UHG Item */}
                {group.uhgPlans.length > 0 && (
                  <Accordion.Item value={`${monthKey}-uhg`}>
                    <Accordion.Control style={{ padding: 0 }}>
                      {/* UHG summary row */}
                      <Table
                        style={{
                          tableLayout: "fixed",
                          width: "100%",
                          border: "none",
                          margin: 0,
                        }}
                      >
                        <tbody>
                          <tr style={{ border: "none" }}>
                            <td
                              style={{
                                width: "30%",
                                textAlign: "center",
                                padding: "0.5rem",
                                border: "none",
                              }}
                            >
                              <Text fw={700}>UHG</Text>
                            </td>
                            <td
                              style={{
                                width: "23.33%",
                                textAlign: "center",
                                padding: "0.5rem",
                                border: "none",
                              }}
                            >
                              {formatAmount(uhgTotals.allPreviousAdjustments)}
                            </td>
                            <td
                              style={{
                                width: "23.33%",
                                textAlign: "center",
                                padding: "0.5rem",
                                border: "none",
                              }}
                            >
                              {formatAmount(uhgTotals.currentMonthTotal)}
                            </td>
                            <td
                              style={{
                                width: "23.33%",
                                textAlign: "center",
                                padding: "0.5rem",
                                border: "none",
                              }}
                            >
                              {formatAmount(
                                uhgTotals.currentMonthTotal +
                                  uhgTotals.allPreviousAdjustments
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {/* UHG detailed plan rows */}
                      <Table
                        style={{
                          tableLayout: "fixed",
                          width: "100%",
                          margin: 0,
                        }}
                      >
                        <tbody>
                          {group.uhgPlans.map(
                            (plan: InvoiceData, idx: number) => (
                              <tr
                                key={`${monthKey}-uhg-${plan.planType}-${idx}`}
                              >
                                <td
                                  style={{
                                    width: "30%",
                                    textAlign: "center",
                                    padding: "0.5rem",
                                  }}
                                >
                                  <Badge
                                    color={getPlanBadgeColor(plan.planType)}
                                    variant="light"
                                    size="lg"
                                  >
                                    {formatPlanType(plan.planType)}
                                  </Badge>
                                </td>
                                <td
                                  style={{
                                    width: "23.33%",
                                    textAlign: "center",
                                    padding: "0.5rem",
                                  }}
                                >
                                  {formatAmount(plan.allPreviousAdjustments)}
                                </td>
                                <td
                                  style={{
                                    width: "23.33%",
                                    textAlign: "center",
                                    padding: "0.5rem",
                                  }}
                                >
                                  {formatAmount(plan.currentMonthTotal)}
                                </td>
                                <td
                                  style={{
                                    width: "23.33%",
                                    textAlign: "center",
                                    padding: "0.5rem",
                                  }}
                                >
                                  {formatAmount(
                                    plan.currentMonthTotal +
                                      plan.allPreviousAdjustments
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </Table>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
              </Accordion>
            </td>
          </tr>
        </tbody>
      </Table>
    );
  };

  const overallFilteredTotal = useMemo(() => {
    return currentItems.reduce((acc, [_, group]) => {
      const totals = calculateGroupTotals([
        ...group.uhcPlans,
        ...group.uhgPlans,
      ]);
      return acc + totals.grandTotal;
    }, 0);
  }, [currentItems]);

  let content;
  if (loading) {
    content = <LoadingSpinner />;
  } else if (error) {
    console.error("GraphQL Error:", error);
    content = <ErrorMessage message={error.message} />;
  } else if (!data?.getInvoiceData.length) {
    content = (
      <Card shadow="sm" p="lg" radius="md">
        <Text c="dimmed">No invoice data available. Please upload files.</Text>
      </Card>
    );
  } else {
    content = (
      <Stack>
        <SimpleGrid cols={3} mb="xl">
          <Card
            shadow="sm"
            p="xl"
            radius="md"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
              border: "none",
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
                style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}
              >
                {formatAmount(total2024)}
              </Text>
            </Stack>
          </Card>
          <Card
            shadow="sm"
            p="xl"
            radius="md"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
              border: "none",
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
                style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}
              >
                {formatAmount(total2025)}
              </Text>
            </Stack>
          </Card>
          <Card
            shadow="sm"
            p="xl"
            radius="md"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              border: "none",
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
                style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}
              >
                {formatAmount(overallTotal)}
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>
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
        {currentItems.length === 0 ? (
          <Card shadow="sm" p="lg" radius="md">
            <Text c="dimmed">
              No invoice data available for the selected filters.
            </Text>
          </Card>
        ) : (
          <>
            {/* Top-level accordion for each month-year */}
            <Accordion variant="contained" multiple>
              {currentItems.map(([key, group]) => (
                <Accordion.Item key={key} value={key}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={700} size="lg">
                        {group.month} {group.year}
                      </Text>
                      <Text fw={700} c="blue">
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
            <Box mt="xl">
              <Card
                p="lg"
                radius="md"
                style={{
                  background:
                    "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
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
                      OVERALL INVOICE TOTAL
                    </Text>
                    <Text
                      size="sm"
                      style={{ color: "rgba(255, 255, 255, 0.7)" }}
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
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                color="blue"
                size="lg"
                mt="xl"
              />
            )}
          </>
        )}
      </Stack>
    );
  }

  return (
    <MantineProvider>
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
