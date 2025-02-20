import { gql } from '@apollo/client';

export const GET_INVOICE_DATA = gql`
  query GetInvoiceData {
    getInvoiceData {
      planType
      month
      year
      currentMonthTotal
      previousMonthsTotal
      allPreviousAdjustments
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

export const UPLOAD_FILE = gql`
  mutation UploadFile($fileInput: FileInput!) {
    uploadFile(fileInput: $fileInput) {
      success
      message
      error
    }
  }
`;

export const DELETE_FILE = gql`
  mutation DeleteFile($planName: String!) {
    deleteFile(planName: $planName) {
      success
      message
      error
    }
  }
`;