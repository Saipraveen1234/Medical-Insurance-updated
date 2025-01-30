import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Container, Card, Table, Text, Group, Badge, Divider, Select } from '@mantine/core';
import { gql } from '@apollo/client';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorMessage } from './shared/ErrorMessage';

const GET_INVOICE_DATA = gql`
  query GetInvoiceData {
    getInvoiceData {
      invoiceId
      invoiceDate
      coverageDates
      amount
      adjCode
    }
  }
`;

const InvoiceTable = () => {
  const { data, loading, error } = useQuery(GET_INVOICE_DATA);
  const [sortOrder, setSortOrder] = useState<string>("all");

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  if (!data?.getInvoiceData || data.getInvoiceData.length === 0) {
    return (
      <Container size="xl">
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            No invoice data available. Please upload data through the Datasets tab.
          </Text>
        </Card>
      </Container>
    );
  }

  // Process, consolidate, and sort data
  const processedData = [...data.getInvoiceData]
    .sort((a, b) => {
      // Helper function to extract date from coverage dates
      const getDate = (coverageDates) => {
        const match = coverageDates.match(/(\d{2}\/\d{2}\/\d{4})/);
        return match ? new Date(match[1]) : new Date(0);
      };

      // Put October dates first
      const aIsOct = a.coverageDates?.includes('10/01/2024');
      const bIsOct = b.coverageDates?.includes('10/01/2024');
      
      if (aIsOct && !bIsOct) return -1;
      if (!aIsOct && bIsOct) return 1;
      
      // For non-October dates, sort chronologically
      if (!aIsOct && !bIsOct) {
        return getDate(a.coverageDates) - getDate(b.coverageDates);
      }
      
      return 0;
    })
    .reduce((acc, invoice) => {
      const existingRecord = acc.find(
        record => record.invoiceId === invoice.invoiceId && 
                  record.adjCode === "No Adjustments" &&
                  !record.coverageDates.includes('10/01/2024')
      );

      if (existingRecord && invoice.adjCode === "No Adjustments" && 
          !invoice.coverageDates.includes('10/01/2024')) {
        return acc;
      }

      return [...acc, invoice];
    }, []);

  // Filter data based on selected view
  const filteredData = processedData.filter((invoice: any) => {
    if (sortOrder === "10/01/2024") {
      return invoice.coverageDates?.includes('10/01/2024');
    } else if (sortOrder === "other") {
      return !invoice.coverageDates?.includes('10/01/2024');
    }
    return true;
  });

  let octFirstTotal = 0;
  let otherTotal = 0;

  // Format amount display
  const formatAmount = (value: number) => {
    if (value === 0) return '';
    return value < 0 
      ? <Text c="red" fw={500}>-${Math.abs(value).toFixed(2)}</Text>
      : <Text c="dark" fw={500}>${value.toFixed(2)}</Text>;
  };

  return (
    <Container size="xl">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="lg">
          <Text size="lg" fw={600}>Invoice Details</Text>
          <Select
            value={sortOrder}
            onChange={(value) => setSortOrder(value)}
            data={[
              { value: 'all', label: 'All Dates' },
              { value: '10/01/2024', label: '10/01/2024' },
              { value: 'other', label: 'Other 2024 Dates' }
            ]}
            placeholder="Filter by coverage date"
            style={{ width: 200 }}
          />
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice ID</Table.Th>
              <Table.Th>Invoice Date</Table.Th>
              <Table.Th>Coverage Dates</Table.Th>
              <Table.Th>Adj Code</Table.Th>
              <Table.Th>10/01/2024 Amount</Table.Th>
              <Table.Th>2024 Amount</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredData.map((invoice: any) => {
              const isOctFirst = invoice.coverageDates?.includes('10/01/2024');
              const amount = invoice.amount;
              
              // Update totals
              if (isOctFirst) {
                octFirstTotal += amount;
              } else {
                // Only add to other total if it's not a duplicate no-adjustment record
                const isNonOctNoAdj = invoice.adjCode === "No Adjustments" && !isOctFirst;
                if (!isNonOctNoAdj || invoice.adjCode !== "No Adjustments") {
                  otherTotal += amount;
                }
              }

              return (
                <Table.Tr key={`${invoice.invoiceId}-${invoice.coverageDates}-${invoice.adjCode}`}>
                  <Table.Td>
                    <Text fw={500}>{invoice.invoiceId}</Text>
                  </Table.Td>
                  <Table.Td>{invoice.invoiceDate}</Table.Td>
                  <Table.Td>{invoice.coverageDates}</Table.Td>
                  <Table.Td>
                    {invoice.adjCode === "No Adjustments" ? (
                      <Text c="dimmed" fs="italic">
                        {invoice.adjCode}
                      </Text>
                    ) : invoice.adjCode === "Addition" ? (
                      <Badge color="green" variant="light">
                        {invoice.adjCode}
                      </Badge>
                    ) : invoice.adjCode === "Termination" ? (
                      <Badge color="red" variant="light">
                        {invoice.adjCode}
                      </Badge>
                    ) : (
                      <Badge color="blue" variant="light">
                        {invoice.adjCode}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {isOctFirst ? formatAmount(amount) : ''}
                  </Table.Td>
                  <Table.Td>
                    {!isOctFirst ? formatAmount(amount) : ''}
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {/* Totals Row */}
            <Table.Tr>
              <Table.Td colSpan={4} align="right">
                <Text fw={600}>Totals:</Text>
              </Table.Td>
              <Table.Td>
                <Text fw={600} c={octFirstTotal < 0 ? 'red' : 'dark'}>
                  {octFirstTotal !== 0 && (octFirstTotal < 0 ? '-' : '')}
                  ${Math.abs(octFirstTotal).toFixed(2)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text fw={600} c={otherTotal < 0 ? 'red' : 'dark'}>
                  {otherTotal !== 0 && (otherTotal < 0 ? '-' : '')}
                  ${Math.abs(otherTotal).toFixed(2)}
                </Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        {/* Summary Section */}
        <Divider my="lg" />
        <Group justify="flex-end" mt="md" gap="xl">
          <Text size="sm">
            Transactions: {filteredData.length} entries
          </Text>
          <Text size="sm" fw={600}>
            Grand Total: ${Math.abs(octFirstTotal + otherTotal).toFixed(2)}
          </Text>
        </Group>
      </Card>
    </Container>
  );
};

export default InvoiceTable;