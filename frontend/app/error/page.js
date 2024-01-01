"use client";
import { Box, ScopedCssBaseline, Typography } from "@mui/material";
import { useEffect } from "react";
import { alive } from "../auth";
import { useRouter } from "next/navigation";

export default function ServerError(){
  const router = useRouter();
  useEffect(() => {
    const checkServer = async () => {
      let response = await alive();
      if (response === true) {
        router.replace("/");
      }
    };
    const backendChecker = setInterval(checkServer, 1000);
    return () => {
      clearInterval(backendChecker);
    };
  }, []);
  return (
    <ScopedCssBaseline>
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          width: "100wh",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          p: 1,
          gap: 1,
        }}
      >
        <Typography
          variant="h4"
          color="red"
          sx={{
            fontWeight: "bold",
          }}
        >
          {"Critical Error"}
        </Typography>
        <Typography
          variant="h5"
          color="red"
          sx={{
            fontWeight: "bold",
          }}
        >
          {"Backend Server Is Not Running"}
        </Typography>
      </Box>
    </ScopedCssBaseline>
  );
};
