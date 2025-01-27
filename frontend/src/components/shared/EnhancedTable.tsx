import React, { useState, useMemo } from 'react';
import { 
  Table, 
  ScrollArea, 
  Text, 
  Group, 
  Badge, 
  ActionIcon, 
  Menu, 
  Pagination,
  Card,
  Tooltip,
  Box,
  Accordion,
  Grid,
  Select,
  Divider
} from '@mantine/core';
import { 
  IconDotsVertical, 
  IconEye, 
  IconDownload, 
  IconMail, 
  IconCalendar, 
  IconHistory, 
  IconArrowRight 
} from '@tabler/icons-react';
import { formatCurrency } from '../../utils/formatters';

// Utility functions moved outside components
const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'A':
    case 'ACTIVE':
      return 'green';
    case 'I':
    case 'INACTIVE':
      return 'red';
    default:
      return 'gray';
  }
};

const getStatusText = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'A':
    case 'ACTIVE':
      return 'Active';
    case 'I':
    case 'INACTIVE':
      return 'Inactive';
    default:
      return status || 'Unknown';
  }
};

const formatSubscriberName = (name: string | null | undefined) => {
  if (!name) return 'Unknown';
  const parts = name.split(',').map(part => part.trim());
  return parts.length >= 2 ? `${parts[1]} ${parts[0]}` : name.trim() || 'Unknown';
};

const formatCoverageDate = (dateRange: string) => {
  if (!dateRange || dateRange === 'N/A - N/A') {
    return 'Ongoing';
  }
  return dateRange;
};

const formatAmount = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return formatCurrency(0);
  }
  return formatCurrency(amount);
};

// Types definitions
interface EmployeeHistory {
  month: string;
  year: number;
  plan: string;
  coverageType: string;
  status: string;
  coverageDates: string;
  chargeAmount: number;
}

interface Employee {
  subscriberName: string;
  plan: string;
  coverageType: string;
  status: string;
  coverageDates: string;
  chargeAmount: number;
  month: string;
  year: number;
  history?: EmployeeHistory[];
}

interface EnhancedTableProps {
  data: Employee[];
  onViewDetails?: (employee: Employee) => void;
  onExportData?: (employee: Employee) => void;
  onContactEmployee?: (employee: Employee) => void;
}

