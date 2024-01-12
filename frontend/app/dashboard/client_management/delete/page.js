"use client";
import { deleteClient, getAllEngine, getUser } from "@/app/auth";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  ListItemAvatar,
  Avatar,
  Autocomplete,
  CircularProgress,
  useMediaQuery,
  Divider,
  TextField,
} from "@mui/material";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

import ImportExportIcon from "@mui/icons-material/ImportExport";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "@mui/material";
import { useRouter } from "next/navigation";

const formStyle = {
  xs: "100%",
  lg: "25%",
};

export default function Delete(){
  const router = useRouter();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  const [engine, setEngine] = useState("");

  const clientsRefs = useRef(new Map());
  const [matchedClients, setMatchedClients] = useState([]);
  const [matchedClientsIndex, setMatchedClientsIndex] = useState(-1);

  const [clientsUnified, setClientsUnified] = useState([]);
  const [triggerLoading, setTriggerLoading] = useState(false);

  useEffect(() => {
    let clients = [];
    getAllEngine().then((result) => {
      Object.keys(result).forEach((__class) => {
        for (let engine of result[__class]) {
          for (let name in engine.clients) {
            let _client = {};
            (_client["name"] = name), (_client["ip"] = engine.clients[name][0]);
            _client["size"] = engine.clients[name][1];
            _client["engine"] = engine.configs.engine_name;
            _client["class"] = engine.configs.class;
            _client["port"] = engine.configs.engine_port;
            _client["interface"] = engine.others.interface_port;
            clients.push(_client);
          }
        }
      });
      setClientsUnified(clients);
    });
  }, []);

  function getEngines() {
    let result = [];
    for (let value of clientsUnified) {
      if (!result.includes(value.engine)) {
        result.push(value.engine);
      }
    }
    return result;
  }

  function getClients(selectedEngine) {
    let result = [];
    for (let value of clientsUnified) {
      if (selectedEngine == value.engine) {
        result.push(value);
      }
    }
    return result;
  }

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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [selectedClient, setSelectedClient] = useState({});

  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    setIsAdmin(getUser().is_admin === true);
  }, []);

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
      {isAdmin ? (
        <>
          <Dialog open={confirmOpen} onClose={() => {}}>
            <DialogTitle>{"Confirm Client Deletion"}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {!deleteSuccess
                  ? `'${selectedClient.name}' Will Be Deleted. Deleting An Client Will Also Delete All Data. This Action Is IRREVERSIBLE`
                  : deleteSuccess}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              {!deleteSuccess ? (
                <Button
                  onClick={() => {
                    setTriggerLoading(false);
                    setConfirmOpen(false);
                  }}
                >
                  Disagree
                </Button>
              ) : (
                <div></div>
              )}
              <Button
                onClick={() => {
                  if (!deleteSuccess) {
                    setTriggerLoading(true);
                    if (!deleteSuccess)
                      deleteClient(
                        selectedClient.interface,
                        selectedClient.name
                      ).then((result) => {
                        if (result.status === true) {
                          router.push("/dashboard/client_management/");
                        } else {
                          if (result.error.includes("client is busy")) {
                            setDeleteSuccess(
                              `Client '${selectedClient.name}' Is Busy. Try Later`
                            );
                          } else {
                            setDeleteSuccess(
                              "Failed To Delete Client For Unknown Reason"
                            );
                          }
                        }
                      });
                  } else {
                    setConfirmOpen(false);
                    setDeleteSuccess(null);
                  }
                  setTriggerLoading(false);
                }}
                autoFocus
              >
                {!deleteSuccess ? "Agree" : "Return"}
              </Button>
            </DialogActions>
          </Dialog>
          {clientsUnified && !triggerLoading ? (
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
                    width: formStyle,
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
                <Autocomplete
                  onChange={(event, value) => {
                    setEngine(value);
                  }}
                  disablePortal
                  options={getEngines()}
                  sx={{ width: formStyle, height: "100%" }}
                  renderInput={(params) => (
                    <TextField {...params} label="Engine" />
                  )}
                />
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
                {engine ? (
                  <List
                    sx={{
                      display: "flex",
                      overflow: "auto",
                      gap: 1,
                      flexDirection: "column",
                      p: 1,
                    }}
                  >
                    {getClients(engine).map((client) => {
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
                              ip={client.ip}
                              secondary={"Assigned Name"}
                              primary={client.name}
                              ref={(element) => {
                                clientsRefs.current.set(client.name, element);
                              }}
                            />
                            <ListItemText
                              sx={{ flex: 1 }}
                              secondary={"Assigned IPv4"}
                              primary={client.ip}
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
                              </>
                            ) : (
                              <div></div>
                            )}
                            <ListItemAvatar>
                              <Avatar>
                                <IconButton
                                  onClick={() => {
                                    setConfirmOpen(true);
                                    setSelectedClient(client);
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Avatar>
                            </ListItemAvatar>
                          </ListItem>
                          <Divider flexItem />
                        </Box>
                      );
                    })}
                  </List>
                ) : (
                  <div></div>
                )}
              </Box>
            </>
          ) : (
            <CircularProgress />
          )}
        </>
      ) : (
        <Dialog open={true} onClose={() => {}}>
          <DialogTitle>{"Access Denied"}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This Page Is Restricted For Users
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                router.push("/dashboard/client_management");
              }}
              autoFocus
            >
              Okay
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};