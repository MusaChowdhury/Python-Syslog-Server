"use client";

import { editEngine, getAllEngine, getUser } from "@/app/auth";
import {
  Typography,
  Box,
  Autocomplete,
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
import SaveIcon from "@mui/icons-material/Save";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useRouter } from "next/navigation";

const formStyle = {
  xs: "100%",
  lg: "25%",
};

export default function Edit() {
  const router = useRouter();
  const [classes, setClasses] = useState({});
  const [_class, setClass] = useState("");
  const [engines, setEngines] = useState([]);
  const [engine, setEngine] = useState(null);

  useEffect(() => {
    getAllEngine().then((result) => {
      setClasses(result);
    });
  }, []);

  useEffect(() => {
    let _engines = [];
    for (const engine in classes[_class]) {
      let _engine = {};
      let name = classes[_class][engine]["configs"]["engine_name"];
      let port = classes[_class][engine]["others"]["interface_port"];

      let keep_log = classes[_class][engine]["configs"]["keep_original_log"];
      let days = classes[_class][engine]["configs"]["auto_delete_days"];
      _engine["days"] = days;
      _engine["keep_log"] = keep_log;

      _engine["label"] = name;
      _engine["port"] = port;

      _engines.push(_engine);
    }
    setEngines(_engines);
  }, [_class]);

  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    setIsAdmin(getUser().is_admin === true);
  }, []);

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
                height: "100%"
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
            <Autocomplete
              onChange={(event, value) => {
                setEngine(value);
              }}
              disablePortal
              options={engines}
              sx={{ width: formStyle, height: "100%" }}
              renderInput={(params) => <TextField {...params} label="Engine" />}
            />
          </Box>
          {engine != undefined ? <EditEngine configs={engine} /> : <div></div>}
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

function EditEngine({ configs }) {
  const port = configs.port;
  const [keepLog, setKeepLog] = useState(configs.keep_log);
  const [days, setDays] = useState(configs.days);
  const [disableSave, setDisableSave] = useState(true);
  const [daysHelper, setDaysHelper] = useState("");
  const [triggerLoading, setTriggerLoading] = useState(false);
  const router = useRouter();
  const [failedToChange, setFailedToChange] = useState(false);
  const [validDays, setValidDays] = useState(true);

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
      <Dialog open={failedToChange} onClose={() => {}}>
        <DialogTitle>{"Failed To Edit"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Failed To Save Changes for Unknown Reason. App Will Now Redirect To
            Manage Engine. Check If Everything Is Working Or Not. Contact
            Developer If The Issue Persist
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
      {!triggerLoading ? (
        <>
          <Box
            sx={{
              display: "flex",
              width: "100%",
              flexDirection: "column",
              gap: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Alert
              severity="warning"
              sx={{
                width: "100%",
              }}
            >
              <AlertTitle>Warning</AlertTitle>
              {`Do Not Change Settings While The Engine Is Receiving The Client's `}
              Data. <br></br> Also, Do Not Change Settings Frequently. <br></br>
              Doing Either Of These May Result In Permanent 
              <strong> Data Loss</strong>.
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
              defaultChecked={configs.keep_log === true ? true : false}
              onChange={(event) => {
                setKeepLog(event.target.checked);
                if (/^[1-9]\d*$/.test(days) && 2 <= days && days <= 2000) {
                  setDisableSave(false);
                } else {
                  setDisableSave(true);
                }
                if (
                  configs.keep_log == event.target.checked &&
                  configs.days == days
                ) {
                  setDisableSave(true);
                }
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
              Auto Delete After Days
            </Typography>
            <TextField
              error={validDays !== true ? true : false}
              required
              onChange={(value) => {
                setDisableSave(true);
                setDaysHelper("");
                let target = value.target.value.trim();
                value.target.value = target;
                setDays(target);
                try {
                  if (!/^[1-9]\d*$/.test(target)) {
                    setDaysHelper("Days Must Be Integer");
                    setValidDays(false);
                    return;
                  }
                  if (!(2 <= target && target <= 2000)) {
                    setDaysHelper("Days Must Be Between 2 to 2000");
                    setValidDays(false);
                    return;
                  }
                } catch {}
                setDisableSave(false);
                setValidDays(true);
                if (target == configs.days && configs.keep_log == keepLog) {
                  setDisableSave(true);
                }
              }}
              defaultValue={days}
              variant="standard"
              helperText={daysHelper}
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
              disabled={disableSave}
              component="label"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => {
                setTriggerLoading(true);
                editEngine(keepLog, parseInt(days), parseInt(port)).then(
                  (result) => {
                    if (result === true) {
                      router.push("/dashboard/engine_management");
                    } else {
                      setFailedToChange(true);
                    }
                  }
                );
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
