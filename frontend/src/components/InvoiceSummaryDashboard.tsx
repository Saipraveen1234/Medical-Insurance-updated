import { useState, useMemo } from "react";
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
  // State for controlling the outer accordion (single expansion)
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  const itemsPerPage = 10;

  const { data, loading, error } = useQuery<{ getInvoiceData: InvoiceData[] }>(
    GET_INVOICE_DATA,
    { fetchPolicy: "cache-and-network" }
  );

  const allFiscalYears = useMemo(() => {
    if (!data?.getInvoiceData) return [];
    let yearsSet = new Set<number>();
    for (const item of data.getInvoiceData) {
      const idx = monthOrder.indexOf(item.month);
      if (idx >= 9) {
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

  // Updated nested accordion – removed "multiple" so only one nested panel is open at a time.
  const renderMonthData = (monthKey: string, group: any) => {
    const uhcTotals = calculateGroupTotals(group.uhcPlans);
    const uhgTotals = calculateGroupTotals(group.uhgPlans);

    return (
      <Table className="fixed-table">
        <thead>
          <tr>
            <th className="col-plan-type">Plan Type</th>
            <th className="col-adjustments">Previous Months Adjustments</th>
            <th className="col-current-month">Current Month Amount</th>
            <th className="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="no-border">
            <td colSpan={4} className="no-border">
              <Accordion variant="contained">
                {group.uhcPlans.length > 0 && (
                  <Accordion.Item value={`${monthKey}-uhc`}>
                    <Accordion.Control className="no-padding">
                      <Table className="summary-table">
                        <tbody>
                          <tr className="no-border">
                            <td className="col-plan-type">
                              <Text fw={700}>UHC</Text>
                            </td>
                            <td className="col-adjustments">
                              {formatAmount(uhcTotals.allPreviousAdjustments)}
                            </td>
                            <td className="col-current-month">
                              {formatAmount(uhcTotals.currentMonthTotal)}
                            </td>
                            <td className="col-total">
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
                      <Table className="details-table">
                        <tbody>
                          {group.uhcPlans.map(
                            (plan: InvoiceData, idx: number) => (
                              <tr
                                key={`${monthKey}-uhc-${plan.planType}-${idx}`}
                              >
                                <td className="col-plan-type">
                                  <Badge
                                    color={getPlanBadgeColor(plan.planType)}
                                    variant="light"
                                    size="lg"
                                  >
                                    {formatPlanType(plan.planType)}
                                  </Badge>
                                </td>
                                <td className="col-adjustments">
                                  {formatAmount(plan.allPreviousAdjustments)}
                                </td>
                                <td className="col-current-month">
                                  {formatAmount(plan.currentMonthTotal)}
                                </td>
                                <td className="col-total">
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
                {group.uhgPlans.length > 0 && (
                  <Accordion.Item value={`${monthKey}-uhg`}>
                    <Accordion.Control className="no-padding">
                      <Table className="summary-table">
                        <tbody>
                          <tr className="no-border">
                            <td className="col-plan-type">
                              <Text fw={700}>UHG</Text>
                            </td>
                            <td className="col-adjustments">
                              {formatAmount(uhgTotals.allPreviousAdjustments)}
                            </td>
                            <td className="col-current-month">
                              {formatAmount(uhgTotals.currentMonthTotal)}
                            </td>
                            <td className="col-total">
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
                      <Table className="details-table">
                        <tbody>
                          {group.uhgPlans.map(
                            (plan: InvoiceData, idx: number) => (
                              <tr
                                key={`${monthKey}-uhg-${plan.planType}-${idx}`}
                              >
                                <td className="col-plan-type">
                                  <Badge
                                    color={getPlanBadgeColor(plan.planType)}
                                    variant="light"
                                    size="lg"
                                  >
                                    {formatPlanType(plan.planType)}
                                  </Badge>
                                </td>
                                <td className="col-adjustments">
                                  {formatAmount(plan.allPreviousAdjustments)}
                                </td>
                                <td className="col-current-month">
                                  {formatAmount(plan.currentMonthTotal)}
                                </td>
                                <td className="col-total">
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
            className="fiscal-year-card-blue"
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
                className="fiscal-amount-text"
              >
                {formatAmount(total2024)}
              </Text>
            </Stack>
          </Card>
          <Card
            shadow="sm"
            p="xl"
            radius="md"
            className="fiscal-year-card-blue"
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
                className="fiscal-amount-text"
              >
                {formatAmount(total2025)}
              </Text>
            </Stack>
          </Card>
          <Card
            shadow="sm"
            p="xl"
            radius="md"
            className="fiscal-year-card-green"
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
                className="fiscal-amount-text"
              >
                {formatAmount(overallTotal)}
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>
        <div className="filter-container">
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
            {/* Outer accordion updated for single expansion */}
            <Accordion
              variant="contained"
              value={activeAccordion}
              onChange={setActiveAccordion}
            >
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
              <Card p="lg" radius="md" className="total-section">
                <Group justify="space-between" py="md">
                  <Stack gap={2}>
                    <Text
                      size="xl"
                      fw={700}
                      style={{
                        color: "rgba(255, 255, 255, 0.9)",
                        letterSpacing: "0.5px",
                      }}
                      className="total-heading"
                    >
                      OVERALL INVOICE TOTAL
                    </Text>
                    <Text
                      size="sm"
                      style={{
                        color: "rgba(255, 255, 255, 0.9)",
                        letterSpacing: "0.5px",
                      }}
                      className="total-subheading"
                    >
                      {selectedMonths.length > 0
                        ? `Months: ${selectedMonths.join(", ")} `
                        : "All Months "}
                      {selectedFiscalYear !== "ALL"
                        ? `| Fiscal Year: ${selectedFiscalYear}`
                        : ""}
                    </Text>
                  </Stack>
                  <Box className="total-box">
                    <Text
                      size="28px"
                      fw={700}
                      className="total-amount-text"
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
          <Text component="h1" className="dashboard-title">
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
