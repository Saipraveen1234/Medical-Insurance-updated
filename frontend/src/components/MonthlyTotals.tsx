import React from 'react';
import { Card, Table, Text, Title, Box } from '@mantine/core';
import { formatCurrency } from '../utils/formatters';

interface MonthlyTotal {
  month: string;
  total: number;
}

interface PlanMonthlyTotal {
  plan: string;
  monthlyTotals: MonthlyTotal[];
  yearlyTotal: number;
}

interface MonthlyTotalsProps {
  data: PlanMonthlyTotal[];
}

const MonthlyTotals: React.FC<MonthlyTotalsProps> = ({ data = [] }) => {
  const months = [
    'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'
  ];

  // Calculate totals for the table footer
  const columnTotals = months.map(month => {
    return data.reduce((sum, plan) => {
      const monthData = plan.monthlyTotals.find(m => m.month === month);
      return sum + (monthData?.total || 0);
    }, 0);
  });

  const grandTotal = data.reduce((sum, plan) => sum + plan.yearlyTotal, 0);

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Title order={3} mb="md">Monthly Totals</Title>
      
      <Box style={{ overflowX: 'auto' }}>
        <Table striped highlightOnHover withTableBorder>
          <thead>
            <tr>
              <th>Plan Type</th>
              {months.map(month => (
                <th key={month} style={{ textAlign: 'right' }}>{month}</th>
              ))}
              <th style={{ textAlign: 'right', color: '#1c7ed6' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((plan) => (
              <tr key={plan.plan}>
                <td style={{ fontWeight: 500 }}>{plan.plan}</td>
                {months.map(month => {
                  const monthData = plan.monthlyTotals.find(m => m.month === month);
                  return (
                    <td key={month} style={{ textAlign: 'right' }}>
                      {formatCurrency(monthData?.total || 0)}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'right', color: '#1c7ed6', fontWeight: 'bold' }}>
                  {formatCurrency(plan.yearlyTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <td style={{ fontWeight: 700 }}>TOTAL</td>
              {columnTotals.map((total, index) => (
                <td key={months[index]} style={{ textAlign: 'right', fontWeight: 700 }}>
                  {formatCurrency(total)}
                </td>
              ))}
              <td style={{ textAlign: 'right', color: '#1c7ed6', fontWeight: 'bold' }}>
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </Table>
      </Box>
    </Card>
  );
};

export default MonthlyTotals;