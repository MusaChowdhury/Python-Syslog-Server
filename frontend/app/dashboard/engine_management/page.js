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
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Paper,
  useMediaQuery,
  Divider,
} from "@mui/material";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import SearchIcon from "@mui/icons-material/Search";
import RouterIcon from "@mui/icons-material/Router";
import { useEffect, useState, useRef } from "react";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import { useTheme } from "@mui/material";

export default function View() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const [_class, setClass] = useState("");
  const [classes, setClasses] = useState({});
  const [overlay, setOverlay] = useState(false);

  const classChange = (event) => {
    setClass(event.target.value);
  };

  const engineRefs = useRef(new Map());
  const clientRefs = useRef(new Map());
  const [selectedClients, setSelectedClients] = useState(null);
  const [matchedEngine, setMatchedEngine] = useState([]);
  const [matchedClients, setMatchedClients] = useState([]);

  const [matchedEngineIndex, setMatchedEngineIndex] = useState(-1);
  const [matchedClientsIndex, setMatchedClientsIndex] = useState(-1);

  useEffect(() => {
    const allInfoRefresh = setInterval(() => {
      getAllEngine().then((result) => {
        setClasses(result);
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
    engineRefs.current.forEach((node, name) => {
      if (matchedEngine.includes(name)) {
        node.style.color = theme.palette.success.light;
      } else {
        node.style.color = theme.palette.text.primary;
      }
    });
  }, [matchedEngine]);

  useEffect(() => {
    clientRefs.current.forEach((node, name) => {
      if (matchedClients.includes(name)) {
        node.style.color = theme.palette.success.light;
      } else {
        node.style.color = theme.palette.text.primary;
      }
    });
  }, [matchedClients]);

  useEffect(() => {
    scrollToTarget(matchedEngine[matchedEngineIndex], engineRefs);
  }, [matchedEngineIndex]);

  useEffect(() => {
    scrollToTarget(matchedClients[matchedClientsIndex], clientRefs);
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
            <FormControl // For Engines
              sx={{
                width: {
                  xs: "100%",
                  lg: "20%",
                },
              }}
              variant="outlined"
            >
              <InputLabel>Search By Engine Name</InputLabel>
              <OutlinedInput
                onChange={(event) => {
                  const target = event.target.value.trim().toLowerCase();
                  let matched = [];
                  engineRefs.current.forEach((node, name) => {
                    if (name.includes(target) && target !== "") {
                      matched.push(name);
                    }
                  });
                  setMatchedEngine(matched);
                }}
                type="text"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        if (
                          0 <= matchedEngineIndex &&
                          matchedEngineIndex <= matchedEngine.length - 1
                        ) {
                          if (matchedEngineIndex + 1 >= matchedEngine.length) {
                            setMatchedEngineIndex(0);
                          } else {
                            setMatchedEngineIndex(matchedEngineIndex + 1);
                          }
                        } else {
                          setMatchedEngineIndex(0);
                        }
                      }}
                      edge="end"
                    >
                      {matchedEngine.length == 0 ? (
                        <SearchIcon />
                      ) : (
                        <ImportExportIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                }
                label="Search By Engine Name"
              />
            </FormControl>
            <FormControl
              sx={{
                width: {
                  xs: "100%",
                  lg: "20%",
                },
              }}
            >
              <InputLabel id="demo-simple-select-label">
                {classes[_class] != undefined && classes[_class].length != 0
                  ? `Engine Found: ${classes[_class].length}`
                  : "Class"}
              </InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={_class}
                label={
                  classes[_class] != undefined && classes[_class].length != 0
                    ? `Engine Found: ${classes[_class].length}`
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
          {overlay ? ( //Overlay Started
            <Paper
              elevation={0}
              sx={{
                width: "100%",
                height: "100%",
                p: 1,
                top: 0,
                left: 0,
                display: "flex",
                position: "absolute",
                zIndex: 501,
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  height: "10%",
                  width: "100%",
                  p: 1,
                  flexDirection: "row",
                  justifyContent: "start",
                  alignItems: "center",
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    <IconButton
                      onClick={() => {
                        setOverlay(false);
                      }}
                    >
                      <KeyboardReturnIcon />
                    </IconButton>
                  </Avatar>
                </ListItemAvatar>
                <FormControl // For Clients
                  sx={{
                    width: {
                      xs: "100%",
                      lg: "20%",
                    },
                  }}
                  variant="outlined"
                >
                  <InputLabel>Search By Client Name/IP</InputLabel>
                  <OutlinedInput
                    onChange={(event) => {
                      const target = event.target.value.trim().toLowerCase();
                      let matched = [];
                      clientRefs.current.forEach((node, name) => {
                        if (
                          (name.includes(target) ||
                            node.getAttribute("ip").includes(target)) &&
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
              </Box>
              <List
                sx={{
                  display: "flex",
                  overflow: "auto",
                  gap: 1,
                  flexDirection: "column",
                  p: 1,
                  flexGrow: 1,
                }}
              >
                {selectedClients.length != 0 ? (
                  selectedClients.map(([name, value]) => {
                    return (
                      <Box key={name}>
                        <ListItem
                          name={name}
                          sx={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-around",
                            gap: 1,
                          }}
                        >
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Client Name"}
                            primary={name}
                            ip={value[0]}
                            ref={(element) => {
                              clientRefs.current.set(name, element);
                            }}
                          />
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Client IP"}
                            primary={value[0]}
                          />
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Size on Disk (GB)"}
                            primary={value[1]}
                          />
                        </ListItem>
                        <Divider flexItem />
                      </Box>
                    );
                  })
                ) : (
                  <ListItem>
                    <ListItemText primary={"No Client Under This Engine"} />
                  </ListItem>
                )}
              </List>
            </Paper>
          ) : (
            <div></div> //Overlay Ended
          )}
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
                  classes[_class].map((engine) => {
                    return (
                      <Box key={engine.configs.engine_name}>
                        <ListItem
                          name={engine.engine_name}
                          sx={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-around",
                            gap: 1,
                          }}
                        >
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Engine Name"}
                            primary={engine.configs.engine_name}
                            ref={(element) => {
                              engineRefs.current.set(
                                engine.configs.engine_name,
                                element
                              );
                            }}
                          />
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Engine Port"}
                            primary={engine.configs.engine_port}
                          />
                          {!isSmallScreen ? (
                            <ListItemAvatar>
                              <Avatar sx={{ flex: 1 }}>
                                <IconButton
                                  onClick={() => {
                                    setOverlay(true);
                                    setSelectedClients([
                                      ...Object.entries(engine.clients),
                                    ]);
                                  }}
                                >
                                  <RouterIcon />
                                </IconButton>
                              </Avatar>
                            </ListItemAvatar>
                          ) : (
                            <div></div>
                          )}
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Clients"}
                            primary={Object.entries(engine.clients).length}
                          />
                          {!isSmallScreen ? (
                            <>
                              <ListItemText
                                sx={{ flex: 1 }}
                                secondary={"Keep Original Log"}
                                primary={
                                  engine.configs.keep_original_log
                                    ? "True"
                                    : "False"
                                }
                              />
                              <ListItemText
                                sx={{ flex: 1 }}
                                secondary={"Auto Delete Days"}
                                primary={engine.configs.auto_delete_days}
                              />
                              <ListItemText
                                sx={{ flex: 1 }}
                                secondary={"Size on Disk (GB)"}
                                primary={totalUsedDisk(engine.clients)}
                              />
                              <ListItemText
                                sx={{ flex: 1 }}
                                secondary={"Buffer Size"}
                                primary={engine.configs.buffer_size}
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
                    <ListItemText primary={"No Engine Under This Class"} />
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

function totalUsedDisk(clients) {
  let sum = 0.0;
  for (const client of Object.values(clients)) {
    sum += client[1];
  }
  return sum;
}
