import React, { useState, useMemo } from "react";
import { useQuery } from "@apollo/client";
import {
 Container,
 Card,
 Table,
 Text,
 Badge,
 Stack,
 Accordion,
 Group,
 Pagination,
 SegmentedControl,
} from "@mantine/core";
import { gql } from "@apollo/client";
import { LoadingSpinner } from "./shared/LoadingSpinner";
import "./InvoiceSummaryDashboard.css";
import { ErrorMessage } from "./shared/ErrorMessage";

const GET_INVOICE_DATA = gql`
 query GetInvoiceData {
   getInvoiceData {
     planType
     month
     year
     currentMonthTotal
     previousMonthsTotal
     grandTotal
   }
 }
`;

interface InvoiceData {
 planType: string;
 month: string;
 year: number;
 currentMonthTotal: number;
 previousMonthsTotal: number;
 grandTotal: number;
}

const InvoiceSummaryDashboard = () => {
 const [currentPage, setCurrentPage] = useState(1);
 const [planFilter, setPlanFilter] = useState<'ALL' | 'UHC' | 'UHG'>('ALL');
 const itemsPerPage = 10;

 const { data, loading, error } = useQuery<{ getInvoiceData: InvoiceData[] }>(
   GET_INVOICE_DATA,
   {
     fetchPolicy: "cache-first",
   }
 );

 const groupedByMonth = useMemo(() => {
   if (!data?.getInvoiceData) return {};
   
   const filteredData = data.getInvoiceData.filter(item => {
     if (planFilter === 'ALL') return true;
     return item.planType.startsWith(planFilter);
   });

   return filteredData.reduce(
     (acc: Record<string, any>, item: InvoiceData) => {
       const monthKey = `${item.month}-${item.year}`;
       if (!acc[monthKey]) {
         acc[monthKey] = {
           month: item.month,
           year: item.year,
           uhcPlans: [],
           uhgPlans: [],
         };
       }
       if (item.planType.startsWith("UHC")) {
         acc[monthKey].uhcPlans.push(item);
       } else if (item.planType.startsWith("UHG")) {
         acc[monthKey].uhgPlans.push(item);
       }
       return acc;
     },
     {}
   );
 }, [data, planFilter]);

 const monthOrder = [
   "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
   "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
 ];

 const sortedMonths = useMemo(() => {
   return Object.entries(groupedByMonth).sort(([keyA], [keyB]) => {
     const [monthA, yearA] = keyA.split("-");
     const [monthB, yearB] = keyB.split("-");
     if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
     return monthOrder.indexOf(monthB) - monthOrder.indexOf(monthA);
   });
 }, [groupedByMonth]);

 const totalPages = useMemo(
   () => Math.ceil(sortedMonths.length / itemsPerPage),
   [sortedMonths, itemsPerPage]
 );

 const currentItems = useMemo(() => {
   return sortedMonths.slice(
     (currentPage - 1) * itemsPerPage,
     currentPage * itemsPerPage
   );
 }, [sortedMonths, currentPage, itemsPerPage]);

 const cellStyle = { padding: "8px", textAlign: "center" } as const;

 const formatAmount = (amount: number) => {
   const formatted = `$${Math.abs(amount).toFixed(2)}`;
   return (
     <Text fw={500} c={amount < 0 ? "red" : "inherit"}>
       {amount < 0 ? `-${formatted}` : formatted}
     </Text>
   );
 };

 const getPlanBadgeColor = (planType: string) => {
   if (planType === "UHC-2000") return "blue";
   if (planType === "UHC-3000") return "green";
   if (planType === "UHG-LIFE") return "violet";
   if (planType === "UHG-VISION") return "cyan";
   if (planType === "UHG-DENTAL") return "indigo";
   return "gray";
 };

 const formatPlanType = (planType: string) => {
   if (planType.startsWith("UHG-")) {
     return planType.split("-")[1];
   }
   return planType.replace(/([A-Z])(\d)/g, "$1 $2");
 };

 const calculateGroupTotals = (plans: InvoiceData[]) => {
   return plans.reduce(
     (acc, curr) => ({
       previousMonthsTotal: acc.previousMonthsTotal + curr.previousMonthsTotal,
       currentMonthTotal: acc.currentMonthTotal + curr.currentMonthTotal,
       grandTotal: acc.grandTotal + curr.grandTotal,
     }),
     {
       previousMonthsTotal: 0,
       currentMonthTotal: 0,
       grandTotal: 0,
     }
   );
 };

 const renderMonthData = (monthKey: string, monthData: any) => {
   const uhcTotals = calculateGroupTotals(monthData.uhcPlans);
   const uhgTotals = calculateGroupTotals(monthData.uhgPlans);

   const headerLabelStyle = { flex: "0 0 20%", textAlign: "left" } as const;
   const headerValueStyle = { flex: "1", textAlign: "center" } as const;

   return (
     <>
       <Table highlightOnHover>
         <Table.Thead>
           <Table.Tr>
             <Table.Th style={cellStyle}>Plan Type</Table.Th>
             <Table.Th style={cellStyle}>Previous Months Adjustments</Table.Th>
             <Table.Th style={cellStyle}>Current Month Amount</Table.Th>
             <Table.Th style={cellStyle}>Total</Table.Th>
           </Table.Tr>
         </Table.Thead>
       </Table>
       <Accordion variant="contained" multiple defaultValue={[`${monthKey}-uhc`, `${monthKey}-uhg`]}>
         {monthData.uhcPlans.length > 0 && planFilter !== 'UHG' && (
           <Accordion.Item value={`${monthKey}-uhc`}>
             <Accordion.Control>
               <Group style={{ width: "100%" }} wrap="wrap">
                 <Text fw={700} style={headerLabelStyle}>
                   UHC
                 </Text>
                 <div style={headerValueStyle}>
                   {formatAmount(uhcTotals.previousMonthsTotal)}
                 </div>
                 <div style={headerValueStyle}>
                   {formatAmount(uhcTotals.currentMonthTotal)}
                 </div>
                 <div style={headerValueStyle}>
                   {formatAmount(uhcTotals.grandTotal)}
                 </div>
               </Group>
             </Accordion.Control>
             <Accordion.Panel>
               <Table highlightOnHover className="invoice-summary-table">
                 <Table.Tbody>
                   {monthData.uhcPlans.map(
                     (plan: InvoiceData, index: number) => (
                       <Table.Tr
                         key={`${monthKey}-uhc-${plan.planType}-${index}`}
                       >
                         <Table.Td style={cellStyle}>
                           <Badge
                             color={getPlanBadgeColor(plan.planType)}
                             variant="light"
                             size="lg"
                           >
                             {formatPlanType(plan.planType)}
                           </Badge>
                         </Table.Td>
                         <Table.Td style={cellStyle}>
                           {formatAmount(plan.previousMonthsTotal)}
                         </Table.Td>
                         <Table.Td style={cellStyle}>
                           {formatAmount(plan.currentMonthTotal)}
                         </Table.Td>
                         <Table.Td style={cellStyle}>
                           {formatAmount(plan.grandTotal)}
                         </Table.Td>
                       </Table.Tr>
                     )
                   )}
                 </Table.Tbody>
               </Table>
             </Accordion.Panel>
           </Accordion.Item>
         )}
         {monthData.uhgPlans.length > 0 && planFilter !== 'UHC' && (
           <Accordion.Item value={`${monthKey}-uhg`}>
             <Accordion.Control>
               <Group style={{ width: "100%" }} wrap="wrap">
                 <Text fw={700} style={headerLabelStyle}>
                   UHG
                 </Text>
                 <div style={headerValueStyle}>
                   {formatAmount(uhgTotals.previousMonthsTotal)}
                 </div>
                 <div style={headerValueStyle}>
                   {formatAmount(uhgTotals.currentMonthTotal)}
                 </div>
                 <div style={headerValueStyle}>
                   {formatAmount(uhgTotals.grandTotal)}
                 </div>
               </Group>
             </Accordion.Control>
             <Accordion.Panel>
               <Table highlightOnHover className="invoice-summary-table">
                 <Table.Tbody>
                   {monthData.uhgPlans.map(
                     (plan: InvoiceData, index: number) => (
                       <Table.Tr
                         key={`${monthKey}-uhg-${plan.planType}-${index}`}
                       >
                         <Table.Td style={cellStyle}>
                           <Badge
                             color={getPlanBadgeColor(plan.planType)}
                             variant="light"
                             size="lg"
                           >
                             {formatPlanType(plan.planType)}
                           </Badge>
                         </Table.Td>
                         <Table.Td style={cellStyle}>
                           {formatAmount(plan.previousMonthsTotal)}
                         </Table.Td>
                         <Table.Td style={cellStyle}>
                           {formatAmount(plan.currentMonthTotal)}
                         </Table.Td>
                         <Table.Td style={cellStyle}>
                           {formatAmount(plan.grandTotal)}
                         </Table.Td>
                       </Table.Tr>
                     )
                   )}
                 </Table.Tbody>
               </Table>
             </Accordion.Panel>
           </Accordion.Item>
         )}
       </Accordion>
     </>
   );
 };

 const overallTotals = currentItems.reduce(
   (acc, [monthKey, monthData]) => {
     const monthTotals = calculateGroupTotals([
       ...monthData.uhcPlans,
       ...monthData.uhgPlans,
     ]);
     return {
       grandTotal: acc.grandTotal + monthTotals.grandTotal,
     };
   },
   { grandTotal: 0 }
 );

 let content;
 if (loading) {
   content = <LoadingSpinner />;
 } else if (error) {
   console.error("GraphQL Error:", error);
   content = <ErrorMessage message={error.message} />;
 } else if (!data?.getInvoiceData || data.getInvoiceData.length === 0) {
   content = (
     <Card shadow="sm" p="lg" radius="md">
       <Text c="dimmed">
         No invoice data available. Please upload files through the Datasets
         tab.
       </Text>
     </Card>
   );
 } else {
   content = (
     <Stack>
       <Group justify="space-between" align="center">
         <Text size="xl" fw={700}>
           Insurance Invoice Summary
         </Text>
         <SegmentedControl
           value={planFilter}
           onChange={(value: 'ALL' | 'UHC' | 'UHG') => {
             setPlanFilter(value);
             setCurrentPage(1);
           }}
           data={[
             { label: 'All Plans', value: 'ALL' },
             { label: 'UHC Only', value: 'UHC' },
             { label: 'UHG Only', value: 'UHG' },
           ]}
         />
       </Group>
       <Accordion variant="contained" multiple defaultValue={currentItems.map(([key]) => key)}>
         {currentItems.map(([monthKey, monthData]) => (
           <Accordion.Item key={monthKey} value={monthKey}>
             <Accordion.Control>
               <Stack>
                 <Group justify="space-between" align="center" wrap="wrap">
                   <Text fw={700}>
                     {monthData.month} {monthData.year}
                   </Text>
                   <Group wrap="nowrap" gap={4}>
                     <Text fw={700} size="lg">
                       Total:
                     </Text>
                     <Text fw={700} size="lg">
                       {formatAmount(
                         calculateGroupTotals([
                           ...monthData.uhcPlans,
                           ...monthData.uhgPlans,
                         ]).grandTotal
                       )}
                     </Text>
                   </Group>
                 </Group>
               </Stack>
             </Accordion.Control>
             <Accordion.Panel>
               {renderMonthData(monthKey, monthData)}
             </Accordion.Panel>
           </Accordion.Item>
         ))}
       </Accordion>
       <Table highlightOnHover>
         <Table.Tbody>
           <Table.Tr style={{ backgroundColor: "#f1f3f5" }}>
             <Table.Td style={cellStyle}>
               <Text fw={700} size="lg">
                 Overall Invoice Total:
               </Text>
             </Table.Td>
             <Table.Td style={cellStyle}>
               <Text fw={700} size="lg">
                 {formatAmount(overallTotals.grandTotal)}
               </Text>
             </Table.Td>
           </Table.Tr>
         </Table.Tbody>
       </Table>
       {totalPages > 1 && (
         <Pagination
           total={totalPages}
           value={currentPage}
           onChange={setCurrentPage}
           color="blue"
           size="md"
         />
       )}
     </Stack>
   );
 }

 return (
   <Container size="xl">
     <Card shadow="sm" p="lg" radius="md">
       {content}
     </Card>
   </Container>
 );
};

export default InvoiceSummaryDashboard;