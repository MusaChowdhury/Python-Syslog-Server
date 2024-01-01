"use client";

import { useState, useEffect, useContext } from "react";
import { Box, Button, TextField } from "@mui/material";
import { textRandom, toTitleCase, textSequential } from "@/app/api/textEffect";
import { sharedStatesContext } from "../sharedContext";
import { createAdmin, eligibleForAdmin } from "@/app/auth";
import { useRouter } from "next/navigation";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import {
  isValidNumber,
  isValidPassword,
  isValidUserName,
} from "@/app/api/validators";
import Collapse from "@mui/material/Collapse";
import CheckIcon from "@mui/icons-material/Check";

const description = "Detected no users in the system.";

export default function CreateAdmin() {
  // Display Purpose And Validation
  const router = useRouter();
  const { setTitleVar, setDescriptionVar } = useContext(sharedStatesContext);
  const [phoneVar, phoneVarSet] = useState("");
  const [passVar, passVarSet] = useState("");
  const [userVar, userVarSet] = useState("");
  let title = "Create Admin";

  let phone = "Phone Number";
  let pass = "Password";
  let user = "Name";

  function defaultDescription(speed = 1) {
    textRandom(title, setTitleVar, 7 * speed);
    textRandom(description, setDescriptionVar, 2 * speed);
    textRandom(phone, phoneVarSet, 10 * speed);
    textRandom(pass, passVarSet, 15 * speed);
    textRandom(user, userVarSet, 20 * speed);
  }

  const checkUsers = async () => {
    let response = await eligibleForAdmin();
    if (response === "error") {
      router.replace("/error");
    } else if (response.status != true) {
      router.replace("/login");
    } else {
      defaultDescription();
    }
  };
  useEffect(() => {
    checkUsers();
  }, []);
  // Display Purpose And Validation

  const [phoneError, phoneErrorSet] = useState(false);
  const [phoneErrorMsg, phoneErrorMsgSet] = useState(false);
  const [passError, passErrorSet] = useState(false);
  const [passErrorMsg, passErrorMsgSet] = useState(false);
  const [nameError, nameErrorSet] = useState(false);
  const [nameErrorMsg, nameErrorMsgSet] = useState(false);

  const [phoneValue, phoneValueSet] = useState("");
  const [passValue, passValueSet] = useState("");
  const [nameValue, nameValueSet] = useState("");

  const [busy, busySet] = useState(false);
  const [clearedDisplay, clearedDisplaySet] = useState(true);

  function resetDisplay() {
    if (!clearedDisplay) {
      textRandom("Editing", setTitleVar, 1);
      setDescriptionVar("📝");
    }
    clearedDisplaySet(true);
  }

  function handelPhone(value) {
    resetDisplay();
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
    resetDisplay();
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

  function handelName(value) {
    resetDisplay();
    nameErrorSet(false);
    nameErrorMsgSet("");
    let result = isValidUserName(value.target.value);
    if (!(typeof result === "boolean")) {
      nameErrorSet(true);
      nameErrorMsgSet(result);
      if (value.target.value[value.target.value.length - 1] === " ") {
        value.target.value = value.target.value.trim() + " ";
      } else {
        value.target.value = value.target.value.trim();
      }

      value.target.value = toTitleCase(value.target.value);
    } else {
      value.target.value = toTitleCase(value.target.value);
      if (value.target.value[value.target.value.length - 1] === " ") {
        value.target.value = value.target.value.trim() + " ";
      } else {
        value.target.value = value.target.value.trim();
      }
      nameValueSet(value.target.value.trim());
    }
  }

  async function createAdminButton() {
    if (clearedDisplay) {
      textSequential("Confirm", setTitleVar, 1);
      let description = `Name: ${nameValue}\nPhone: ${phoneValue}\nPassword: ${passValue}`;

      textSequential(description, setDescriptionVar, 1);
      clearedDisplaySet(false);
    } else {
      busySet(true);
      let result = await createAdmin(nameValue, phoneValue, passValue);
      if (result) {
        router.replace("/login");
      }
    }
  }

  return (
    <>
      <Box
        sx={{ display: "flex", flexDirection: "column", width: "70%", gap: 2 }}
      >
        <TextField
          required
          label={userVar}
          defaultValue=""
          onChange={handelName}
          error={nameError}
          helperText={nameErrorMsg}
        />
        <TextField
          required
          onChange={handelPhone}
          error={phoneError}
          helperText={phoneErrorMsg}
          label={phoneVar}
          defaultValue=""
        />
        <TextField
          required
          label={passVar}
          type="text"
          autoComplete="current-password"
          onChange={handelPassword}
          error={passError}
          helperText={passErrorMsg}
        />
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            justifyContent: "flex-end",
          }}
        >
          <Box sx={{ display: "flex" }}>
            <Collapse
              in={
                nameValue.length > 1 &&
                phoneValue.length > 1 &&
                passValue.length > 1 &&
                !phoneError &&
                !passError &&
                !nameError &&
                !busy
              }
            >
              <Button variant="outlined" onClick={createAdminButton}>
                {clearedDisplay ? <AddCircleOutlineIcon /> : <CheckIcon />}
              </Button>
            </Collapse>
          </Box>
        </Box>
      </Box>
    </>
  );
};
