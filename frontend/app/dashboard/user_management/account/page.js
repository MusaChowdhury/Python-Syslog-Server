"use client";

import {
  clearSession,
  getUser,
  updateSelf,
} from "@/app/auth";
import {
  Typography,
  Box,
  TextField,
  Divider,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  isValidPassword,
  isValidUserName,
} from "@/app/api/validators";
import { toTitleCase } from "@/app/api/textEffect";

export default function Account(){
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
    </Box>
  );
};

function CreateUser() {
  const [disableCreate, setDisableCreate] = useState(true);

  const [name, setName] = useState("Name");
  const [nameHelper, setNameHelper] = useState("");
  const [validName, setValidName] = useState(false);

  const [password, setPassword] = useState("Password");
  const [passwordHelper, setPasswordHelper] = useState("");
  const [validPassword, setValidPassword] = useState(false);

  const [triggerLoading, setTriggerLoading] = useState(false);

  const [error, setError] = useState(false);

  const [msg, setMsg] = useState(false);

  const router = useRouter();

  let self = getUser();

  useEffect(() => {
    if (validName && validPassword) {
      setDisableCreate(false);
    } else {
      setDisableCreate(true);
    }
  }, [validName, validPassword]);

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
                  <strong>Account Information</strong>
                  <br></br>
                  Phone Number: {self.phone_number}
                  <br></br>
                  User Name: {self.user_name}
                  <br></br>
                  Type: {self.is_admin === true ? "Admin" : "User"}
                  <br></br>
                  <strong>
                    If You Do Not Want To Change Password, Give The Current
                    Password
                  </strong>
                  <br></br>
                  <strong>
                    If You Do Not Want To Change Username, Give The Current
                    UserName
                  </strong>
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
              defaultValue={self.user_name}
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
              startIcon={<SaveIcon />}
              onClick={() => {
                setTriggerLoading(true);
                setDisableCreate(true);
                updateSelf(password, name).then((result) => {
                  if (result.status !== true) {
                    setError(true);
                    setMsg("Due To Unknown Error Failed To Save Information");
                    setTriggerLoading(false);
                  } else {
                    router.push("/");
                    clearSession();
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