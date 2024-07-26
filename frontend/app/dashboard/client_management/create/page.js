"use client";

import { createClient, getAllEngine, getUser } from "@/app/auth";
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
import { useEffect, useState } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
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

export default function Create(){
  const [enginesUnified, setEnginesUnified] = useState([]);
  const [engine, setEngine] = useState("");

  useEffect(() => {
    let _engines = [];
    getAllEngine().then((result) => {
      
      Object.keys(result).forEach((__class) => {
        for (let __engine of result[__class]) {
          let _engine = {};
          _engine["engine"] = __engine.configs.engine_name;
          _engine["interface"] = __engine.others.interface_port;
          _engines.push(_engine);
        }
      });
      setEnginesUnified(_engines);
    });
  }, []);

  function getEngines() {
    let result = [];
    for (let value of enginesUnified) {
      result.push(value.engine)
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
              id="engine-selection"
              onChange={(event, value) => {
                setEngine(value);
              }}
              disablePortal
              options={getEngines()}
              sx={{ width: formStyle, height: "100%" }}
              renderInput={(params) => <TextField {...params} label="Engine" />}
            />
          </Box>
          {engine ? <CreateClient engine={getEngine(engine)} /> : <div></div>}
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

function CreateClient({ engine }) {
  const [disableCreate, setDisableCreate] = useState(true);

  const [ip, setIP] = useState("IP");
  const [ipHelper, setIPHelper] = useState("");

  const [name, setName] = useState("Name");
  const [nameHelper, setNameHelper] = useState("");

  const [triggerLoading, setTriggerLoading] = useState(false);

  const [validName, setValidName] = useState(false);
  const [validIP, setValidIP] = useState(false);

  const [error, setError] = useState(false);
  const [msg, setMsg] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (validName && validIP) {
      setDisableCreate(false);
    } else {
      setDisableCreate(true);
    }
  }, [validName, validIP]);

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
                  You Can Not Change <strong>Client Name</strong> Later
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
            <Typography width={{ xs: "50%", lg: "8%" }}>
              Client IP
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
                } catch {}
                value.target.value = target;
                setIP(target);
                setValidIP(true);
              }}
              defaultValue={ip}
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
              p: 1,
              flexDirection: "row",
              gap: 2,
              alignItems: "center",
            }}
          >
            <Typography width={{ xs: "50%", lg: "8%" }} sx>
              Client Name
            </Typography>
            <TextField
              error={validName !== true ? true : false}
              required
              onChange={(value) => {
                setError(false);
                setNameHelper("");
                let target = value.target.value.trim();

                try {
                  if (!/^[a-z0-9_]+$/.test(target)) {
                    setNameHelper(
                      "Name Can Only Contain Lowercase Letters, Digits, and '_'"
                    );
                    setValidName(false);
                    return;
                  }
                  if (!(4 <= target.length && target.length <= 16)) {
                    setNameHelper("Name Length Be Between 4 to 16");
                    setValidName(false);
                    return;
                  }
                } catch {}
                value.target.value = target;
                setName(target);
                setValidName(true);
              }}
              defaultValue={name}
              variant="standard"
              helperText={nameHelper}
            />
          </Box>
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
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => {
                setTriggerLoading(true);
                setDisableCreate(true);
                createClient(engine.interface, name, ip).then((result) => {
                  setTriggerLoading(false);
                  if (result.status !== true) {
                    if (result.error.includes("ip already exists")) {
                      setIPHelper("IP Is Unavailable");
                      setError(true);
                      setMsg("Try Another IP");
                    } else if (
                      result.error.includes("client name already exists")
                    ) {
                      setNameHelper("Name Is Unavailable");
                      setError(true);
                      setMsg("Try Another Name");
                    } else {
                      setError(true);
                      setMsg("Due To Unknown Error Failed To Create Client");
                    }
                  } else {
                    router.push("/dashboard/client_management");
                  }
                });
              }}
            >
              Create
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
