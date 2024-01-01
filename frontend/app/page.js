"use client";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import ScopedCssBaseline from "@mui/material/ScopedCssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import { isSessionValid, alive } from "@/app/auth";
import { Box } from "@mui/material";

export default function View() {
  const router = useRouter();
  useEffect(() => {
    const checkServer = async () => {
      let response = await alive();
      if (response != true) {
        router.replace("/error");
      }
    };
    // for immediate redirect
    if (!isSessionValid()) {
      router.replace("/login");
    } else {
      router.replace("/dashboard");
    }
    checkServer();
  }, []);
  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        width="100vw"
      >
        <ScopedCssBaseline>
          <CircularProgress size="lg" />
        </ScopedCssBaseline>
      </Box>
    </>
  );
}
