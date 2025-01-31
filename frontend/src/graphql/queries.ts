import { gql } from '@apollo/client';

export const GET_INVOICE_DATA = gql`
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

export const GET_UPLOADED_FILES = gql`
  query GetUploadedFiles {
    getUploadedFiles {
      planName
      fileName
      uploadDate
    }
  }
`;