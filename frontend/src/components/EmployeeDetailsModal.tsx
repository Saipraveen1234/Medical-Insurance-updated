import React, { useMemo } from 'react';
import { Modal, Text, Tabs, Badge, Card, Group, Stack, Box, Divider, Grid } from '@mantine/core';
import { UserCircle, Briefcase, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { CHART_COLORS } from '../utils/theme';

interface Employee {
  subscriberName: string;
  plan: string;
  coverageType: string;
  status: string;
  coverageDates: string;
  chargeAmount: number;
  history?: Array<{
    month: string;
    year: number;
    plan: string;
    coverageType: string;
    status: string;
    coverageDates: string;
    chargeAmount: number;
  }>;
}

interface EmployeeDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ 
  opened, 
  onClose, 
  employee 
}) => {
  if (!employee) return null;

  const months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];

  const premiumHistory = useMemo(() => {
    if (!employee.history) return [];
    
    // Combine current record with history
    const allRecords = [
      ...employee.history,
      {
        month: employee.month,
        year: employee.year,
        chargeAmount: employee.chargeAmount,
        plan: employee.plan,
        coverageType: employee.coverageType,
        status: employee.status,
        coverageDates: employee.coverageDates
      }
    ];

    // Sort records by year and month
    return allRecords.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year; // Reverse year sort for newest first
      return months.indexOf(b.month) - months.indexOf(a.month); // Reverse month sort
    });
  }, [employee, months]);

  const planDistribution = useMemo(() => {
    if (!employee.history) return [];
    
    const planCounts = premiumHistory.reduce((acc: any, curr) => {
      acc[curr.plan] = (acc[curr.plan] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(planCounts).map(([plan, count]) => ({
      name: plan,
      value: count
    }));
  }, [premiumHistory]);

  const coverageTypeChanges = useMemo(() => {
    if (!employee.history) return [];
    
    const changes = premiumHistory.reduce((acc: any, curr) => {
      acc[curr.coverageType] = (acc[curr.coverageType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(changes).map(([type, count]) => ({
      name: type,
      value: count
    }));
  }, [premiumHistory]);

  const premiumTrends = useMemo(() => {
    return premiumHistory.map(record => ({
      period: `${record.month} ${record.year}`,
      premium: record.chargeAmount,
      plan: record.plan
    }));
  }, [premiumHistory]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Text size="xl" fw={700} className="pb-2">
          Employee 360° View: {employee.subscriberName}
        </Text>
      }
    >
      <Tabs defaultValue="overview" variant="outline" className="mt-4">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<UserCircle size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="trends" leftSection={<TrendingUp size={16} />}>
            Premium Trends
          </Tabs.Tab>
          <Tabs.Tab value="insurance" leftSection={<Briefcase size={16} />}>
            Plan History
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid>
            <Grid.Col span={6}>
              <Card withBorder>
                <Text fw={500} size="sm" c="dimmed" mb="md">Annual vs Monthly Premium</Text>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[{
                    name: 'Current Premium',
                    monthly: employee.chargeAmount,
                    yearly: employee.chargeAmount * 12
                  }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={() => 'Premium Breakdown'} 
                    />
                    <Legend />
                    <Bar dataKey="monthly" name="Monthly Premium" fill={CHART_COLORS[0]} />
                    <Bar dataKey="yearly" name="Annual Premium" fill={CHART_COLORS[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>

            <Grid.Col span={6}>
              <Card withBorder>
                <Text fw={500} size="sm" c="dimmed" mb="md">Historical Annual Premium</Text>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.values(premiumHistory.reduce((acc: any, curr) => {
                    const year = curr.year;
                    if (!acc[year]) {
                      acc[year] = {
                        year,
                        annualPremium: curr.chargeAmount * 12,
                        monthlyPremium: curr.chargeAmount
                      };
                    }
                    return acc;
                  }, {}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="monthlyPremium" name="Monthly Premium" fill={CHART_COLORS[0]} />
                    <Bar dataKey="annualPremium" name="Annual Premium" fill={CHART_COLORS[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>

            <Grid.Col span={12}>
              <Card withBorder>
                <Stack gap="md">
                  <Text fw={500} size="sm" c="dimmed">Current Plan Details</Text>
                  <Group grow>
                    <Box>
                      <Text size="sm" c="dimmed">Plan</Text>
                      <Badge color="blue" size="lg" variant="light">
                        {employee.plan}
                      </Badge>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">Coverage Type</Text>
                      <Badge color="cyan" size="lg" variant="light">
                        {employee.coverageType}
                      </Badge>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">Status</Text>
                      <Badge 
                        color={employee.status === 'A' ? 'green' : 'red'} 
                        size="lg" 
                        variant="light"
                      >
                        {employee.status === 'A' ? 'Active' : 'Inactive'}
                      </Badge>
                    </Box>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="trends" pt="md">
          <Card withBorder>
            <Text fw={500} size="sm" c="dimmed" mb="lg">Premium History</Text>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={premiumTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="premium" 
                  stroke={CHART_COLORS[0]} 
                  strokeWidth={2}
                  name="Monthly Premium"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card withBorder mt="md">
            <Text fw={500} size="sm" c="dimmed" mb="lg">Premium Distribution by Plan</Text>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={premiumTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar 
                  dataKey="premium" 
                  fill={CHART_COLORS[1]}
                  name="Premium Amount" 
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="insurance" pt="md">
          <Stack gap="md">
            {premiumHistory.map((record, index) => {
              const nextRecord = premiumHistory[index + 1];
              const hasChanges = nextRecord && (
                record.plan !== nextRecord.plan ||
                record.coverageType !== nextRecord.coverageType ||
                record.status !== nextRecord.status ||
                Math.abs(record.chargeAmount - nextRecord.chargeAmount) > 0.01
              );

              return (
                <Card key={index} withBorder>
                  <Grid>
                    <Grid.Col span={2}>
                      <Text size="sm" c="dimmed">Period</Text>
                      <Text fw={500}>{record.month} {record.year}</Text>
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <Text size="sm" c="dimmed">Plan</Text>
                      <Badge color="blue">{record.plan}</Badge>
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <Text size="sm" c="dimmed">Coverage</Text>
                      <Badge color="cyan">{record.coverageType}</Badge>
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <Text size="sm" c="dimmed">Status</Text>
                      <Badge color={record.status === 'A' ? 'green' : 'red'}>
                        {record.status === 'A' ? 'Active' : 'Inactive'}
                      </Badge>
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <Text size="sm" c="dimmed">Monthly Premium</Text>
                      <Text fw={500}>{formatCurrency(record.chargeAmount)}</Text>
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <Text size="sm" c="dimmed">Annual Premium</Text>
                      <Text fw={500}>{formatCurrency(record.chargeAmount * 12)}</Text>
                    </Grid.Col>
                  </Grid>
                  
                  {hasChanges && (
                    <>
                      <Divider my="sm" variant="dashed" />
                      <Text size="sm" c="dimmed">Changes from Previous Month:</Text>
                      <Grid mt="xs">
                        {record.plan !== nextRecord.plan && (
                          <Grid.Col span={12}>
                            <Group>
                              <Text size="sm">Plan changed from</Text>
                              <Badge color="gray">{nextRecord.plan}</Badge>
                              <Text size="sm">to</Text>
                              <Badge color="blue">{record.plan}</Badge>
                            </Group>
                          </Grid.Col>
                        )}
                        {record.coverageType !== nextRecord.coverageType && (
                          <Grid.Col span={12}>
                            <Group>
                              <Text size="sm">Coverage changed from</Text>
                              <Badge color="gray">{nextRecord.coverageType}</Badge>
                              <Text size="sm">to</Text>
                              <Badge color="cyan">{record.coverageType}</Badge>
                            </Group>
                          </Grid.Col>
                        )}
                        {Math.abs(record.chargeAmount - nextRecord.chargeAmount) > 0.01 && (
                          <Grid.Col span={12}>
                            <Group>
                              <Text size="sm">Premium changed from</Text>
                              <Text fw={500}>{formatCurrency(nextRecord.chargeAmount)}</Text>
                              <Text size="sm">to</Text>
                              <Text fw={500}>{formatCurrency(record.chargeAmount)}</Text>
                            </Group>
                          </Grid.Col>
                        )}
                      </Grid>
                    </>
                  )}
                </Card>
              );
            })}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};

export default EmployeeDetailsModal;