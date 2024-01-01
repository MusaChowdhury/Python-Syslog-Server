"use client";

import { Box, Breadcrumbs, Typography, useTheme } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationIndex } from "./navigation";

export default function ManageLayout({ children }) {
  const theme = useTheme()
  const pathname = usePathname();
  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box
        sx={{
          height: "5%",
          width: "100%",
          display: "flex",
        }}
      >
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{
            display: "flex",
            p: 1,
            justifyContent: "center",
            alignContent: "center",
            height: "100%",
            width: "100%",
          }}
        >
          {navigationIndex.map((index) => {
            return (
              <Link
                key={index.name}
                style={{textDecoration: "none"}}
                color={pathname === index.routing ? "primary.main" : (theme.palette.mode === "dark" ? "white" : "black")}
                href={index.routing}
              >
                <Typography
                  sx={{
                    color: pathname === index.routing ? "primary.main" : (theme.palette.mode === "dark" ? "white" : "black"),
                    userSelect: "none",
                  }}
                >
                  {index.name}
                </Typography>
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>

      <Box
        sx={{
          height: "95%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignContent: "center",
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}