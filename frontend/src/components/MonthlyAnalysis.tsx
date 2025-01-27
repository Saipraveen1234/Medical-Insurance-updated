import React, { useState, useEffect } from 'react';
import { Card, Table, Text, Group, Select, Stack, Grid } from '@mantine/core';
import { useQuery } from '@apollo/client';
import { GET_MONTHLY_ANALYSIS } from '../graphql/queries';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorMessage } from './shared/ErrorMessage';
import { formatCurrency } from '../utils/formatters';
import { THEME_COLORS } from '../utils/theme';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyAnalysis = () => {
  // Get current fiscal year
  const getCurrentFiscalYear = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    return currentMonth >= 9 ? currentYear : currentYear - 1;
  };

  const [selectedYear, setSelectedYear] = useState(getCurrentFiscalYear());
  const { data, loading, error } = useQuery(GET_MONTHLY_ANALYSIS, {
    variables: { year: selectedYear },
    fetchPolicy: 'network-only'
  });

  useEffect(() => {
    console.log('Monthly Analysis Data:', data);
    console.log('Loading:', loading);
    console.log('Error:', error);
  }, [data, loading, error]);

  // Define all plan types that should always be shown
  const ALL_PLAN_TYPES = [
    'UHG',
    'UHC-3000',
    'UHC-2000',
    'VISION',
    'DENTAL',
    'LIFE'
  ];

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  const monthlyAnalysis = data?.getMonthlyAnalysis;
  if (!monthlyAnalysis) {
    console.log('No monthly analysis data');
    return <Text>No data available for the selected year.</Text>;
  }

  // Create chart data
  const monthlyChartData = monthlyAnalysis.months.map(month => ({
    month,
    total: monthlyAnalysis.monthTotals.find(mt => mt.month === month)?.total || 0
  }));

  const planTotalChartData = ALL_PLAN_TYPES.map(plan => ({
    plan,
    total: monthlyAnalysis.planData.find(p => p.planType === plan)?.total || 0
  }));

  // Generate fiscal year options
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = getCurrentFiscalYear() - i;
    return {
      value: year.toString(),
      label: `FY ${year}-${(year + 1).toString().slice(2)}`
    };
  });

  return (
    <Stack spacing="lg">
      <Card shadow="sm" p="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Text size="xl" fw={700}>Monthly Insurance Analysis</Text>
          <Select
            value={selectedYear.toString()}
            onChange={(value) => setSelectedYear(parseInt(value || getCurrentFiscalYear().toString()))}
            data={yearOptions}
            style={{ width: 200 }}
          />
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>PLAN TYPE</Table.Th>
              {monthlyAnalysis.months.map(month => (
                <Table.Th key={month} style={{ textAlign: 'right' }}>{month}</Table.Th>
              ))}
              <Table.Th style={{ textAlign: 'right', color: THEME_COLORS.primary }}>TOTAL</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ALL_PLAN_TYPES.map(planType => {
              const planData = monthlyAnalysis.planData.find(p => p.planType === planType);
              return (
                <Table.Tr key={planType}>
                  <Table.Td>{planType}</Table.Td>
                  {monthlyAnalysis.months.map(month => {
                    const monthAmount = planData?.monthlyAmounts.find(ma => ma.month === month);
                    return (
                      <Table.Td key={month} style={{ textAlign: 'right' }}>
                        {formatCurrency(monthAmount?.amount || 0)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'right', color: THEME_COLORS.primary, fontWeight: 'bold' }}>
                    {formatCurrency(planData?.total || 0)}
                  </Table.Td>
                </Table.Tr>
              );
            })}
            <Table.Tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
              <Table.Td>TOTALS</Table.Td>
              {monthlyAnalysis.months.map(month => (
                <Table.Td key={month} style={{ textAlign: 'right' }}>
                  {formatCurrency(monthlyAnalysis.monthTotals.find(mt => mt.month === month)?.total || 0)}
                </Table.Td>
              ))}
              <Table.Td style={{ textAlign: 'right', color: THEME_COLORS.primary }}>
                {formatCurrency(monthlyAnalysis.grandTotal)}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>

      <Grid>
        <Grid.Col span={6}>
          <Card shadow="sm" p="lg" withBorder>
            <Text size="lg" fw={600} mb="lg">Monthly Premium Totals</Text>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="total" name="Monthly Total" fill={THEME_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card shadow="sm" p="lg" withBorder>
            <Text size="lg" fw={600} mb="lg">Plan-wise Total Premium</Text>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planTotalChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="total" name="Plan Total" fill={THEME_COLORS.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" p="lg" withBorder>
            <Text size="lg" fw={600} mb="lg">Premium Trend Analysis</Text>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Monthly Premium" 
                    stroke={THEME_COLORS.primary}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};

export default MonthlyAnalysis;