import React from 'react';
import { useQuery } from '@apollo/client';
import { Container, Card, Table, Text, Group } from '@mantine/core';
import { gql } from '@apollo/client';

const GET_INVOICE_DATA = gql`
  query GetInvoiceData {
    getInvoiceData {
      invoiceNumber
      invoiceDate
      coverageDates
      amount
      adjCode
    }
  }
`;

const InvoiceTable = () => {
  const { data, loading, error } = useQuery(GET_INVOICE_DATA);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text color="red">Error: {error.message}</Text>;

  return (
    <Container size="xl">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="lg">
          <Text size="lg" fw={600}>Invoice Details</Text>
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice Number</Table.Th>
              <Table.Th>Invoice Date</Table.Th>
              <Table.Th>Coverage Dates</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
              <Table.Th>Adj Code</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.getInvoiceData?.map((invoice: any) => (
              <Table.Tr key={invoice.invoiceNumber}>
                <Table.Td>{invoice.invoiceNumber}</Table.Td>
                <Table.Td>{invoice.invoiceDate}</Table.Td>
                <Table.Td>{invoice.coverageDates}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  ${invoice.amount.toFixed(2)}
                </Table.Td>
                <Table.Td>{invoice.adjCode}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Container>
  );
};

export default InvoiceTable;