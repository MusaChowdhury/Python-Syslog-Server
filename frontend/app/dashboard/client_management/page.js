"use client";
import { getAllEngine } from "@/app/auth";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  InputAdornment,
  IconButton,
  CircularProgress,
  useMediaQuery,
  Divider,
} from "@mui/material";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "@mui/material";

export default function View() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const [_class, setClass] = useState("");
  const [classes, setClasses] = useState({});

  const classChange = (event) => {
    setClass(event.target.value);
  };

  const clientsRefs = useRef(new Map());
  const [matchedClients, setMatchedClients] = useState([]);
  const [matchedClientsIndex, setMatchedClientsIndex] = useState(-1);

  useEffect(() => {
    const allInfoRefresh = setInterval(() => {
      const classFiltered = {};
      getAllEngine().then((result) => {
        Object.keys(result).forEach((__class) => {
          let clients = [];
          for (let engine of result[__class]) {
            for (let name in engine.clients) {
              let _client = {};
              (_client["name"] = name),
                (_client["ip"] = engine.clients[name][0]);
              _client["size"] = engine.clients[name][1];
              _client["engine"] = engine.configs.engine_name;
              _client["class"] = engine.configs.class;
              _client["port"] = engine.configs.engine_port;
              clients.push(_client);
            }
          }
          classFiltered[__class] = clients;
        });
        setClasses(classFiltered);
      });
    }, 2000);
    return () => {
      clearInterval(allInfoRefresh);
    };
  }, []);

  function scrollToTarget(target, ref) {
    if (ref.current.get(target)) {
      ref.current.get(target).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }

  useEffect(() => {
    clientsRefs.current.forEach((node, name) => {
      if (matchedClients.includes(name)) {
        node.style.color = theme.palette.success.light;
      } else {
        node.style.color = theme.palette.text.primary;
      }
    });
  }, [matchedClients]);

  useEffect(() => {
    scrollToTarget(matchedClients[matchedClientsIndex], clientsRefs);
  }, [matchedClientsIndex]);

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        gap: 1,
        overflow: "hidden",
      }}
    >
      {Object.entries(classes).length != 0 ? (
        <>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: {
                xs: "column",
                lg: "row",
              },
              gap: 1,
              alignItems: "center",
              justifyContent: "start",
              p: 1,
            }}
          >
            <FormControl
              sx={{
                width: {
                  xs: "100%",
                  lg: "25%",
                },
                height: "100%"
              }}
              variant="outlined"
            >
              <InputLabel>Search By Client Name/IP</InputLabel>
              <OutlinedInput
                onChange={(event) => {
                  const target = event.target.value.trim().toLowerCase();
                  let matched = [];
                  clientsRefs.current.forEach((node, name) => {
                    let ip = node.getAttribute("ip");
                    if (
                      (name.includes(target) || ip.includes(target)) &&
                      target !== ""
                    ) {
                      matched.push(name);
                    }
                  });
                  setMatchedClients(matched);
                }}
                type="text"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        if (
                          0 <= matchedClientsIndex &&
                          matchedClientsIndex <= matchedClients.length - 1
                        ) {
                          if (
                            matchedClientsIndex + 1 >=
                            matchedClients.length
                          ) {
                            setMatchedClientsIndex(0);
                          } else {
                            setMatchedClientsIndex(matchedClientsIndex + 1);
                          }
                        } else {
                          setMatchedClientsIndex(0);
                        }
                      }}
                      edge="end"
                    >
                      {matchedClients.length == 0 ? (
                        <SearchIcon />
                      ) : (
                        <ImportExportIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                }
                label="Search By Client Name/IP"
              />
            </FormControl>
            <FormControl
              sx={{
                width: {
                  xs: "100%",
                  lg: "25%",
                },
                height: "100%"
              }}
            >
              <InputLabel id="demo-simple-select-label">
                {classes[_class] != undefined && classes[_class].length != 0
                  ? `Client Found: ${classes[_class].length}`
                  : "Class"}
              </InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={_class}
                label={
                  classes[_class] != undefined && classes[_class].length != 0
                    ? `Client Found: ${classes[_class].length}`
                    : "Class"
                }
                onChange={classChange}
              >
                {Object.keys(classes).map((client_class) => {
                  return (
                    <MenuItem key={client_class} value={client_class}>
                      {client_class}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              flexGrow: 1,
              width: "100%",
              display: "flex",
              overflow: "hidden",
              flexDirection: "column",
            }}
          >
            {classes[_class] != undefined ? (
              <List
                sx={{
                  display: "flex",
                  overflow: "auto",
                  gap: 1,
                  flexDirection: "column",
                  p: 1,
                }}
              >
                {classes[_class].length != 0 ? (
                  classes[_class].map((client) => {
                    return (
                      <Box key={client.name}>
                        <ListItem
                          name={client.name}
                          sx={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-around",
                            gap: 1,
                          }}
                        >
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Assigned Name"}
                            primary={client.name}
                            ip={client.ip}
                            ref={(element) => {
                              clientsRefs.current.set(client.name, element);
                            }}
                          />
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Assigned IPv4"}
                            primary={client.ip}
                          />

                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Assigned Engine"}
                            primary={client.engine}
                          />
                          {!isSmallScreen ? (
                            <>
                              <ListItemText
                                sx={{ flex: 1 }}
                                secondary={"Size on Disk"}
                                primary={client.size + " GB"}
                              />
                              <ListItemText
                                sx={{ flex: 1 }}
                                secondary={"Binding Port"}
                                primary={String(client.port)}
                              />
                              <ListItemText
                                sx={{ flex: 1 }}
                                secondary={"Engine Class"}
                                primary={client.class}
                              />
                            </>
                          ) : (
                            <div></div>
                          )}
                        </ListItem>
                        <Divider flexItem />
                      </Box>
                    );
                  })
                ) : (
                  <ListItem>
                    <ListItemText primary={"No Client Under This Class"} />
                  </ListItem>
                )}
              </List>
            ) : (
              <div></div>
            )}
          </Box>
        </>
      ) : (
        <CircularProgress />
      )}
    </Box>
  );
}
