// src/components/shared/FilterPanel.tsx
import React from 'react';
import { Box, MultiSelect, Group, Text, Button } from '@mantine/core';

interface FilterPanelProps {
  filters: {
    plans: string[];
    coverageTypes: string[];
  };
  selectedFilters: {
    plans: string[];
    coverageTypes: string[];
  };
  onFilterChange: (filterType: string, value: any) => void;
  onReset: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
  filters, 
  selectedFilters, 
  onFilterChange,
  onReset 
}) => {
  return (
    <Box p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem' }}>
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>Filters</Text>
        <Button variant="subtle" onClick={onReset}>Reset Filters</Button>
      </Group>

      <Group grow mb="md">
        <MultiSelect
          label="Plans"
          placeholder="Select plans"
          data={filters.plans.map(plan => ({ value: plan, label: plan }))}
          value={selectedFilters.plans}
          onChange={(value) => onFilterChange('plans', value)}
          searchable
          clearable
        />
        <MultiSelect
          label="Coverage Types"
          placeholder="Select coverage types"
          data={filters.coverageTypes.map(type => ({ value: type, label: type }))}
          value={selectedFilters.coverageTypes}
          onChange={(value) => onFilterChange('coverageTypes', value)}
          searchable
          clearable
        />
      </Group>
    </Box>
  );
};

export default FilterPanel;