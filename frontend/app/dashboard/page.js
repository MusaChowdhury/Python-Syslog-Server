"use client";

import { Typography, Box, CircularProgress } from "@mui/material";
import EngineStatus from "./components/engineStatus";
import { getAllEngine } from "@/app/auth";
import {
  useEffect,
  useState,
  useRef,
} from "react";
import SearchIcon from "@mui/icons-material/Search";
import Input from "@mui/material/Input";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import { useTheme } from "@mui/material/styles";

export default function View() {
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllEngine().then((result) => {
      let unifiedEngines = [];
      if (result != "error") {
        Object.keys(result).forEach((key) => {
          const classBasedEngines = result[key];
          classBasedEngines.map((engine_conf) => {
            unifiedEngines.push(engine_conf);
          });
        });
      }
      let readyToPush = [...engines, ...unifiedEngines];
      setEngines(readyToPush);
      setLoading(false);
    });
  }, []);

  return loading ? <CircularProgress /> : <StatusHolder engines={engines} />;
}

function StatusHolder({ engines }) {
  const theme = useTheme();
  const refEngines = useRef([]);

  const [matched, setMatched] = useState([]);

  const [scrollIndex, setScrollIndex] = useState(0);

  useEffect(() => {
    setScrollIndex(matched.length == 0 ? 0 : matched.length - 1);
  }, [matched]);

  function scrollToElement() {
    setScrollIndex(
      scrollIndex - 1 < 0
        ? matched.length == 0
          ? 0
          : matched.length - 1
        : scrollIndex - 1
    );
    if (matched[scrollIndex]) {
      matched[scrollIndex].scrollIntoView({
        behavior: "smooth",
      });
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflowY: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          p: 2,
          justifyItems: "center",
          justifyContent: "start",
          // height: "10%",
          width: "100%",
        }}
      >
        <FormControl variant="standard">
          <InputLabel>Search By Engine Name or Class</InputLabel>
          <Input
            onChange={(value) => {
              let target = value.target.value.toLowerCase().trim();
              let matched_ = [];
              refEngines.current.map((node) => {
                let engineClass = node.getAttribute("_class").toLowerCase();
                let name = node.getAttribute("name").toLowerCase();
                if (
                  (engineClass.includes(target) || name.includes(target)) &&
                  target.length != 0
                ) {
                  node.style.borderColor = theme.palette.success.light;
                  matched_.push(node);
                } else {
                  node.style.borderColor = theme.palette.primary.main;
                }
              });
              setMatched(matched_);
            }}
            startAdornment={
              <InputAdornment
                sx={{ cursor: "pointer" }}
                position="start"
                onClick={scrollToElement}
              >
                {matched.length == 0 ? <SearchIcon /> : <ImportExportIcon />}
              </InputAdornment>
            }
          />
        </FormControl>
      </Box>
      <Box
        sx={{
          display: "flex",
          height: "90%",
          width: "100%",
          overflowY: "auto",
          flexDirection: "column",
          p: 1,
          gap: 2,
        }}
      >
        {engines.length > 0 ? (
          engines.map((engine, index) => {
            return (
              <Box
                ref={(node) => {
                  if (node) {
                    refEngines.current.push(node);
                  }
                }}
                key={engine.configs.engine_name}
                name={engine.configs.engine_name}
                _class={engine.configs.class}
                sx={{
                  display: "flex",
                  width: "100%",
                  height: "60%",
                  p: 1,
                  border: 1,
                  borderRadius: 2,
                  borderColor: "primary.main",
                }}
              >
                <EngineStatus engineInfo={engine}></EngineStatus>
              </Box>
            );
          })
        ) : (
          <Typography sx={{ p: 1 }}>Currently No Engine Is Running</Typography>
        )}
      </Box>
    </Box>
  );
}