// History Display Component
const HistoryDisplay: React.FC<{ currentRecord: Employee; history: EmployeeHistory[] }> = ({ 
  currentRecord, 
  history 
}) => {
  const months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
  
  // Filter out current record from history
  const sortedHistory = React.useMemo(() => {
    return [...history].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return months.indexOf(b.month) - months.indexOf(a.month);
    });
  }, [history]);

  if (sortedHistory.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        No historical records available
      </Text>
    );
  }

  return (
    <Box>
      {sortedHistory.map((record, idx) => {
        const prevRecord = idx > 0 ? sortedHistory[idx - 1] : currentRecord;
        const hasChanges = 
          record.plan !== prevRecord.plan ||
          record.coverageType !== prevRecord.coverageType ||
          Math.abs(record.chargeAmount - prevRecord.chargeAmount) > 0.01 ||
          record.status !== prevRecord.status;

        return (
          <Accordion.Item 
            key={`${record.month}-${record.year}`} 
            value={`${record.month}-${record.year}`}
          >
            <Accordion.Control>
              <Group position="apart">
                <Group>
                  <Text size="sm" fw={500}>
                    {record.month} {record.year}
                  </Text>
                  {hasChanges && (
                    <Badge color="yellow" size="sm">Changed</Badge>
                  )}
                </Group>
                <Badge color="blue" size="sm">{record.plan}</Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Plan</Text>
                  <Text size="sm" fw={500}>{record.plan}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Coverage Type</Text>
                  <Text size="sm" fw={500}>{record.coverageType}</Text>
                </Grid.Col>
                
                <Grid.Col span={12}>
                  <Divider my="xs" />
                </Grid.Col>

                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Status</Text>
                  <Badge color={getStatusColor(record.status)}>
                    {getStatusText(record.status)}
                  </Badge>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Premium</Text>
                  <Text size="sm" fw={500}>
                    {formatCurrency(record.chargeAmount)}
                  </Text>
                </Grid.Col>

                {hasChanges && (
                  <Grid.Col span={12}>
                    <Divider my="xs" variant="dashed" />
                    <Text size="sm" fw={500}>Changes from Previous Month</Text>
                    <Box mt={8}>
                      {record.plan !== prevRecord.plan && (
                        <Text size="xs">• Plan changed from <strong>{prevRecord.plan}</strong> to <strong>{record.plan}</strong></Text>
                      )}
                      {record.coverageType !== prevRecord.coverageType && (
                        <Text size="xs">• Coverage type changed from <strong>{prevRecord.coverageType}</strong> to <strong>{record.coverageType}</strong></Text>
                      )}
                      {record.status !== prevRecord.status && (
                        <Text size="xs">• Status changed from <strong>{getStatusText(prevRecord.status)}</strong> to <strong>{getStatusText(record.status)}</strong></Text>
                      )}
                      {Math.abs(record.chargeAmount - prevRecord.chargeAmount) > 0.01 && (
                        <Text size="xs">• Premium changed from <strong>{formatCurrency(prevRecord.chargeAmount)}</strong> to <strong>{formatCurrency(record.chargeAmount)}</strong></Text>
                      )}
                    </Box>
                  </Grid.Col>
                )}
              </Grid>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Box>
  );
};

// Main Table Component
const getMonthYearOptions = (data: Employee[]) => {
  const options = new Set<string>();
  
  // Add current records
  data.forEach(emp => {
    options.add(`${emp.month}-${emp.year}`);
  });

  // Add history records
  data.forEach(emp => {
    emp.history?.forEach(hist => {
      options.add(`${hist.month}-${hist.year}`);
    });
  });

  return Array.from(options)
    .sort((a, b) => {
      const [monthA, yearA] = a.split('-');
      const [monthB, yearB] = b.split('-');
      const months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
      if (yearA !== yearB) return Number(yearB) - Number(yearA);
      return months.indexOf(monthB) - months.indexOf(monthA);
    })
    .map(option => ({
      value: option,
      label: option
    }));
};


const HistoryModal: React.FC<{ employee: Employee }> = ({ employee }) => {
  const months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];

  const sortedHistory = React.useMemo(() => {
    if (!employee.history) return [];
    return [...employee.history].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return months.indexOf(b.month) - months.indexOf(a.month);
    });
  }, [employee.history]);

  if (!sortedHistory.length) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        No historical records available
      </Text>
    );
  }

  return (
    <Box>
      {sortedHistory.map((record, idx) => {
        const prevRecord = idx > 0 ? sortedHistory[idx - 1] : employee;
        const hasChanges = 
          record.plan !== prevRecord.plan ||
          record.coverageType !== prevRecord.coverageType ||
          Math.abs(record.chargeAmount - prevRecord.chargeAmount) > 0.01 ||
          record.status !== prevRecord.status;

        return (
          <Box key={`${record.month}-${record.year}`} mb="md">
            <Card withBorder>
              <Group position="apart" mb="md">
                <Group>
                  <Text fw={500}>
                    {record.month} {record.year}
                  </Text>
                  {hasChanges && (
                    <Badge color="yellow">Changes Present</Badge>
                  )}
                </Group>
                <Badge color="blue">{record.plan}</Badge>
              </Group>

              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Coverage Type</Text>
                  <Text fw={500}>{record.coverageType}</Text>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Status</Text>
                  <Badge color={getStatusColor(record.status)}>
                    {getStatusText(record.status)}
                  </Badge>
                </Grid.Col>

                <Grid.Col span={12}>
                  <Text size="sm" c="dimmed">Premium</Text>
                  <Text fw={500}>{formatCurrency(record.chargeAmount)}</Text>
                </Grid.Col>

                {hasChanges && (
                  <Grid.Col span={12}>
                    <Divider my="sm" variant="dashed" />
                    <Text size="sm" fw={500}>Changes from Previous Month</Text>
                    <Box mt={8}>
                      {record.plan !== prevRecord.plan && (
                        <Group position="apart" mt={4}>
                          <Text size="sm">Plan</Text>
                          <Group gap="xs">
                            <Text size="sm">{prevRecord.plan}</Text>
                            <IconArrowRight size={14} />
                            <Text size="sm" fw={500}>{record.plan}</Text>
                          </Group>
                        </Group>
                      )}
                      {record.coverageType !== prevRecord.coverageType && (
                        <Group position="apart" mt={4}>
                          <Text size="sm">Coverage</Text>
                          <Group gap="xs">
                            <Text size="sm">{prevRecord.coverageType}</Text>
                            <IconArrowRight size={14} />
                            <Text size="sm" fw={500}>{record.coverageType}</Text>
                          </Group>
                        </Group>
                      )}
                      {record.status !== prevRecord.status && (
                        <Group position="apart" mt={4}>
                          <Text size="sm">Status</Text>
                          <Group gap="xs">
                            <Badge size="sm" color={getStatusColor(prevRecord.status)}>
                              {getStatusText(prevRecord.status)}
                            </Badge>
                            <IconArrowRight size={14} />
                            <Badge size="sm" color={getStatusColor(record.status)}>
                              {getStatusText(record.status)}
                            </Badge>
                          </Group>
                        </Group>
                      )}
                      {Math.abs(record.chargeAmount - prevRecord.chargeAmount) > 0.01 && (
                        <Group position="apart" mt={4}>
                          <Text size="sm">Premium</Text>
                          <Group gap="xs">
                            <Text size="sm">{formatCurrency(prevRecord.chargeAmount)}</Text>
                            <IconArrowRight size={14} />
                            <Text size="sm" fw={500}>{formatCurrency(record.chargeAmount)}</Text>
                          </Group>
                        </Group>
                      )}
                    </Box>
                  </Grid.Col>
                )}
              </Grid>
            </Card>
          </Box>
        );
      })}
    </Box>
  );
};


