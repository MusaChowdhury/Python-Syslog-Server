"use client";

import { useState } from "react";
import styles from "./local.module.css";
import { sharedStatesContext } from "./sharedContext";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/system";

export default function AuthLayout({ children }) {
  const [titleVar, setTitleVar] = useState("");
  const [descriptionVar, setDescriptionVar] = useState("");
  const theme = useTheme();
  const isLGScreen = useMediaQuery(theme.breakpoints.up("lg"));
  return (
    <>
      <Box
        className={isLGScreen ? `${styles.duel_tone}` : `${styles.whiteBG}`}
        sx={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box
          className={`${styles.shadow}`}
          sx={{
            display: "flex",
            width: {
              lg: "50%",
              xs: "100%",
            },
            height: {
              lg: "60%",
              xs: "100%",
            },
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 2,
          }}
        >
          {!isLGScreen ? null : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: "40%",
                justifyContent: "center",
                alignItems: "center",
                p: 5,
                overflow: "hidden",
                gap: 1,
              }}
            >
              <Typography
                variant="h4"
                align="left"
                sx={{ width: "100%", fontWeight: "bold" }}
              >
                {titleVar}
              </Typography>
              <ul
                style={{
                  width: "100%",
                  paddingLeft: "5%",
                  listStyleType: "disc",
                }}
              >
                {descriptionVar.split("\n").map((line, index) => (
                  <li key={index} style={{ width: "100%" }}>
                    <Typography
                      variant="h6"
                      sx={{
                        overflow: "hidden",
                        width: "100%",
                        fontSize: '1rem'
                      }}
                    >
                      {line}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              width: !isLGScreen ? "100%" : "60%",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                gap: 1,
              }}
            >
              {isLGScreen ? null : (
                <Typography
                  variant="h4"
                  align="center"
                  sx={{
                    width: "100%",
                    fontWeight: "bold",
                    color: "#60a5fa",
                  }}
                >
                  {titleVar}
                </Typography>
              )}
              <sharedStatesContext.Provider
                value={{ setTitleVar, setDescriptionVar }}
              >
                {children}
              </sharedStatesContext.Provider>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}