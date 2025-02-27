import React from 'react';
import { Center, Loader } from '@mantine/core';

export const LoadingSpinner: React.FC = () => (
  <Center style={{ height: '100%', minHeight: '200px' }}>
    <Loader size="xl" variant="dots" />
  </Center>
);