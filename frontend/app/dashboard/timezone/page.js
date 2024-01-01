"use client";
import { getAllTimeZone, getUser, setTImeZone } from "@/app/auth";
import {
  Box,
  Alert,
  Autocomplete,
  TextField,
  Typography,
  Button,
  DialogTitle,
  DialogContentText,
  Dialog,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TimeZone() {
  const router = useRouter();
  const [currentZone, setCurrentZone] = useState("");
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [disable, setDisable] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    getAllTimeZone().then((result) => {
      setCurrentZone(result.data.current_zone);
      setZones([...result.data.all_zones]);
    });
  }, []);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    setIsAdmin(getUser().is_admin === true);
  }, []);
  return (
    <>
      {isAdmin == false ? (
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
                router.push("/dashboard/view_engines");
              }}
              autoFocus
            >
              Okay
            </Button>
          </DialogActions>
        </Dialog>
      ) : (
        <Box
          sx={{
            height: "100%",
            width: "100%",
            p: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {error == true ? (
            <Alert severity="error">
              {`Failed To Change Zone For Unknown Reason`}
            </Alert>
          ) : (
            <Alert severity="warning">
              {`Changing The Time Zone Of The System Can Lead To Unexpected Behavior,
        And It's Generally Not Recommended To Do So Frequently, Especially
        During Runtime. `}{" "}
              <strong>Otherwise, May Cause Data Loss.</strong>
              <br></br>
              {`It Is Better To Change The Zone When The System Is Not
        On High Load Or Engines Are Idle.`}
              <br></br>
              <strong>
                The Full System Will Restart If Time Zone Changes.
              </strong>
            </Alert>
          )}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "start",
              gap: 1,
              pl: {
                xs: 0,
                lg: 2,
              },
            }}
          >
            <Typography>Current Time Zone: </Typography>{" "}
            <Typography>{currentZone}</Typography>
          </Box>
          <Autocomplete
            disablePortal
            id="zone select"
            options={zones}
            onChange={(event, _selected) => {
              setSelected(_selected);
              setDisable(false);
            }}
            sx={{
              pl: {
                xs: 0,
                lg: 2,
              },
              width: {
                xs: "100%",
                lg: "30%",
              },
            }}
            renderInput={(params) => (
              <TextField {...params} label="Time Zone" />
            )}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "row-reverse",
              width: {
                xs: "100%",
                lg: "30%",
              },
            }}
          >
            <Button
              onClick={() => {
                setDisable(true);
                setTImeZone(selected).then((result) => {
                  if (result.status != true) {
                    setSelected(null);
                    setError(true);
                  }
                });
              }}
              disabled={selected == null || disable == true}
              sx={{
                width: {
                  xs: "100%",
                  lg: "40%",
                },
              }}
              variant="contained"
              color="warning"
            >
              Change
            </Button>
          </Box>
        </Box>
      )}
    </>
  );
}
