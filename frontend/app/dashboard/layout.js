"use client";
import { getPallet } from "./theme";
import { useState, useMemo, useEffect, useRef, forwardRef, use } from "react";
import ScopedCssBaseline from "@mui/material/ScopedCssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { List, useMediaQuery } from "@mui/material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import MenuIcon from "@mui/icons-material/Menu";
import { textSequential } from "../api/textEffect";
import { navigationIndex } from "./navigation";
import { title as globalTitle } from "@/app/info";
import Paper from "@mui/material/Paper";
import anime from "animejs";
import CloseIcon from "@mui/icons-material/Close";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { getTime } from "@/app/auth";
import { ErrorContext, TimeContext } from "./context";
import {
  getUser,
  timeRemainsInSeconds,
  isSessionValid,
  renewSession,
  clearSession,
  alive,
} from "@/app/auth";
import LogoutIcon from "@mui/icons-material/Logout";
import Clock from "./components/clock";
import { getServerIP } from "../backendFunctions";
function DashboardLayout({ children }) {
  const router = useRouter();
  const [readToRender, setReadToRender] = useState(false);
  const [title, setTitleVar] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  function toggleDark() {
    setDarkMode((value) => !value);
  }
  let theme = useMemo(() => {
    return createTheme(getPallet(darkMode));
  }, [darkMode]);

  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  const drawerR = useRef(null);
  const appBarR = useRef(null);
  const contentR = useRef(null);
  const mDrawerR = useRef(null);

  const refs = [appBarR, contentR, drawerR];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  function animation() {
    var timeline = anime.timeline({
      easing: "easeInOutSine",
      duration: 500,
    });
    function fadeChild(parentRef) {
      const children = parentRef.current
        ? Array.from(parentRef.current.children)
        : [];
      return {
        targets: children.filter((child) => child !== null),
        opacity: [0, 1],
        duration: 100,
      };
    }
    let drawer = {
      targets: drawerR.current,
      width: {
        value: ["0%", "15%"],
      },
      height: {
        value: ["0%", "100%"],
      },

      complete: function (stat) {
        anime(fadeChild(drawerR));
      },
      padding: theme.spacing(1),
    };

    let content = {
      targets: contentR.current,
      width: {
        value: ["0%", "100%"],
      },
      height: {
        value: ["0%", "92%"],
      },
      complete: function (stat) {
        anime(fadeChild(contentR));
      },
      padding: theme.spacing(1),
      complete: function (stat) {
        setContentReady(true);
      },
    };

    let appBar = {
      targets: appBarR.current,
      width: {
        value: ["0%", "100%"],
      },
      height: {
        value: ["0%", "8%"],
      },
      complete: function (stat) {
        let animation = fadeChild(appBarR);

        animation["complete"] = async function (stat) {
          await textSequential(globalTitle, setTitleVar, 2);
          timeline.play();
        };
        anime(animation);
        timeline.pause();
      },
      padding: theme.spacing(1.5),
    };

    if (!isSmallScreen) {
      timeline.add(appBar).add(drawer).add(content);
    } else {
      timeline.add(appBar).add(content);
    }
  }

  function handelDrawer() {
    if (!isDrawerOpen) {
      anime({
        targets: mDrawerR.current,
        translateX: 0,
        direction: 300,
      });
      setIsDrawerOpen(true);
    } else {
      anime({
        targets: mDrawerR.current,
        translateX: -window.innerWidth,
        direction: 300,
      });
      setIsDrawerOpen(false);
    }
  }
  useEffect(() => {
    refs.forEach((parentRef) => {
      if (parentRef.current) {
        if (parentRef) {
          const childElements = parentRef.current.children;
          Array.from(childElements).forEach((child) => {
            child.style.opacity = 0;
          });
        }
      }
    });

    if (!isSessionValid()) {
      router.replace("/login");
    } else {
      setReadToRender(true);
    }

    // for session validation
    const sessionChecker = setInterval(() => {
      if (!isSessionValid()) {
        router.replace("/login");
        return;
      }
    }, 1000);
    // for session validation

    // for session renew
    const sessionRenewer = async () => {
      try {
        if (timeRemainsInSeconds() < 60) {
          if (!(await renewSession())) {
            throw new Error();
          }
        }
      } catch (error) {
        router.replace("/login");
      }
    };
    const renewer = setInterval(sessionRenewer, 2000);
    // for session renew

    // for checking server is alive
    const checkServer = async () => {
      let response = await alive();
      if (response != true) {
        router.replace("/error");
      }
    };
    const backendChecker = setInterval(checkServer, 2000);
    // for checking server is alive
    return () => {
      clearInterval(sessionChecker);
      clearInterval(renewer);
      clearInterval(backendChecker);
    };
  }, []);

  useEffect(() => {
    if (readToRender) {
      animation();
    }
  }, [readToRender]);

  // for clock and date
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTimeFull, setCurrentTimeFull] = useState("");

  useEffect(() => {
    let initial = null;

    if (!initial) {
      getTime()
        .then((response) => {
          return response.data.time;
        })
        .then((response) => {
          initial = DateTime.fromISO(response, { setZone: true });
          setCurrentDate(initial.toFormat("dd LLLL yyyy"));
        });
    }

    const click = () => {
      if (initial) {
        initial = initial.plus({ seconds: 1 });
        let time = initial.toFormat("hh.mm.ss a");
        let zone = initial.toFormat("ZZ");
        setCurrentTime(time);
        setCurrentTimeFull(time + " " + zone);
      }
    };

    const fromServer = async () => {
      await getTime()
        .then((response) => {
          return response.data ? response.data.time : "";
        })
        .then((response) => {
          initial = DateTime.fromISO(response);
          setCurrentDate(initial.toFormat("dd LLLL yyyy"));
        });
    };

    const intervalInternal = setInterval(click, 1000);
    const intervalServer = setInterval(fromServer, 1000 * 60);

    return () => () => {
      clearInterval(intervalInternal);
      clearInterval(intervalServer);
    };
  }, []);

  // for clock and date

  // for engine error title
  const [engineError, setEngineError] = useState("");
  // for engine error title
  const [serverIP, setServerIP] = useState("");
  useEffect(() => {
    getServerIP().then((ip) => {
      setServerIP("[Server IP: "+ip+"]");
    });
  }, []);
  return (
    <>
      <ThemeProvider theme={theme}>
        <ScopedCssBaseline>
          <Box
            sx={{
              display: "flex",
              width: "100vw",
              height: "100vh",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              boxSizing: "border-box",
              p: {
                xs: 0,
                lg: 5,
              },
              gap: {
                xs: 0,
                lg: 3,
              },
              opacity: readToRender ? 1 : 0,
              flexGrow: 0,
            }}
          >
            {/* Drawer */}
            {!isSmallScreen ? (
              <DesktopDrawerF ref={drawerR}>
                <GetNavigation index={navigationIndex} />
              </DesktopDrawerF>
            ) : (
              <MobileDrawerF
                ref={mDrawerR}
                zIndex={999}
                currentTimeFull={currentTimeFull}
                currentDate={currentDate}
                engineError={engineError}
                serverIP={serverIP}
              >
                <GetNavigation
                  index={navigationIndex}
                  mobileCloseCallback={handelDrawer}
                />
              </MobileDrawerF>
            )}
            {/* Drawer */}

            <Box
              sx={{
                display: "flex",
                width: {
                  xs: "100%",
                  lg: "85%",
                },
                height: "100%",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: {
                  xs: 0,
                  lg: 2,
                },
                flexGrow: 0,
              }}
            >
              <Paper // App Bar
                square={isSmallScreen}
                elevation={4}
                ref={appBarR}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    width: {
                      xs: "60%",
                      lg: "30%",
                    },
                    height: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {isSmallScreen ? (
                    <IconButton onClick={handelDrawer}>
                      {!isDrawerOpen ? <MenuIcon /> : <CloseIcon />}
                    </IconButton>
                  ) : (
                    <Box></Box>
                  )}
                  <Typography
                    variant="h6"
                    align="left"
                    sx={{
                      width: "100%",
                      fontWeight: "bold",
                      color: !darkMode ? "primary.main" : "primary.dark",
                    }}
                  >
                    {title}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    width: {
                      xs: "40%",
                      lg: "70%",
                    },
                    height: "100%",
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <IconButton
                    style={{ backgroundColor: "transparent" }}
                    onClick={() => {
                      try {
                        router.replace("/");
                        clearSession();
                      } catch {
                        router.replace("/");
                      }
                    }}
                  >
                    <LogoutIcon />
                  </IconButton>
                  <IconButton
                    onClick={toggleDark}
                    style={{ backgroundColor: "transparent" }}
                  >
                    {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                  </IconButton>
                  {!isSmallScreen ? (
                    <>
                      <Box
                        sx={{
                          height: "100%",
                        }}
                      >
                        <TimeContext.Provider
                          value={{ currentTimeFull, currentDate }}
                        >
                          <Clock />
                        </TimeContext.Provider>
                      </Box>
                      <Typography color="error.main" fontWeight="bold">
                        {engineError}
                      </Typography>
                      <Typography>{serverIP}</Typography>
                    </>
                  ) : (
                    <div></div>
                  )}
                </Box>
              </Paper>
              <Paper // Content
                square={isSmallScreen}
                elevation={isSmallScreen ? 1 : 4}
                ref={contentR}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  boxSizing: "border-box",
                  flexGrow: 0,
                }}
              >
                <TimeContext.Provider value={{ currentTime }}>
                  <ErrorContext.Provider value={setEngineError}>
                    {contentReady ? children : <Box></Box>}
                  </ErrorContext.Provider>
                </TimeContext.Provider>
              </Paper>
            </Box>
          </Box>
        </ScopedCssBaseline>
      </ThemeProvider>
    </>
  );
}

