import React from 'react';
import { useQuery } from '@apollo/client';
import { Card, Grid, Text } from '@mantine/core';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell 
} from 'recharts';
import { GET_COVERAGE_ANALYSIS, GET_COST_ANALYSIS } from '../graphql/queries';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorMessage } from './shared/ErrorMessage';
import { formatCurrency } from '../utils/formatters';
import { THEME_COLORS, CHART_COLORS } from '../utils/theme';

const PlanComparison: React.FC = () => {
  const { data: coverageData, loading: coverageLoading, error: coverageError } = 
    useQuery(GET_COVERAGE_ANALYSIS);
  const { data: costData, loading: costLoading, error: costError } = 
    useQuery(GET_COST_ANALYSIS);

  if (coverageLoading || costLoading) return <LoadingSpinner />;
  if (coverageError) return <ErrorMessage message={coverageError.message} />;
  if (costError) return <ErrorMessage message={costError.message} />;

  const coverageAnalysis = coverageData?.getCoverageAnalysis || [];
  const costAnalysis = costData?.getCostAnalysis || [];

  return (
    <div className="p-6">
        <Grid>
          <Grid.Col span={12}>
            <Card shadow="sm" p="lg" mb="lg">
              <Text size="lg" fw={600} mb="md">Cost Distribution by Plan</Text>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={costAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis yAxisId="left" orientation="left" stroke={THEME_COLORS.primary} />
                  <YAxis yAxisId="right" orientation="right" stroke={THEME_COLORS.secondary} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="totalCost"
                    name="Total Cost"
                    fill={THEME_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="averageCost"
                    name="Average Cost"
                    fill={THEME_COLORS.secondary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>

          <Grid.Col span={6}>
            <Card shadow="sm" p="lg">
              <Text size="lg" fw={600} mb="md">Premium Distribution</Text>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costAnalysis}
                    dataKey="totalCost"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {costAnalysis.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>

          <Grid.Col span={6}>
            <Card shadow="sm" p="lg">
              <Text size="lg" fw={600} mb="md">Subscriber Distribution</Text>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costAnalysis}
                    dataKey="subscriberCount"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {costAnalysis.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>
        </Grid>
    </div>
  );
};

export default PlanComparison;