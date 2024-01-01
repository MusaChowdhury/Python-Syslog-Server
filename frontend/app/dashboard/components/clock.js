"use client";
import React, { useContext } from "react";
import { Paper, Typography } from "@mui/material";
import { TimeContext } from "../context";

function Clock() {
  const { currentTimeFull, currentDate } = useContext(TimeContext);
  return (
    <>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          height: "100%",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: {
            lg: "row",
            xs: "column",
          },
          gap: 1,
          p: 1,
        }}
      >
        <Typography color="primary.main">{currentDate}</Typography>
        <Typography color="primary.main">{currentTimeFull}</Typography>
      </Paper>
    </>
  );
}

export default Clock;
