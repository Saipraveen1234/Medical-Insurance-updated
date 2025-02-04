import React from 'react';
import { useQuery } from '@apollo/client';
import { Container, Card, Table, Text, Badge, Stack, Accordion, Group } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { gql } from '@apollo/client';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorMessage } from './shared/ErrorMessage';

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

const InvoiceSummaryDashboard = () => {
  const { data, loading, error } = useQuery(GET_INVOICE_DATA, {
    fetchPolicy: 'network-only'
  });

  if (loading) return <LoadingSpinner />;
  if (error) {
    console.error('GraphQL Error:', error);
    return <ErrorMessage message={error.message} />;
  }

  if (!data?.getInvoiceData || data.getInvoiceData.length === 0) {
    return (
      <Container size="xl">
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            No invoice data available. Please upload files through the Datasets tab.
          </Text>
        </Card>
      </Container>
    );
  }

  // Group data by month and year
  const groupedByMonth = data.getInvoiceData.reduce((acc, item) => {
    const monthKey = `${item.month}-${item.year}`;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: item.month,
        year: item.year,
        uhcPlans: [],
        uhgPlans: []
      };
    }
    
    if (item.planType.startsWith('UHC')) {
      acc[monthKey].uhcPlans.push(item);
    } else if (item.planType.startsWith('UHG-')) {
      acc[monthKey].uhgPlans.push(item);
    }
    
    return acc;
  }, {});

  // Sort months
  const monthOrder = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const sortedMonths = Object.entries(groupedByMonth)
    .sort(([keyA], [keyB]) => {
      const [monthA, yearA] = keyA.split('-');
      const [monthB, yearB] = keyB.split('-');
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
      return monthOrder.indexOf(monthB) - monthOrder.indexOf(monthA);
    });

  const formatAmount = (amount) => {
    if (amount === 0) return '$0.00';
    return amount < 0 
      ? <Text c="red" fw={500}>-${Math.abs(amount).toFixed(2)}</Text>
      : <Text fw={500}>${amount.toFixed(2)}</Text>;
  };

  const getPlanBadgeColor = (planType) => {
    if (planType === 'UHC-2000') return 'blue';
    if (planType === 'UHC-3000') return 'green';
    if (planType === 'UHG-LIFE') return 'violet';
    if (planType === 'UHG-VISION') return 'cyan';
    if (planType === 'UHG-DENTAL') return 'indigo';
    return 'gray';
  };

  const formatPlanType = (planType) => {
    if (planType.startsWith('UHG-')) {
      return planType.split('-')[1];
    }
    return planType.replace(/([A-Z])(\d)/g, '$1 $2');
  };

  const calculateGroupTotals = (plans) => {
    return plans.reduce((acc, curr) => ({
      previousMonthsTotal: acc.previousMonthsTotal + curr.previousMonthsTotal,
      currentMonthTotal: acc.currentMonthTotal + curr.currentMonthTotal,
      grandTotal: acc.grandTotal + curr.grandTotal
    }), {
      previousMonthsTotal: 0,
      currentMonthTotal: 0,
      grandTotal: 0
    });
  };

  const renderMonthData = (monthKey, monthData) => {
    const uhcTotals = calculateGroupTotals(monthData.uhcPlans);
    const uhgTotals = calculateGroupTotals(monthData.uhgPlans);
    const monthTotals = {
      previousMonthsTotal: uhcTotals.previousMonthsTotal + uhgTotals.previousMonthsTotal,
      currentMonthTotal: uhcTotals.currentMonthTotal + uhgTotals.currentMonthTotal,
      grandTotal: uhcTotals.grandTotal + uhgTotals.grandTotal
    };

    return (
      <Table withBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Plan Type</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Previous Months Total</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Current Month Total</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Grand Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {/* UHC Plans */}
          {monthData.uhcPlans.map((plan) => (
            <Table.Tr key={`${monthKey}-${plan.planType}`}>
              <Table.Td>
                <Badge 
                  color={getPlanBadgeColor(plan.planType)}
                  variant="light"
                  size="lg"
                >
                  {formatPlanType(plan.planType)}
                </Badge>
              </Table.Td>
              <Table.Td align="right">{formatAmount(plan.previousMonthsTotal)}</Table.Td>
              <Table.Td align="right">{formatAmount(plan.currentMonthTotal)}</Table.Td>
              <Table.Td align="right">{formatAmount(plan.grandTotal)}</Table.Td>
            </Table.Tr>
          ))}

          {/* UHC Total */}
          {monthData.uhcPlans.length > 0 && (
            <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
              <Table.Td>
                <Text fw={700}>UHC Total:</Text>
              </Table.Td>
              <Table.Td align="right">
                <Text fw={700}>{formatAmount(uhcTotals.previousMonthsTotal)}</Text>
              </Table.Td>
              <Table.Td align="right">
                <Text fw={700}>{formatAmount(uhcTotals.currentMonthTotal)}</Text>
              </Table.Td>
              <Table.Td align="right">
                <Text fw={700}>{formatAmount(uhcTotals.grandTotal)}</Text>
              </Table.Td>
            </Table.Tr>
          )}

          {/* UHG Plans */}
          {monthData.uhgPlans.map((plan) => (
            <Table.Tr key={`${monthKey}-${plan.planType}`}>
              <Table.Td>
                <Badge 
                  color={getPlanBadgeColor(plan.planType)}
                  variant="light"
                  size="lg"
                >
                  {formatPlanType(plan.planType)}
                </Badge>
              </Table.Td>
              <Table.Td align="right">{formatAmount(plan.previousMonthsTotal)}</Table.Td>
              <Table.Td align="right">{formatAmount(plan.currentMonthTotal)}</Table.Td>
              <Table.Td align="right">{formatAmount(plan.grandTotal)}</Table.Td>
            </Table.Tr>
          ))}

          {/* UHG Total */}
          {monthData.uhgPlans.length > 0 && (
            <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
              <Table.Td>
                <Text fw={700}>UHG Total:</Text>
              </Table.Td>
              <Table.Td align="right">
                <Text fw={700}>{formatAmount(uhgTotals.previousMonthsTotal)}</Text>
              </Table.Td>
              <Table.Td align="right">
                <Text fw={700}>{formatAmount(uhgTotals.currentMonthTotal)}</Text>
              </Table.Td>
              <Table.Td align="right">
                <Text fw={700}>{formatAmount(uhgTotals.grandTotal)}</Text>
              </Table.Td>
            </Table.Tr>
          )}

          {/* Month Total */}
          <Table.Tr style={{ backgroundColor: '#e9ecef' }}>
            <Table.Td>
              <Text fw={700} size="lg">Month Total:</Text>
            </Table.Td>
            <Table.Td align="right">
              <Text fw={700} size="lg">{formatAmount(monthTotals.previousMonthsTotal)}</Text>
            </Table.Td>
            <Table.Td align="right">
              <Text fw={700} size="lg">{formatAmount(monthTotals.currentMonthTotal)}</Text>
            </Table.Td>
            <Table.Td align="right">
              <Text fw={700} size="lg">{formatAmount(monthTotals.grandTotal)}</Text>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    );
  };

  // Calculate grand totals
  const grandTotals = sortedMonths.reduce((acc, [_, monthData]) => {
    const monthTotals = calculateGroupTotals([...monthData.uhcPlans, ...monthData.uhgPlans]);
    return {
      previousMonthsTotal: acc.previousMonthsTotal + monthTotals.previousMonthsTotal,
      currentMonthTotal: acc.currentMonthTotal + monthTotals.currentMonthTotal,
      grandTotal: acc.grandTotal + monthTotals.grandTotal
    };
  }, { previousMonthsTotal: 0, currentMonthTotal: 0, grandTotal: 0 });

  return (
    <Container size="xl">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Stack spacing="lg">
          <Text size="xl" fw={700}>Insurance Invoice Summary</Text>

          <Accordion variant="contained">
            {sortedMonths.map(([monthKey, monthData]) => (
              <Accordion.Item 
                key={monthKey} 
                value={monthKey}
              >
                <Accordion.Control>
                  <Group justify="space-between">
                    <Text fw={700}>{monthData.month} {monthData.year}</Text>
                    <Text c="dimmed" size="sm">
                      Total: ${calculateGroupTotals([...monthData.uhcPlans, ...monthData.uhgPlans]).grandTotal.toFixed(2)}
                    </Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  {renderMonthData(monthKey, monthData)}
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>

          {/* Grand Total */}
          <Table withBorder>
            <Table.Tbody>
              <Table.Tr style={{ backgroundColor: '#f1f3f5' }}>
                <Table.Td>
                  <Text fw={700} size="lg">GRAND TOTAL:</Text>
                </Table.Td>
                <Table.Td align="right">
                  <Text fw={700} size="lg">{formatAmount(grandTotals.previousMonthsTotal)}</Text>
                </Table.Td>
                <Table.Td align="right">
                  <Text fw={700} size="lg">{formatAmount(grandTotals.currentMonthTotal)}</Text>
                </Table.Td>
                <Table.Td align="right">
                  <Text fw={700} size="lg">{formatAmount(grandTotals.grandTotal)}</Text>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Container>
  );
};

export default InvoiceSummaryDashboard;