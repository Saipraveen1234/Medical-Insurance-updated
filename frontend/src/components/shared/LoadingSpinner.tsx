// In ./components/shared/LoadingSpinner.tsx
import React from 'react';
import { Box, Loader, Text, Stack } from '@mantine/core';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ 
  message = "Loading data, please wait..." 
}) => {
  return (
    <Box 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh', 
        width: '100%' 
      }}
    >
      <Stack align="center" spacing="xs">
        <Loader size="xl" color="blue" />
        <Text size="sm" color="dimmed" mt="md">{message}</Text>
      </Stack>
    </Box>
  );
};