import React from "react";
import { Box, Text, Group } from "@mantine/core";

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({
  icon,
  label,
  active,
  onClick,
}) => {
  return (
    <Box
      onClick={onClick}
      style={{
        width: "100%",
        padding: "16px 24px",
        backgroundColor: active ? "#1a1d20" : "#2A3036", // Change to match navbar background
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: "8px",
      }}
    >
      <Group>
        {icon}
        <Text size="md" color="white" fw={500} style={{ lineHeight: "1.8" }}>
          {label}
        </Text>
      </Group>
    </Box>
  );
};

export default NavButton;
