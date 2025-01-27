import { Card, Text, Group, Stack, Progress } from '@mantine/core';

interface PlanDistributionItem {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface PlanDistributionCardProps {
  items: PlanDistributionItem[];
}

export const PlanDistributionCard: React.FC<PlanDistributionCardProps> = ({ items }) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Text size="sm" fw={500} c="dimmed" mb="md">Plan Distribution</Text>
    <Stack gap="xs">
      {items.map((item, index) => (
        <div key={index}>
          <Group justify="space-between" mb={5}>
            <Text size="sm">{item.name}</Text>
            <Text size="sm" fw={500}>{item.count}</Text>
          </Group>
          <Progress 
            value={item.percentage} 
            color={item.color}
            size="sm"
            radius="xl"
          />
        </div>
      ))}
    </Stack>
  </Card>
);
