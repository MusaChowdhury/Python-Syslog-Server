"use client";

import { editClient, getAllEngine, getUser } from "@/app/auth";
import {
  Typography,
  Box,
  TextField,
  Divider,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Autocomplete,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

const formStyle = {
  xs: "100%",
  lg: "25%",
};

export default function Edit() {
  const [clientsUnified, setClientsUnified] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");

  useEffect(() => {
    let clients = [];
    getAllEngine().then((result) => {
      Object.keys(result).forEach((__class) => {
        for (let engine of result[__class]) {
          for (let name in engine.clients) {
            let _client = {};
            (_client["name"] = name),
              (_client["ip"] = engine.clients[name][0]),
              (_client["engine"] = engine.configs.engine_name);
            _client["interface"] = engine.others.interface_port;
            clients.push(_client);
          }
        }
      });
      setClientsUnified(clients);
    });
  }, []);

  function getClients() {
    let clients = {};
    for (let value of clientsUnified) {
      clients[`${value.name} - ${value.ip}`] = {
        name: value.name,
        engine: value.engine,
        interface: value.interface,
        ip: value.ip,
      };
    }
    return clients;
  }

  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    setIsAdmin(getUser().is_admin === true);
  }, []);

  const router = useRouter();

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        width: "100%",
        p: 1,
        flexDirection: "column",
        gap: 1,
      }}
    >
      {isAdmin ? (
        <>
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
              id="client-selection"
              onChange={(event, value) => {
                setSelectedClient(value);
              }}
              disablePortal
              options={Object.keys(getClients())}
              sx={{ width: formStyle, height: "100%" }}
              renderInput={(params) => (
                <TextField {...params} label="Client [Name - IP]" />
              )}
            />
          </Box>
          {selectedClient ? (
            <EditClient client={getClients()[selectedClient]} />
          ) : (
            <div></div>
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

function isValidIP(ipAddress) {
  const parts = ipAddress.split(".");
  if (parts.length > 4) {
    return false;
  }
  for (const part of parts) {
    if (part === "*") {
      continue;
    }
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) {
      return false;
    }
    if (part !== num.toString()) {
      return false;
    }
  }
  return true;
}


function EditClient({ client }) {
  const [disableCreate, setDisableCreate] = useState(true);

  const [ip, setIP] = useState("IP");
  const [ipHelper, setIPHelper] = useState("");

  const [triggerLoading, setTriggerLoading] = useState(false);

  const [validIP, setValidIP] = useState(false);

  const [error, setError] = useState(false);
  const [msg, setMsg] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (validIP) {
      setDisableCreate(false);
    } else {
      setDisableCreate(true);
    }
  }, [validIP]);

  return (
    <Box
      sx={{
        display: "flex",
        flexGrow: 1,
        width: "100%",
        p: 1,
        flexDirection: "column",
        gap: 1,
      }}
    >
      {!triggerLoading ? (
        <>
          <Box
            sx={{
              display: "flex",
              width: "100%",
              p: 1,
              flexDirection: "column",
              gap: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Alert
              severity={error ? "error" : "info"}
              sx={{
                width: "100%",
              }}
            >
              <AlertTitle>{error ? "Error" : "Note"}</AlertTitle>
              {!error ? (
                <>
                  Engine: <strong>{client.engine}</strong>, Client Name:{" "}
                  <strong>{client.name}</strong>, Current IP:{" "}
                  <strong>{client.ip}</strong>
                </>
              ) : (
                msg
              )}
            </Alert>
          </Box>
          <Box
            sx={{
              display: "flex",
              width: "100%",
              height: "10%",
              p: 1,
              flexDirection: "row",
              gap: 2,
              alignItems: "center",
            }}
          >
            <Typography width={{ xs: "50%", lg: "8%" }} sx>
              New IP
            </Typography>
            <TextField
              error={validIP !== true ? true : false}
              required
              onChange={(value) => {
                setError(false);
                setIPHelper("");
                let target = value.target.value.trim();

                try {
                  if (!isValidIP(target)) {
                    setIPHelper("IP Is Invalid");
                    setValidIP(false);
                    return;
                  }
                  if (target === "0.0.0.0" || target === "127.0.0.1") {
                    setIPHelper("IP Must Not Point To Self");
                    setValidIP(false);
                    return;
                  }
                  if (target === client.ip) {
                    setIPHelper("Current IP and Provided IP Are Same");
                    setValidIP(false);
                    return;
                  }
                } catch {}
                value.target.value = target;
                setIP(target);
                setValidIP(true);
              }}
              defaultValue={client.ip}
              variant="standard"
              helperText={ipHelper}
            />
          </Box>
          <Divider flexItem />
          <Box
            sx={{
              display: "flex",
              width: "100%",
              height: "10%",
              pt: 5,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Button
              disabled={disableCreate}
              component="label"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => {
                setTriggerLoading(true);
                setDisableCreate(true);
                editClient(client.interface, client.name, ip).then((result) => {
                  setTriggerLoading(false);
                  if (result.status !== true) {
                    if (result.error.includes("ip already exists")) {
                      setIPHelper("IP Is Unavailable");
                      setError(true);
                      setMsg("Try Another IP");
                    } else {
                      setError(true);
                      setMsg("Due To Unknown Error Failed To Edit Client");
                    }
                  } else {
                    router.push("/dashboard/client_management");
                  }
                });
              }}
            >
              Save
            </Button>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexFlow: 1,
            height: "100%",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            p: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}