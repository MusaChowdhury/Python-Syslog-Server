"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useContext, useRef } from "react";

import { sharedStatesContext } from "./sharedContext";
import { textRandom, textSequential } from "@/app/api/textEffect";
import {
  getAllUsers,
  authorizeUser,
  isSessionValid,
  eligibleForAdmin,
} from "@/app/auth";
import { isValidNumber, isValidPassword } from "@/app/api/validators";

import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Collapse from "@mui/material/Collapse";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { title as globalTitle } from "@/app/info";
import { Box } from "@mui/material";

const description =
  "Supports parallel engines.\nAuto deletes old logs.\nFully responsive UI.\nCustom engine (Written In Python3).\nOptimized for multi-core processors.";

export default function LogIn() {
  // Display Purpose And Validation
  const router = useRouter();
  const { setTitleVar, setDescriptionVar } = useContext(sharedStatesContext);
  const [phoneVar, phoneVarSet] = useState("");
  const [passVar, passVarSet] = useState("");
  let title = globalTitle;

  let phone = "Phone Number";
  let pass = "Password";
  useEffect(() => {
    const checkUsers = async () => {
      let response = await eligibleForAdmin();
      if (response === "error") {
        router.replace("/error");
      } else if (response.status == true) {
        router.replace("/login/create");
      } else if (isSessionValid()) {
        router.replace("/");
      } else {
        textRandom(title, setTitleVar, 10);
        textSequential(description, setDescriptionVar, 1);
        textRandom(phone, phoneVarSet, 10);
        textRandom(pass, passVarSet, 15);
      }
    };
    checkUsers();
  }, []);
  // Display Purpose And Validation

  const [phoneValue, phoneValueSet] = useState("");
  const [passValue, passValueSet] = useState("");

  const [phoneError, phoneErrorSet] = useState(false);
  const [passError, passErrorSet] = useState(false);
  const [phoneErrorMsg, phoneErrorMsgSet] = useState(false);
  const [passErrorMsg, passErrorMsgSet] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState(false);

  function togglePassword() {
    setShowPassword((show) => !show);
  }

  function handelPhone(value) {
    phoneErrorSet(false);
    phoneErrorMsgSet("");
    let result = isValidNumber(value.target.value);
    if (!(typeof result === "boolean")) {
      phoneErrorSet(true);
      phoneErrorMsgSet(result);
      value.target.value = value.target.value.trim().replace(" ", "");
    } else {
      let valueTemp = value.target.value.trim().replace(" ", "");
      if (valueTemp[0] === "0") {
        value.target.value = "0" + parseInt(valueTemp);
      } else {
        value.target.value = parseInt(valueTemp);
      }
      phoneValueSet(value.target.value);
    }
  }

  function handelPassword(value) {
    passErrorSet(false);
    passErrorMsgSet("");
    let result = isValidPassword(value.target.value);
    if (!(typeof result === "boolean")) {
      passErrorSet(true);
      passErrorMsgSet(result);
    } else {
      passValueSet(value.target.value);
    }
  }

  async function logIn() {
    if (await authorizeUser(phoneValue, passValue)) {
      router.replace("/");
    } else {
      setAlert(true);
      phoneErrorSet(true);
      passErrorSet(true);
    }
  }

  return (
    <>
      <Box
        sx={{ display: "flex", flexDirection: "column", width: "70%", gap: 2 }}
      >
        <Collapse in={alert}>
          <Alert
            severity="error"
            onClose={() => {
              setAlert(false);
              phoneErrorSet(false);
              passErrorSet(false);
              phoneErrorMsgSet("");
              passErrorMsgSet("");
            }}
          >
            Invalid Credentials!
          </Alert>
        </Collapse>
        <TextField
          required
          label={phoneVar}
          onChange={handelPhone}
          error={phoneError}
          helperText={phoneErrorMsg}
        />
        <FormControl
          variant="outlined"
          onChange={handelPassword}
          error={passError}
        >
          <InputLabel htmlFor="outlined-adornment-password" required>
            {passVar}
          </InputLabel>
          <OutlinedInput
            id="outlined-adornment-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={togglePassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
            label={passVar}
          />
          <FormHelperText id="outlined-weight-helper-text">
            {passErrorMsg}
          </FormHelperText>
        </FormControl>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            justifyContent: "flex-end",
          }}
        >
          <Box sx={{ display: "flex" }}>
            <Collapse in={!alert}>
              <Button variant="outlined" onClick={logIn}>
                <VpnKeyIcon />
              </Button>
            </Collapse>
          </Box>
        </Box>
      </Box>
    </>
  );
}
