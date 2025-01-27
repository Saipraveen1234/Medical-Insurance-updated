import { gql } from '@apollo/client';

export const UPLOAD_FILE = gql`
  mutation UploadFile($fileInput: FileInput!) {
    uploadFile(fileInput: $fileInput) {
      success
      message
    }
  }
`;

export const DELETE_FILE = gql`
  mutation DeleteFile($planName: String!) {
    deleteFile(planName: $planName) {
      success
      message
    }
  }
`;