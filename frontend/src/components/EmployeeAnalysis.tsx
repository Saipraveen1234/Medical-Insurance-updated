import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { 
  Container, 
  Text, 
  Box,
  Group, 
  Button,
  Card
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { GET_EMPLOYEE_DETAILS } from '../graphql/queries';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorMessage } from './shared/ErrorMessage';
import FilterPanel from './shared/FilterPanel';
import EnhancedTable from './shared/EnhancedTable';
import SearchBar from './shared/SearchBar';
import EmployeeDetailsModal from './EmployeeDetailsModal';

interface Employee {
  subscriberName: string;
  plan: string;
  coverageType: string;
  status: string;
  coverageDates: string;
  chargeAmount: number;
}

const EmployeeAnalysis = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  
  const [selectedFilters, setSelectedFilters] = useState({
    plans: [] as string[],
    coverageTypes: [] as string[]
  });

  const { loading, error, data } = useQuery(GET_EMPLOYEE_DETAILS, {
    variables: { search: searchTerm },
    fetchPolicy: 'network-only'
  });

  const filters = useMemo(() => {
    if (!data?.getEmployeeDetails) return {
      plans: [],
      coverageTypes: []
    };

    const employees = data.getEmployeeDetails as Employee[];
    return {
      plans: [...new Set(employees.map(e => e.plan))],
      coverageTypes: [...new Set(employees.map(e => e.coverageType))]
    };
  }, [data]);

  const filteredEmployees = useMemo(() => {
    if (!data?.getEmployeeDetails) return [];

    return (data.getEmployeeDetails as Employee[]).filter((employee) => {
      const searchFields = [
        employee.subscriberName,
        employee.plan,
        employee.coverageType
      ];
      
      const searchMatch = searchTerm === '' || searchFields.some(field => 
        field.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (selectedFilters.plans.length && !selectedFilters.plans.includes(employee.plan)) {
        return false;
      }
      if (selectedFilters.coverageTypes.length && !selectedFilters.coverageTypes.includes(employee.coverageType)) {
        return false;
      }

      return searchMatch;
    });
  }, [data, searchTerm, selectedFilters]);

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    open();
  };

  const handleExportData = (employee: Employee) => {
    notifications.show({
      title: 'Export Started',
      message: `Exporting data for ${employee.subscriberName}`,
      color: 'blue'
    });
  };

  const handleContactEmployee = (employee: Employee) => {
    notifications.show({
      title: 'Contact Request',
      message: `Contact request sent for ${employee.subscriberName}`,
      color: 'green'
    });
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const resetFilters = () => {
    setSelectedFilters({
      plans: [],
      coverageTypes: []
    });
    setSearchTerm('');
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <Container size="xl">
      <Box>
        {/* Header Section */}

        {/* Search and Filter Section */}
        <Card shadow="sm" p="md" radius="md" mb="lg">
          <Box>
            <Group justify="space-between" align="center" mb="md">
              <Text size="md" fw={500}>Search and Filter</Text>
              <Button 
                variant="subtle" 
                onClick={resetFilters}
                size="sm"
              >
                Reset All
              </Button>
            </Group>
            
            <Box mb="md">
              <SearchBar
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name, plan, or coverage type... (Press Enter to search)"
                isLoading={loading}
              />
            </Box>

            <FilterPanel
              filters={filters}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              onReset={resetFilters}
            />
          </Box>
        </Card>

        {/* Table Section */}
        <Card shadow="sm" p="md" radius="md">
          {filteredEmployees.length === 0 ? (
            <Box ta="center" py="xl">
              <Text size="lg" c="dimmed" mb="sm">No results found</Text>
              <Text size="sm" c="dimmed">Try adjusting your search or filters</Text>
            </Box>
          ) : (
            <EnhancedTable
              data={filteredEmployees}
              onViewDetails={handleViewDetails}
              onExportData={handleExportData}
              onContactEmployee={handleContactEmployee}
            />
          )}
        </Card>

        {/* Employee Details Modal */}
        <EmployeeDetailsModal
          opened={opened}
          onClose={close}
          employee={selectedEmployee}
        />
      </Box>
    </Container>
  );
};

export default EmployeeAnalysis;