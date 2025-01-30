import React from 'react';
import { useQuery } from '@apollo/client';
import { Container, Card, Table, Text, Group, Badge } from '@mantine/core';
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

  // Calculate absolute total (ignoring negative signs)
  const totalAmount = data.getInvoiceData.reduce((sum: number, invoice: any) => 
    sum + Math.abs(invoice.amount), 0);

  return (
    <Container size="xl">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="lg">
          <Text size="lg" fw={600}>Invoice Details</Text>
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice ID</Table.Th>
              <Table.Th>Invoice Date</Table.Th>
              <Table.Th>Coverage Dates</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Adj Code</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.getInvoiceData.map((invoice: any) => (
              <Table.Tr key={`${invoice.invoiceId}-${invoice.amount}-${invoice.adjCode}`}>
                <Table.Td>
                  <Text fw={500}>{invoice.invoiceId}</Text>
                </Table.Td>
                <Table.Td>{invoice.invoiceDate}</Table.Td>
                <Table.Td>{invoice.coverageDates}</Table.Td>
                <Table.Td>
                  {invoice.amount < 0 ? (
                    <Text c="red" fw={500}>
                      -${Math.abs(invoice.amount).toFixed(2)}
                    </Text>
                  ) : (
                    <Text c="dark" fw={500}>
                      ${invoice.amount.toFixed(2)}
                    </Text>
                  )}
                </Table.Td>
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
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {/* Summary Section */}
        <Group mt="xl" justify="flex-end" gap="xl">
          <Text size="sm" c="dimmed">
            Total Records: {data.getInvoiceData.length}
          </Text>
          <Text size="sm" fw={500}>
            Total Amount: ${totalAmount.toFixed(2)}
          </Text>
        </Group>
      </Card>
    </Container>
  );
};

export default InvoiceTable;