"use client";

import { createUser, getUser } from "@/app/auth";
import {
  Typography,
  Box,
  TextField,
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
import {
  isValidNumber,
  isValidPassword,
  isValidUserName,
} from "@/app/api/validators";
import { toTitleCase } from "@/app/api/textEffect";

export default function Create(){
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
          ></Box>

          <CreateUser />
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
                router.push("/dashboard/user_management");
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

function CreateUser() {
  const [disableCreate, setDisableCreate] = useState(true);

  const [phone, setPhone] = useState("Phone");
  const [phoneHelper, setPhoneHelper] = useState("");
  const [validPhone, setValidPhone] = useState(false);

  const [name, setName] = useState("Name");
  const [nameHelper, setNameHelper] = useState("");
  const [validName, setValidName] = useState(false);

  const [password, setPassword] = useState("Password");
  const [passwordHelper, setPasswordHelper] = useState("");
  const [validPassword, setValidPassword] = useState(false);

  const [triggerLoading, setTriggerLoading] = useState(false);

  const [admin, setAdmin] = useState(false);

  const [error, setError] = useState(false);
  const [msg, setMsg] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (validName && validPhone && validPassword) {
      setDisableCreate(false);
    } else {
      setDisableCreate(true);
    }
  }, [validName, validPhone, validPassword]);

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
                  <strong>Phone Number</strong> Can Not Be{" "}
                  <strong>Changed</strong> Later. Admin Can Control Every Part
                  of The System
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
              Phone
            </Typography>
            <TextField
              error={validPhone !== true ? true : false}
              required
              onChange={(value) => {
                setError(false);
                setPhoneHelper("");
                let target = value.target.value.trim();

                try {
                  if (isValidNumber(target) !== true) {
                    setPhoneHelper(isValidNumber(target));
                    setValidPhone(false);
                    return;
                  }
                } catch {}
                value.target.value = target;
                setPhone(target);
                setValidPhone(true);
              }}
              defaultValue={phone}
              variant="standard"
              helperText={phoneHelper}
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
              Password
            </Typography>
            <TextField
              error={validPassword !== true ? true : false}
              required
              onChange={(value) => {
                setError(false);
                setPasswordHelper("");
                let target = value.target.value;

                try {
                  if (isValidPassword(target) !== true) {
                    setPasswordHelper(isValidPassword(target));
                    setValidPassword(false);
                    return;
                  }
                } catch {}
                value.target.value = target;
                setPassword(target);
                setValidPassword(true);
              }}
              defaultValue={password}
              variant="standard"
              helperText={passwordHelper}
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
              User Name
            </Typography>
            <TextField
              error={validName !== true ? true : false}
              required
              onChange={(value) => {
                setError(false);
                setNameHelper("");
                if (value.target.value[value.target.value.length - 1] === " ") {
                  value.target.value = value.target.value.trim() + " ";
                } else {
                  value.target.value = value.target.value.trim();
                }
                let target = toTitleCase(value.target.value);
                value.target.value = target;
                try {
                  if (isValidUserName(target) !== true) {
                    setNameHelper(isValidUserName(target));
                    setValidName(false);
                    return;
                  }
                } catch {}
                setName(target);
                setValidName(true);
              }}
              defaultValue={name}
              variant="standard"
              helperText={nameHelper}
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
            <Typography width={{ xs: "50%", lg: "7%" }} sx>
              Admin
            </Typography>
            <Switch
              defaultChecked={false}
              onChange={(event) => {
                setAdmin(event.target.value);
              }}
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
                createUser(phone, password, admin, name).then((result) => {
                  setTriggerLoading(false);
                  if (result.status !== true) {
                    if (result.error.includes("with same phone number")) {
                      setPhoneHelper("Phone Number Is Unavailable");
                      setError(true);
                      setMsg("Try Another Phone Number");
                    } else {
                      setError(true);
                      setMsg("Due To Unknown Error Failed To Create User");
                    }
                  } else {
                    router.push("/dashboard/user_management");
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