const EnhancedTable: React.FC<EnhancedTableProps> = ({
  data,
  onViewDetails,
  onExportData,
  onContactEmployee
}) => {
  const [activePage, setPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;

  const monthYearOptions = useMemo(() => getMonthYearOptions(data), [data]);

  // Set default selected period to latest
  React.useEffect(() => {
    if (!selectedPeriod && monthYearOptions.length > 0) {
      setSelectedPeriod(monthYearOptions[0].value);
    }
  }, [monthYearOptions]);

  const getDataForPeriod = (period: string | null) => {
    if (!period) return data;

    const [selectedMonth, selectedYear] = period.split('-');
    const yearNum = parseInt(selectedYear);

    return data.map(employee => {
      // Check if current record matches selected period
      if (employee.month === selectedMonth && employee.year === yearNum) {
        return employee;
      }

      // Look for matching record in history
      const historicalRecord = employee.history?.find(
        hist => hist.month === selectedMonth && hist.year === yearNum
      );

      if (historicalRecord) {
        return {
          ...employee,
          plan: historicalRecord.plan,
          coverageType: historicalRecord.coverageType,
          status: historicalRecord.status,
          coverageDates: historicalRecord.coverageDates,
          chargeAmount: historicalRecord.chargeAmount,
          month: historicalRecord.month,
          year: historicalRecord.year
        };
      }

      // Return null if no record found for this period
      return null;
    }).filter((emp): emp is Employee => emp !== null);
  };

  const filteredData = useMemo(() => 
    getDataForPeriod(selectedPeriod), 
    [data, selectedPeriod]
  );

  const getPaginatedData = () => {
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredData.slice(start, end);
  };

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Group position="apart" mb="md">
        <Text size="lg" fw={500}>Employee Records</Text>
        <Select
          label="View records for period"
          placeholder="Select period"
          value={selectedPeriod}
          onChange={setSelectedPeriod}
          data={monthYearOptions}
          style={{ width: 200 }}
          clearable={false}
        />
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Employee Name</Table.Th>
              <Table.Th>Plan</Table.Th>
              <Table.Th>Coverage Type</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Coverage Period</Table.Th>
              <Table.Th>Premium</Table.Th>
              <Table.Th>History</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {getPaginatedData().map((employee, index) => (
              <Table.Tr key={`${employee.subscriberName}-${index}`}>
                <Table.Td>
                  <Text fw={500}>
                    {formatSubscriberName(employee.subscriberName)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="blue" variant="light">
                    {employee.plan || 'N/A'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color="cyan" variant="dot">
                    {employee.coverageType || 'Standard'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge 
                    color={getStatusColor(employee.status)}
                    variant="light"
                  >
                    {getStatusText(employee.status)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" align="center">
                    <IconCalendar size={16} style={{ color: '#228be6' }} />
                    <Text size="sm">
                      {formatCoverageDate(employee.coverageDates)}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {formatAmount(employee.chargeAmount)}
                  </Text>
                </Table.Td>
                <Table.Td>
                {employee.history && employee.history.length > 0 && (
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <Tooltip label="View History">
                        <ActionIcon variant="light" color="blue">
                          <IconHistory size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Box p="lg" style={{ width: '600px' }}>
                        <Text fw={500} mb="md">History for {formatSubscriberName(employee.subscriberName)}</Text>
                        <HistoryModal employee={employee} />
                      </Box>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Table.Td>
                <Table.Td>
                  <Group gap={0} justify="flex-end">
                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item 
                          leftSection={<IconEye size={14} />}
                          onClick={() => onViewDetails?.(employee)}
                        >
                          View Details
                        </Menu.Item>
                        <Menu.Item 
                          leftSection={<IconDownload size={14} />}
                          onClick={() => onExportData?.(employee)}
                        >
                          Export Data
                        </Menu.Item>
                        <Menu.Item 
                          leftSection={<IconMail size={14} />}
                          onClick={() => onContactEmployee?.(employee)}
                        >
                          Contact Employee
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Group justify="space-between" mt="md">
        <Text size="sm" c="dimmed">
          Showing {getPaginatedData().length} of {filteredData.length} employees
          {selectedPeriod && ` for ${selectedPeriod}`}
        </Text>
        {filteredData.length > ITEMS_PER_PAGE && (
          <Pagination 
            value={activePage}
            onChange={setPage}
            total={Math.ceil(filteredData.length / ITEMS_PER_PAGE)}
            size="sm"
            radius="md"
            withEdges
          />
        )}
      </Group>
    </Card>
  );
};

export default EnhancedTable; 