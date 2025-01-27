import React from 'react';
import { Box, Text, Group } from '@mantine/core';

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavButton = ({ icon, label, active, onClick }: NavButtonProps) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: '100%',
        padding: '16px 24px',
        backgroundColor: active ? '#1a1d20' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '8px',
        '&:hover': {
          backgroundColor: '#1a1d20',
        }
      }}
    >
      <Group spacing="sm">
        {icon}
        <Text size="md" c="white" fw={500} sx={{ lineHeight: '1.8' }}>
          {label}
        </Text>
      </Group>
    </Box>
  );
};

export default NavButton;