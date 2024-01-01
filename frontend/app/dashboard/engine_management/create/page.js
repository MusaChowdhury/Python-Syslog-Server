"use client";

import { createEngine, getAllEngine, getUser } from "@/app/auth";
import {
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Divider,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
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
  lg: "20%",
};

export default function Create() {
  const [classes, setClasses] = useState({});
  const [_class, setClass] = useState("");

  useEffect(() => {
    getAllEngine().then((result) => {
      setClasses(result);
    });
  }, []);

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
            <FormControl
              sx={{
                width: formStyle,
              }}
            >
              <InputLabel>Class</InputLabel>
              <Select
                value={_class}
                label="Class"
                onChange={(value) => {
                  setClass(value.target.value);
                }}
              >
                {Object.keys(classes).map((_class) => {
                  return (
                    <MenuItem key={_class} value={_class}>
                      {_class}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>
          {_class != "" ? <CreateEngine _class={_class} /> : <div></div>}{" "}
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
                router.push("/dashboard/engine_management");
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

function CreateEngine({ _class }) {
  const [keepLog, setKeepLog] = useState(true);
  const [disableCreate, setDisableCreate] = useState(true);

  const [port, setPort] = useState("Port");
  const [portHelper, setPortHelper] = useState("");

  const [name, setName] = useState("Name");
  const [nameHelper, setNameHelper] = useState("");

  const [triggerLoading, setTriggerLoading] = useState(false);

  const [validName, setValidName] = useState(false);
  const [validPort, setValidPort] = useState(false);

  const [error, setError] = useState(false);
  const [msg, setMsg] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (validName && validPort) {
      setDisableCreate(false);
    } else {
      setDisableCreate(true);
    }
  }, [validName, validPort]);

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
                  You Can Not Change <strong>Engine Name</strong> and{" "}
                  <strong>Engine Port</strong> Later
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
            <Typography width={{ xs: "50%", lg: "11%" }} sx>
              Keep Original Log
            </Typography>
            <Switch
              checked={keepLog}
              onChange={(event) => {
                setKeepLog(event.target.checked);
              }}
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
            <Typography width={{ xs: "50%", lg: "12%" }} sx>
              Engine Port
            </Typography>
            <TextField
              error={validPort !== true ? true : false}
              required
              onChange={(value) => {
                setError(false);
                setPortHelper("");
                let target = value.target.value.trim();

                try {
                  if (!/^[1-9]\d*$/.test(target)) {
                    setPortHelper("Port Must Be Integer");
                    setValidPort(false);
                    return;
                  }
                  if (!(2000 <= target && target <= 40000)) {
                    setPortHelper("Port Must Be Between 2000 to 40000");
                    setValidPort(false);
                    return;
                  }
                } catch {}
                value.target.value = target;
                setPort(target);
                setValidPort(true);
              }}
              defaultValue={port}
              variant="standard"
              helperText={portHelper}
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
            <Typography width={{ xs: "50%", lg: "12%" }} sx>
              Engine Name
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
                createEngine(_class, name, port, keepLog).then((result) => {
                  setTriggerLoading(false);
                  if (result.status !== true) {
                    if (result.error.includes("invalid port")) {
                      setPortHelper("Port Is Unavailable");
                      setError(true);
                      setMsg("Try Another Port");
                      setValidPort(false);
                    } else if (result.error.includes("same name")) {
                      setNameHelper("Name Is Unavailable");
                      setError(true);
                      setMsg("Try Another Name");
                      setValidName(false);
                    } else {
                      setError(true);
                      setMsg("Due To Unknown Error Failed To Create Engine");
                    }
                  } else {
                    router.push("/dashboard/engine_management");
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