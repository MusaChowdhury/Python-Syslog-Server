"use client";
import { getAllUsers } from "@/app/auth";
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
  CircularProgress,
  useMediaQuery,
  Divider,
} from "@mui/material";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "@mui/material";

export default function View() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  const [category, setCategory] = useState("");

  const [users, setUsers] = useState([]);
  const usersRefs = useRef(new Map());

  const [matchedUsers, setMatchedUsers] = useState([]);
  const [matchedUserIndex, setMatchedUserIndex] = useState(-1);

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
      {users.length != 0 ? (
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
                  lg: "20%",
                },
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
                  lg: "20%",
                },
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
                            secondary={"User Name"}
                            primary={user.user_name}
                            phone={user.phone_number}
                            ref={(element) => {
                              usersRefs.current.set(user.user_name, element);
                            }}
                          />
                          <ListItemText
                            sx={{ flex: 1 }}
                            secondary={"Phone Number"}
                            primary={user.phone_number}
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
      )}
    </Box>
  );
}
