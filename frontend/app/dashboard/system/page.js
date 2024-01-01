"use client";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { PieChart, pieArcLabelClasses } from "@mui/x-charts/PieChart";
import { TimeContext } from "../context";
import { useContext, useEffect, useState } from "react";
import { getSystemStatus } from "@/app/auth";

const defaultContainerStyle = {
  height: "49%",
  width: {
    lg: "49%",
    xs: "100%",
  },
  display: "flex",
};

const cpuContainerStyle = {
  height: "49%",
  width: {
    lg: "98.5%",
    xs: "100%",
  },
  display: "flex",
};

function addToList(setList, data, string = true, limit = 5) {
  setList((oldList) => {
    let newList = [...oldList];

    if (newList.length > limit) {
      newList.shift();
    }

    newList.push(string ? String(data) : parseInt(data));

    return newList;
  });
}

export default function SystemStatus() {
  const [systemStatus, setSystemStatus] = useState({});

  const systemChecker = () => {
    getSystemStatus().then((response) => {
      setSystemStatus(response);
    });
  };

  useEffect(() => {
    const systemCheckerInterval = setInterval(systemChecker, 1000);
    return () => {
      clearInterval(systemCheckerInterval);
    };
  }, []);

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        gap: 1,
        overflowY: "auto",
        p: 1,
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box sx={defaultContainerStyle}>
        {systemStatus.disk ? (
          <DiskStatus diskInfo={systemStatus.disk} />
        ) : (
          <Box></Box>
        )}
      </Box>
      <Box sx={defaultContainerStyle}>
        {systemStatus.ram ? (
          <RamStatus ramInfo={systemStatus.ram} />
        ) : (
          <Box></Box>
        )}
      </Box>
      <Box sx={cpuContainerStyle}>
        {systemStatus.cpu ? (
          <CpuStatus cpuInfo={systemStatus.cpu} />
        ) : (
          <Box></Box>
        )}
      </Box>
    </Box>
  );
}

function DiskStatus({ diskInfo }) {
  const theme = useTheme();
  const systemGB = diskInfo.system;
  const systemP = diskInfo.percent_system;
  const logGB = diskInfo.log;
  const logP = diskInfo.percent_log;
  const freeGB = diskInfo.free;
  const freeP = diskInfo.percent_free;
  const total = diskInfo.total;
  const diskStatus = [
    {
      value: systemGB,
      label: "System",
      percent: systemP,
      color: theme.palette.primary.main,
    },
    {
      value: logGB,
      label: "Log",
      percent: logP,
      color: theme.palette.error.main,
    },
    {
      value: freeGB,
      label: "Free",
      percent: freeP,
      color: theme.palette.success.main,
    },
  ];
  return (
    <Paper
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        p: 1,
      }}
    >
      <Typography variant="h7" textAlign={"right"} padding={1}>
        Total Disk Space: {total} GB
      </Typography>
      <PieChart
        sx={{
          [`& .${pieArcLabelClasses.root}`]: {
            fill: theme.palette.mode === "dark" ? "black" : "white",
          },
        }}
        series={[
          {
            arcLabel: (item) => `${item.percent}%`,
            arcLabelMinAngle: 40,
            data: diskStatus,
            valueFormatter: (value) => {
              return `${value.value} GB`;
            },
            highlightScope: { faded: "global", highlighted: "item" },
            faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
          },
        ]}
      />
    </Paper>
  );
}

function CpuStatus({ cpuInfo }) {
  const theme = useTheme();
  const name = cpuInfo.details;
  const percent = cpuInfo.percent;
  const core = cpuInfo.core;
  const { currentTime } = useContext(TimeContext);

  const [times, setTimes] = useState(["", "", "", "", ""]);
  const [percents, setPercents] = useState([0, 0, 0, 0, 0]);

  useEffect(() => {
    addToList(setPercents, percent, false, 10);
    addToList(setTimes, currentTime, true, 10);
  }, [currentTime]);

  return (
    <Paper
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        p: 1,
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: {
            xs: "column-reverse",
            lg: "row-reverse",
          },
          p: 1,
          flexWrap: "nowrap",
        }}
      >
        <Typography variant="h7" textAlign={"right"}>
          Logical Core: {core}
        </Typography>

        <Typography
          variant="h7"
          sx={{
            display: {
              xs: "none",
              lg: "block",
            },
          }}
        >
          ,&nbsp;
        </Typography>
        <Typography
          variant="h7"
          textAlign={"right"}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Name: {name}
        </Typography>
      </Box>

      <LineChart
        series={[
          {
            data: percents,
            label: "Processor",
            area: true,
            showMark: false,
            valueFormatter: (value) => {
              return `${value} %`;
            },
            color: theme.palette.secondary.main,
          },
        ]}
        yAxis={[
          {
            min: 0,
            max: 100,
            valueFormatter: (value) => {
              return `${value} %`;
            },
          },
        ]}
        xAxis={[{ scaleType: "point", data: times }]}
        sx={{
          ".MuiLineElement-root": {
            display: "none",
          },
        }}
      />
    </Paper>
  );
}

function RamStatus({ ramInfo }) {
  const theme = useTheme();
  const size = ramInfo.total;
  const percent = ramInfo.percent;

  const { currentTime } = useContext(TimeContext);

  const [times, setTimes] = useState(["", "", "", "", ""]);
  const [percents, setPercents] = useState([0, 0, 0, 0, 0]);

  useEffect(() => {
    addToList(setPercents, percent, false);
    addToList(setTimes, currentTime);
  }, [currentTime]);

  return (
    <Paper
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        p: 1,
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: {
            xs: "column-reverse",
            lg: "row-reverse",
          },
          p: 1,
        }}
      >
        <Typography variant="h7" textAlign={"right"}>
          Ram Size: {size} GB
        </Typography>
      </Box>

      <LineChart
        series={[
          {
            data: percents,
            label: "Ram Usage",
            area: true,
            showMark: false,
            valueFormatter: (value) => {
              return `${value} %`;
            },
            color: theme.palette.warning.main,
          },
        ]}
        yAxis={[
          {
            min: 0,
            max: 100,
            valueFormatter: (value) => {
              return `${value} %`;
            },
          },
        ]}
        xAxis={[{ scaleType: "point", data: times }]}
        sx={{
          ".MuiLineElement-root": {
            display: "none",
          },
        }}
      />
    </Paper>
  );
}