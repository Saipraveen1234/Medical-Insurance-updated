// src/components/shared/CoverageTypeCard.tsx
import React from 'react';
import { Card, Text } from '@mantine/core';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CoverageTypeItem {
  type: string;
  count: number;
  color: string;
}

interface CoverageTypeCardProps {
  data: CoverageTypeItem[];
}

export const CoverageTypeCard: React.FC<CoverageTypeCardProps> = ({ data }) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Text size="sm" fw={500} c="dimmed" mb="md">Coverage Types</Text>
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </Card>
);