function UserInfo() {
  const theme = useTheme();

  const [name, setName] = useState("");
  const [admin, setAdmin] = useState("");
  useEffect(() => {
    let user = getUser();
    if (user) {
      setName(user.user_name);
      setAdmin(user.is_admin === true ? "Admin" : "User");
    }
  }, []);
  return (
    <>
      <Box
        sx={{
          height: {
            xs: "14%",
            lg: "10%",
          },
          width: "100%",
          padding: 1,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "row",
            backgroundColor:
              theme.palette.mode === "dark"
                ? theme.palette.primary.dark
                : theme.palette.primary.main,
            cursor: "none",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              padding: 1,
              width: "70%",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <Typography color="white" noWrap>
              {name}
            </Typography>
          </Box>
          <Divider
            variant="middle"
            orientation="vertical"
            flexItem
            sx={{
              borderWidth: 0.3,
              borderColor: "white",
            }}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              padding: 1,
              width: "30%",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <Typography color="white" noWrap>
              {admin}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </>
  );
}

const DesktopDrawerF = forwardRef(function DesktopDrawer({ children }, ref) {
  return (
    <>
      <Paper
        elevation={4}
        ref={ref}
        sx={{
          display: "flex",
          width: "15%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        {UserInfo()}
        {children}
      </Paper>
    </>
  );
});

const MobileDrawerF = forwardRef(function MobileDrawer(
  { children, zIndex, currentDate, currentTimeFull, engineError, serverIP },
  ref
) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));

  useEffect(() => {
    anime({
      targets: ref.current,
      translateX: -window.innerWidth,
      duration: 0,
    });
  }, []);
  return (
    <>
      <Paper
        ref={ref}
        elevation={12}
        sx={{
          position: "absolute",
          top: "11%",
          left: "4%",
          display: "flex",
          width: "92%",
          height: "86%",
          flexDirection: "column",
          alignItems: "center",
          zIndex: zIndex,
          overflowY: "auto",
          opacity: 1,
        }}
      >
        {isSmallScreen ? (
          <Box
            sx={{
              display: "flex",
              width: "100%",
              padding: 1,
            }}
          >
            <TimeContext.Provider value={{ currentDate, currentTimeFull }}>
              <Clock />
            </TimeContext.Provider>
          </Box>
        ) : (
          <></>
        )}
        <Typography>{serverIP}</Typography>
        {UserInfo()}
        <Typography color="error.main" fontWeight="bold">
          {engineError}
        </Typography>
        {children}
      </Paper>
    </>
  );
});

function GetNavigation({ index, mobileCloseCallback = false }) {
  let pathName = usePathname();
  const theme = useTheme();
  return (
    <>
      <Box sx={{ height: "100%", width: "100%" }}>
        <List sx={{ width: "100%" }}>
          {index.map((nav) =>
            nav.name === "divider" ? (
              <Divider key={nav.name + nav.number} />
            ) : (
              <Link
                href={nav.routing}
                key={nav.name}
                onClick={mobileCloseCallback ? mobileCloseCallback : () => {}}
              >
                <ButtonBase
                  sx={{
                    height: "10%",
                    width: "100%",
                  }}
                >
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <nav.icon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={nav.name}
                      primaryTypographyProps={{
                        style: {
                          color:
                            nav.routing !== "/dashboard"
                              ? pathName.includes(nav.routing)
                                ? theme.palette.primary.main
                                : theme.palette.mode === "light"
                                ? "black"
                                : "white"
                              : pathName === nav.routing
                              ? theme.palette.primary.main
                              : theme.palette.mode === "light"
                              ? "black"
                              : "white",
                        },
                      }}
                    />
                  </ListItem>
                </ButtonBase>
              </Link>
            )
          )}
        </List>
      </Box>
    </>
  );
}

export default DashboardLayout;
