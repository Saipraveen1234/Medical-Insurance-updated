import React from "react";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";

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
    <ListItemButton
      onClick={onClick}
      selected={active}
      sx={{
        mb: 1,
        backgroundColor: active ? "#0395B7" : "#2A3036",
        color: "white",
        "&:hover": {
          backgroundColor: active ? "#0395B7" : "#3a4248",
        },
        "&.Mui-selected": {
          backgroundColor: "#0395B7",
          "&:hover": {
            backgroundColor: "#0395B7",
          },
        },
      }}
    >
      <ListItemIcon sx={{ color: "inherit" }}>{icon}</ListItemIcon>
      <ListItemText primary={label} />
    </ListItemButton>
  );
};

export default NavButton;