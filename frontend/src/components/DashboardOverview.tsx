import React from 'react';
import { Container, Grid, Card, Text, Box, Group } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconUsers, IconCash, IconChartPie, IconBuildingSkyscraper } from '@tabler/icons-react';
import { useQuery } from '@apollo/client';
import { GET_METRICS, GET_COST_ANALYSIS, GET_COVERAGE_ANALYSIS } from '../graphql/queries';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorMessage } from './shared/ErrorMessage';
import { formatCurrency } from '../utils/formatters';
import { CHART_COLORS } from '../utils/theme';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const DashboardOverview: React.FC = () => {
  const { data: metricsData, loading: metricsLoading, error: metricsError } = useQuery(GET_METRICS);
  const { data: costData, loading: costLoading, error: costError } = useQuery(GET_COST_ANALYSIS);
  const { data: coverageData, loading: coverageLoading, error: coverageError } = useQuery(GET_COVERAGE_ANALYSIS);

  if (metricsLoading || costLoading || coverageLoading) return <LoadingSpinner />;
  if (metricsError) return <ErrorMessage message={metricsError.message} />;
  if (costError) return <ErrorMessage message={costError.message} />;
  if (coverageError) return <ErrorMessage message={coverageError.message} />;

  const metrics = metricsData?.getMetrics;
  const costAnalysis = costData?.getCostAnalysis || [];

  // Calculate metrics
  const totalSubscribers = costAnalysis.reduce((sum, plan) => sum + plan.subscriberCount, 0);
  const totalCost = costAnalysis.reduce((sum, plan) => sum + plan.totalCost, 0);
  const avgCostPerSubscriber = totalSubscribers > 0 ? totalCost / totalSubscribers : 0;
  const uhcPlans = costAnalysis.filter(plan => plan.plan.startsWith('UHC'));
  const uhcEnrollment = uhcPlans.reduce((sum, plan) => sum + plan.subscriberCount, 0);
  const enrollmentRate = totalSubscribers > 0 ? (uhcEnrollment / totalSubscribers) * 100 : 0;

  // Consolidate coverage types into specific categories
  const coverageDistribution = metrics?.coverageDistribution?.reduce((acc: any[], curr) => {
    const type = curr.name.toUpperCase();
    let category;
    
    if (type.includes('SPOUSE')) {
      category = 'EE + Spouse';
    } else if (type.includes('FAMILY')) {
      category = 'EE + Family';
    } else if (type.includes('CHILDREN')) {
      category = 'EE +1 or more Children';
    } else if (type.includes('INDIVIDUAL') || type.includes('EMPLOYEE ONLY')) {
      category = 'Employee Only';
    } else {
      return acc; // Skip other categories
    }
    
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.value += curr.value;
    } else {
      acc.push({
        name: category,
        value: curr.value,
        color: category === 'EE + Family' ? CHART_COLORS[0] :
               category === 'EE + Spouse' ? CHART_COLORS[1] :
               category === 'Employee Only' ? CHART_COLORS[2] :
               CHART_COLORS[3]
      });
    }
    
    return acc;
  }, []);

  // Prepare plan comparison data
  const planComparisonData = uhcPlans.map(plan => ({
    name: plan.plan,
    subscribers: plan.subscriberCount,
    premium: plan.totalCost
  }));

  return (
    <Box p="md">
      <Container size="xl">
        {/* Metric Cards */}
        <Grid mb="lg">
          <Grid.Col span={3}>
            <Card shadow="sm" p="lg" radius="md" h={160}>
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="sm" c="dimmed" fw={500}>Average Premium per Employee</Text>
                  <Text size="xl" fw={700} mt={10}>
                    {formatCurrency(avgCostPerSubscriber)}
                  </Text>
                  <Group align="center" mt={5}>
                    <Text size="sm" c="dimmed">Monthly premium</Text>
                  </Group>
                </Box>
                <IconCash size={30} color={CHART_COLORS[0]} />
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card shadow="sm" p="lg" radius="md" h={160}>
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="sm" c="dimmed" fw={500}>UHC Plan Enrollment</Text>
                  <Text size="xl" fw={700} mt={10}>
                    {enrollmentRate.toFixed(1)}%
                  </Text>
                  <Group align="center" gap="xs" mt={5}>
                    <IconArrowUpRight size={16} color="green" />
                    <Text size="sm" c="green">Primary plan adoption</Text>
                  </Group>
                </Box>
                <IconChartPie size={30} color={CHART_COLORS[1]} />
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card shadow="sm" p="lg" radius="md" h={160}>
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="sm" c="dimmed" fw={500}>Average Family Coverage</Text>
                  <Text size="xl" fw={700} mt={10}>
                    {((coverageDistribution.find(d => 
                      d.name === 'EE + Family')?.value || 0) / 
                      (metrics?.totalEmployees || 1) * 100).toFixed(1)}%
                  </Text>
                  <Group align="center" gap="xs" mt={5}>
                    <IconArrowDownRight size={16} color="red" />
                    <Text size="sm" c="red">vs. Individual plans</Text>
                  </Group>
                </Box>
                <IconUsers size={30} color={CHART_COLORS[2]} />
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card shadow="sm" p="lg" radius="md" h={160}>
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="sm" c="dimmed" fw={500}>Premium Revenue</Text>
                  <Text size="xl" fw={700} mt={10}>
                    {formatCurrency(totalCost)}
                  </Text>
                  <Group align="center" mt={5}>
                    <Text size="sm" c="dimmed">Monthly total</Text>
                  </Group>
                </Box>
                <IconBuildingSkyscraper size={30} color={CHART_COLORS[3]} />
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Charts */}
        <Grid>
          <Grid.Col span={6}>
            <Card shadow="sm" p="lg" radius="md" withBorder>
              <Text size="lg" fw={600} mb="md">Coverage Type Distribution</Text>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={coverageDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {coverageDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} employees`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>

          <Grid.Col span={6}>
            <Card shadow="sm" p="lg" radius="md" withBorder>
              <Text size="lg" fw={600} mb="md">Plan Performance Analysis</Text>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={planComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke={CHART_COLORS[0]} />
                  <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS[1]} />
                  <Tooltip formatter={(value: any, name: string) => [
                    name === 'premium' ? formatCurrency(value) : value,
                    name === 'premium' ? 'Premium' : 'Subscribers'
                  ]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="subscribers" name="Subscribers" fill={CHART_COLORS[0]} />
                  <Bar yAxisId="right" dataKey="premium" name="Premium" fill={CHART_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>

          <Grid.Col span={12}>
            <Card shadow="sm" p="lg" radius="md" withBorder>
              <Text size="lg" fw={600} mb="md">Cost Analysis by Plan</Text>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="averageCost" name="Average Cost per Subscriber" fill={CHART_COLORS[2]} />
                  <Bar dataKey="totalCost" name="Total Cost" fill={CHART_COLORS[3]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
};

export default DashboardOverview;