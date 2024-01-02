"use client";
import { LineChart } from "@mui/x-charts/LineChart";
import { useEffect, useState, useContext } from "react";
import { ErrorContext, TimeContext } from "../context";
import {
  Typography,
  useMediaQuery,
  useTheme,
  Divider,
} from "@mui/material";
import { Box } from "@mui/material";
import { getEngineLoad } from "@/app/auth";

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

export default function EngineStatus({ engineInfo }) {
  const interfacePort = engineInfo.others.interface_port;
  const engineName = engineInfo.configs.engine_name;
  const engineClass = engineInfo.configs.class;
  const enginePort = engineInfo.configs.engine_port;
  const setEngineError = useContext(ErrorContext)
  const { currentTime } = useContext(TimeContext);
  const [incoming, setIncoming] = useState([0, 0, 0, 0, 0]);
  const [rejecting, setRejecting] = useState([0, 0, 0, 0, 0]);
  const [processing, setProcessing] = useState([0, 0, 0, 0, 0]);
  const [saving, setSaving] = useState([0, 0, 0, 0, 0]);
  const [times, setTimes] = useState(["", "", "", "", ""]);
  const [diskFull, setDiskFull] = useState(false);
  const [interfaceError, setInterfaceError] = useState(false);

  useEffect(() => {
    addToList(setTimes, currentTime);
  }, [currentTime]);

  useEffect(() => {
    const timer = setInterval(async () => {
      let load = await getEngineLoad(interfacePort).then((result)=>{
        if(Object.keys(result).length === 0){
          return "error"
        }
        return result
      });
      if (load === "error") {
        setInterfaceError(true);
        clearInterval(timer);
      }
      if (load.server_receiving_log === "no space") {
        setDiskFull(true);
        setEngineError("Disk Space Full, All Engine Is Paused")
      } else {
        setDiskFull(false);
        if(diskFull == true){
          setEngineError("")
        }
      }
      addToList(setProcessing, load.realtime_processing_client_log, false);
      addToList(setRejecting, load.realtime_rejecting_unknown_ip, false);
      addToList(setSaving, load.realtime_saving, false);
      addToList(setIncoming, load.server_receiving_log, false);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  let chats = [
    {
      data: incoming,
      label: "Incoming",
      area: true,
      showMark: false,
      color: "#fa9632",
      hidden: false,
    },
    {
      data: rejecting,
      label: "Rejecting",
      area: true,
      showMark: false,
      color: "red",
      hidden: true,
    },
    {
      data: processing,
      label: "Processing",
      area: true,
      showMark: false,
      color: "blue",
      hidden: false,
    },
    {
      data: saving,
      label: "Saving",
      area: true,
      showMark: false,
      color: "green",
      hidden: true,
    },
  ];

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));


  return (
    <>
      {diskFull ? (
        <Box
          sx={{
            position: "relative",
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="h7" fontWeight={"bold"} color={"error.main"}>
            Engine Is Paused Due To No Disk Space
          </Typography>
          <Divider variant="inset" orientation="horizontal" flexItem />
          <Typography variant="h7">Engine Name: {engineName}</Typography>
          <Divider variant="inset" orientation="horizontal" flexItem />
          <Typography variant="h7">Engine Class: {engineClass}</Typography>
          <Divider variant="inset" orientation="horizontal" flexItem />
          <Typography variant="h7">Engine Port: {enginePort} </Typography>
        </Box>
      ) : (
        <div></div>
      )}
      {!interfaceError && !diskFull ? (
        <Box
          sx={{
            position: "relative",
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              height: "20%",
              width: "100%",
              display: "flex",
              flexDirection: "row",
              p: 1,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: "100%",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyItems: "center",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: "80%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  p: 1,
                }}
              >
                <Typography>{`Engine: ${engineName}, Port: ${enginePort}, Class: ${engineClass}`}</Typography>
              </Box>
              <Box
                sx={{
                  height: "100%",
                  width: "20%",
                  display: "flex",
                  flexDirection: "row-reverse",
                  p: 1,
                  alignItems: "center",
                }}
              >
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              height: "90%",
              width: "100%",
              display: "flex",
              flexDirection: {
                xs: "column",
                lg: "row",
              },
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {chats.map((config) => {
              return PerformanceChart(config, times, isSmallScreen);
            })}
          </Box>
        </Box>
      ) : (
        <Box></Box>
      )}
    </>
  );
}

function PerformanceChart(config, data, smallScreen) {
  let hideOnSmallScreen = config.hidden;
  function small() {
    return smallScreen && hideOnSmallScreen;
  }
  return (
    <Box
      key={String(config.label)}
      sx={{
        width: small() ? 0 : !smallScreen ? "25%" : "100%",
        height: small() ? 0 : !smallScreen ? "100%" : "50%",
        display: "flex",
      }}
    >
      {smallScreen && hideOnSmallScreen ? (
        <Box></Box>
      ) : (
        <LineChart
          id={String(config.label)}
          series={[config]}
          xAxis={[{ scaleType: "point", data: data }]}
          yAxis={[{ tickMinStep: 1, min: 0, max: 140000 }]}
          sx={{
            ".MuiLineElement-root": {
              display: "none",
            },
            m: 1,
          }}
        />
      )}
    </Box>
  );
}