import React from 'react';
import { Alert } from '@mantine/core';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <Alert title="Error" color="red">
    {message}
  </Alert>
);