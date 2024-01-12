"use client";
import { deleteUser, getAllUsers, getUser } from "@/app/auth";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  InputAdornment,
  IconButton,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  useMediaQuery,
  Divider,
  Button,
  Typography,
} from "@mui/material";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import DeleteIcon from "@mui/icons-material/Delete";

export default function Delete() {
  const router = useRouter();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  const [category, setCategory] = useState("");

  const [users, setUsers] = useState([]);
  const usersRefs = useRef(new Map());

  const [matchedUsers, setMatchedUsers] = useState([]);
  const [matchedUserIndex, setMatchedUserIndex] = useState(-1);

  const [dialog, setDialog] = useState(false);

  function getUsers(type) {
    let _users = [];
    for (let user of users) {
      if (type === "admin") {
        if (user.is_admin === true) {
          _users.push(user);
        }
      } else if (type === "user") {
        if (user.is_admin !== true) {
          _users.push(user);
        }
      } else if (type === "all") {
        _users.push(user);
      }
    }
    return _users;
  }

  const categoryChange = (event) => {
    setCategory(event.target.value);
  };

  useEffect(() => {
    const allInfoRefresh = setInterval(() => {
      const _users = [];
      getAllUsers().then((result) => {
        result.data.users.forEach((user) => {
          _users.push(user);
        });
        setUsers(_users);
      });
    }, 2000);
    return () => {
      clearInterval(allInfoRefresh);
    };
  }, []);

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
    usersRefs.current.forEach((node, name) => {
      if (matchedUsers.includes(name)) {
        node.style.color = theme.palette.success.light;
      } else {
        node.style.color = theme.palette.text.primary;
      }
    });
  }, [matchedUsers]);

  useEffect(() => {
    scrollToTarget(matchedUsers[matchedUserIndex], usersRefs);
  }, [matchedUserIndex]);

  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    setIsAdmin(getUser().is_admin === true);
  }, []);

  const [selectedUser, setSelectedUser] = useState({});
  const [dialogMsg, setDialogMsg] = useState("");
  const [triggerLoading, setTriggerLoading] = useState(false);

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
      <Dialog open={dialog} onClose={() => {}} fullWidth>
        <DialogTitle>Delete</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              width: "100%",
              p: 1,
              flexDirection: "row",
              gap: 2,
              alignItems: "center",
            }}
          >
            {dialogMsg == "" ? (
              <>
                <Typography>
                  {`Delete (Phone:${selectedUser.phone_number}, Name: ${selectedUser.user_name})?`}
                </Typography>
              </>
            ) : (
              dialogMsg
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!(triggerLoading == true)) {
                setDialog(false);
                setSelectedUser({});
                setDialogMsg("");
              }
            }}
          >
            Return
          </Button>
          {dialogMsg == "" ? (
            <Button
              onClick={() => {
                setDialogMsg("Working...");
                setTriggerLoading(true);
                deleteUser(selectedUser.phone_number).then((result) => {
                  if (result.status === true) {
                    setDialogMsg(
                      `Phone:${selectedUser.phone_number}, Name: ${selectedUser.user_name} Is Deleted Successfully`
                    );
                  } else if (
                    result.error &&
                    result.error.includes("can not delete yourself")
                  ) {
                    setDialogMsg("You Can Not Delete Your Own Account");
                  } else {
                    setDialogMsg(
                      "Failed To Delete Type Because Of Unknown Reason"
                    );
                  }
                  setTriggerLoading(false);
                });
              }}
              autoFocus
            >
              Okay
            </Button>
          ) : (
            <div></div>
          )}
        </DialogActions>
      </Dialog>
      {isAdmin ? (
        users.length != 0 && !triggerLoading ? (
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
              <FormControl // For Users
                sx={{
                  width: {
                    xs: "100%",
                    lg: "25%",
                  },
                  height: "100%"
                }}
                variant="outlined"
              >
                <InputLabel>Search By Name/Phone</InputLabel>
                <OutlinedInput
                  onChange={(event) => {
                    const target = event.target.value.trim().toLowerCase();
                    let matched = [];
                    usersRefs.current.forEach((node, name) => {
                      let phone = node.getAttribute("phone");
                      let _name = name.toLowerCase();
                      if (
                        (_name.includes(target) || phone.includes(target)) &&
                        target !== ""
                      ) {
                        matched.push(name);
                      }
                    });
                    setMatchedUsers(matched);
                  }}
                  type="text"
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => {
                          if (
                            0 <= matchedUserIndex &&
                            matchedUserIndex <= matchedUsers.length - 1
                          ) {
                            if (matchedUserIndex + 1 >= matchedUsers.length) {
                              setMatchedUserIndex(0);
                            } else {
                              setMatchedUserIndex(matchedUserIndex + 1);
                            }
                          } else {
                            setMatchedUserIndex(0);
                          }
                        }}
                        edge="end"
                      >
                        {matchedUsers.length == 0 ? (
                          <SearchIcon />
                        ) : (
                          <ImportExportIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="Search By Name/Phone"
                />
              </FormControl>
              <FormControl
                sx={{
                  width: {
                    xs: "100%",
                    lg: "25%",
                  },
                  height: "100%"
                }}
              >
                <InputLabel id="demo-simple-select-label">
                  {category != undefined && getUsers(category).length != 0
                    ? `User Found: ${getUsers(category).length}`
                    : "Type"}
                </InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={category}
                  label={
                    category != undefined && getUsers(category).length != 0
                      ? `User Found: ${getUsers(category).length}`
                      : "Type"
                  }
                  onChange={categoryChange}
                >
                  <MenuItem value={"admin"}>Admins</MenuItem>
                  <MenuItem value={"user"}>Users</MenuItem>
                  <MenuItem value={"all"}>All</MenuItem>
                </Select>
              </FormControl>
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
              {category != "" ? (
                <List
                  sx={{
                    display: "flex",
                    overflow: "auto",
                    gap: 1,
                    flexDirection: "column",
                    p: 1,
                  }}
                >
                  {getUsers(category).length != 0 ? (
                    getUsers(category).map((user) => {
                      return (
                        <Box key={user.phone_number}>
                          <ListItem
                            sx={{
                              width: "100%",
                              display: "flex",
                              justifyContent: "space-around",
                              gap: 1,
                            }}
                          >
                            <ListItemText
                              sx={{ flex: 1 }}
                              width={"auto"}
                              secondary={`Name: ${user.user_name}`}
                              primary={`Phone: ${user.phone_number}`}
                              phone={user.phone_number}
                              ref={(element) => {
                                usersRefs.current.set(user.user_name, element);
                              }}
                            />
                            {!isSmallScreen ? (
                              <>
                                <ListItemText
                                  sx={{ flex: 1 }}
                                  secondary={"Type"}
                                  primary={
                                    user.is_admin === true ? "Admin" : "User"
                                  }
                                />
                              </>
                            ) : (
                              <div></div>
                            )}
                            <ListItemAvatar>
                              <Avatar sx={{ flex: 1 }}>
                                <IconButton
                                  onClick={() => {
                                    setDialog(true);
                                    setSelectedUser(user);
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
                    })
                  ) : (
                    <ListItem>
                      <ListItemText primary={"No User Under This Type"} />
                    </ListItem>
                  )}
                </List>
              ) : (
                <div></div>
              )}
            </Box>
          </>
        ) : (
          <CircularProgress />
        )
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