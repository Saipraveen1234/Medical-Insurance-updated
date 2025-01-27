import React from 'react';
import { Card, Text } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

interface ChartData {
  name: string;
  subscribers: number;
  avgPremium: number;
  totalPremium: number;
}

interface ComparisonChartProps {
  data: ChartData[];
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ data }) => {
  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Text size="lg" fw={600} mb="lg">Plan Metrics Comparison</Text>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis 
            yAxisId="left"
            orientation="left"
            stroke="#228be6"
            label={{ 
              value: 'Premium ($)', 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#40c057"
            label={{ 
              value: 'Subscribers', 
              angle: 90, 
              position: 'insideRight' 
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'subscribers') return [value, 'Subscribers'];
              return [formatCurrency(value), name === 'avgPremium' ? 'Avg Premium' : 'Total Premium'];
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="totalPremium"
            name="Total Premium"
            fill="#228be6"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="avgPremium"
            name="Avg Premium"
            fill="#748ffc"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="subscribers"
            name="Subscribers"
            fill="#40c057"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default ComparisonChart;