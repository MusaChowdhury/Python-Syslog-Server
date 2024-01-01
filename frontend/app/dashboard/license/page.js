"use client";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import { useState } from "react";
import { Permission } from "./Permission";
import { Dependencies } from "./Dependencies";

export default function License() {
  
  const [value, setValue] = useState("1");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%", typography: "body1", height: "100%", overflow: "auto" }}>
      <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList onChange={handleChange} aria-label="lab API tabs example">
            <Tab label="Permission" value="1" />
            <Tab label="Dependencies" value="2" />
          </TabList>
        </Box>
        <TabPanel value="1"><Permission/></TabPanel>
        <TabPanel value="2"><Dependencies/></TabPanel>
      </TabContext>
    </Box>
  );
}
