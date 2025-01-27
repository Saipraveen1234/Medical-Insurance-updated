// src/components/shared/MetricsCard.tsx
import React from 'react';
import { Card, Group, Text, RingProgress, Stack, ActionIcon, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { formatCurrency } from '../../utils/formatters';

interface MetricsCardProps {
  title: string;
  value: number | string;
  percent?: number;
  description: string;
  color?: string;
  icon?: React.ReactNode;
  format?: 'currency' | 'number';
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  percent,
  description,
  color = 'blue',
  icon,
  format = 'number'
}) => {
  const displayValue = format === 'currency' ? 
    formatCurrency(typeof value === 'string' ? parseFloat(value) : value) : 
    value;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Group gap="xs">
            <Text size="sm" fw={500} c="dimmed">{title}</Text>
            <Tooltip label={description}>
              <ActionIcon variant="subtle" size="sm">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Text size="xl" fw={700}>{displayValue}</Text>
        </Stack>
        {percent !== undefined && (
          <RingProgress
            size={80}
            thickness={8}
            roundCaps
            sections={[{ value: percent, color: color }]}
            label={
              <Text size="xs" ta="center" fw={700}>
                {percent.toFixed(0)}%
              </Text>
            }
          />
        )}
        {icon && !percent && (
          <div style={{ color }}>{icon}</div>
        )}
      </Group>
      <Text mt="sm" size="sm" c="dimmed">
        {description}
      </Text>
    </Card>
  );
};