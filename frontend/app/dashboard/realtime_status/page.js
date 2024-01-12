"use client";

import { getAllEngine, getUser } from "@/app/auth";
import { getWebsocketURL } from "@/app/backendFunctions";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

const formStyle = {
  xs: "100%",
  lg: "25%",
};

export default function RealtimeStatus() {
  const [enginesUnified, setEnginesUnified] = useState([]);
  const [engine, setEngine] = useState(null);
  const [type, setType] = useState("saved");
  useEffect(() => {
    let _engines = [];
    getAllEngine().then((result) => {
      Object.keys(result).forEach((__class) => {
        for (let __engine of result[__class]) {
          let _engine = {};
          _engine["engine"] = __engine.configs.engine_name;
          _engine["log"] = __engine.others.internal_status_websocket_port;
          _engine["saved"] = __engine.others.saved_data_websocket_port;
          _engine["pause"] = undefined;
          _engines.push(_engine);
        }
      });
      setEnginesUnified(_engines);
    });
  }, []);

  function getEngines() {
    let result = [];
    for (let value of enginesUnified) {
      if (!result.includes(value.engine)) {
        result.push(value.engine);
      }
    }
    return result;
  }

  function getEngine(name) {
    for (let value of enginesUnified) {
      if (name === value.engine) {
        return value;
      }
    }
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        width: "100%",
        p: 1,
        flexDirection: "column",
        gap: 2,
        overflow: "hidden",
      }}
    >
      <Alert width={"100%"} severity="info">
        Realtime Status Will Show Only Some But Sequential Entries Provided By
        Server.<br></br>
        All of The Information Is Directly Coming From Engine With Some Delay
        Usually Around Few Seconds.<br></br>
        It Was Done To Improve Performance, As Synchronization With Engine With
        Exact Second Precision Will Case Unnecessary Load On Server.
        <br></br>
        <strong>This Feature Is Intended For Advance Use Case/Debugging</strong>
      </Alert>
      <Box
        sx={{
          display: "flex",
          width: "100%",
          flexDirection: {
            xs: "column",
            lg: "row",
          },
          gap: 1,
          alignItems: "center",
        }}
      >
        <Autocomplete
          id="engine-selection"
          onChange={(event, value) => {
            setEngine(value);
          }}
          disablePortal
          options={getEngines()}
          sx={{ width: formStyle, height: "100%" }}
          renderInput={(params) => <TextField {...params} label="Engine" />}
        />
        {engine ? (
          <FormControl sx={{ width: formStyle, height: "100%" }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(value) => {
                setType(value.target.value);
              }}
            >
              <MenuItem value={"log"}>Internal Log</MenuItem>
              <MenuItem value={"saved"}>Realtime Saving</MenuItem>
              <MenuItem value={"pause"}>Pause</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <div></div>
        )}
      </Box>

      {type && engine ? (
        <Realtime port={getEngine(engine)[type]} clearType={setType} />
      ) : (
        <div></div>
      )}
    </Box>
  );
}

function formatValues(jsonString) {
  try {
    const dictionary = JSON.parse(jsonString);
    const keyValuePairs = Object.entries(dictionary).map(
      ([key, value]) => `${key}: ${value}`
    );
    return keyValuePairs.join("; ");
  } catch {
    return "";
  }
}

function addToList(setList, data, limit = 50) {
  setList((oldList) => {
    let newList = [...oldList];

    if (newList.length > limit) {
      newList.shift();
    }

    newList.push(data);

    return newList;
  });
}

function Realtime({ port }) {
  const [triggerLoading, setTriggerLoading] = useState(true);
  const [log, setLog] = useState([]);
  const listContainer = useRef(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    getWebsocketURL().then((url) => {
      const socketUrl = `${url}?interface=${port}&token=${getUser().token}`;
      setUrl(socketUrl);
    });
  }, [port]);

  useEffect(() => {
    if (url.length == 0) {
      return;
    }
    const socket = new WebSocket(url);

    socket.addEventListener("open", (event) => {
      setTriggerLoading(false);
      setLog([]);
    });

    socket.addEventListener("message", (event) => {
      addToList(setLog, formatValues(event.data));
    });

    socket.addEventListener("close", (event) => {
      if (port != undefined) {
        setTriggerLoading(true);
      } else {
        setTriggerLoading(false);
      }
    });

    return () => {
      socket.close();
    };
  }, [url]);

  useEffect(() => {
    scrollToBottom();
  }, [log]);

  const scrollToBottom = () => {
    if (listContainer.current) {
      listContainer.current.scrollTop = listContainer.current.scrollHeight;
    }
  };

  return (
    <>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          overflowY: "auto",
        }}
      >
        {!triggerLoading ? (
          <List
            ref={listContainer}
            sx={{
              display: "flex",
              overflow: "auto",
              gap: 1,
              flexDirection: "column",
              p: 1,
            }}
          >
            {log.length != 0 ? (
              log.map((item, index) => {
                return (
                  <ListItem key={`item-${index}`}>
                    <ListItemText primary={item} />
                  </ListItem>
                );
              })
            ) : (
              <ListItem>
                <ListItemText primary="Nothing To Show" />
              </ListItem>
            )}
          </List>
        ) : (
          <Box
            sx={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Box>
    </>
  );
}
