import React from 'react';
import { Group, Select, Text, Badge } from '@mantine/core';

interface PeriodOption {
  value: string;
  label: string;
}

interface RecordsFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: PeriodOption[];
  showTotalRecords?: boolean;
  totalRecords?: number;
}

const RecordsFilter: React.FC<RecordsFilterProps> = ({
  value,
  onChange,
  options,
  showTotalRecords = true,
  totalRecords = 0
}) => {
  // Get current period details
  const currentPeriod = value ? options.find(opt => opt.value === value) : null;

  return (
    <Group position="apart" align="center" mb="md">
      <Group>
        <Text size="lg" fw={500}>Employee Records</Text>
        {showTotalRecords && (
          <Badge size="lg" variant="light">
            {totalRecords} {totalRecords === 1 ? 'record' : 'records'}
          </Badge>
        )}
      </Group>
      <Group spacing="xs">
        <Text size="sm" c="dimmed">Viewing data for:</Text>
        <Select
          placeholder="Select period"
          value={value}
          onChange={onChange}
          data={options}
          style={{ width: 200 }}
          clearable={false}
          searchable
        />
      </Group>
    </Group>
  );
};

export default RecordsFilter;