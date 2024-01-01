"use client";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import {
  Typography,
  Box,
  TextField,
  Autocomplete,
  CircularProgress,
  Paper,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useEffect, useState } from "react";
import {
  getAllEngine,
  getDownloadToken,
  getHistory,
  query,
  queryCount,
  supportedQuery,
} from "@/app/auth";
import { DateTime } from "luxon";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import Checkbox from "@mui/material/Checkbox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import { useTheme } from "@emotion/react";
import { isValidPort, validateInputText } from "@/app/api/validators";
import { MaterialReactTable } from "material-react-table";
import { getDonwloadURL } from "@/app/backendFunctions";

const formStyle = {
  xs: "100%",
  lg: "31%",
};

function Demo() {
  return (
    <Alert severity="info" sx={{ width: "100%" }}>
      Select Some Fields To Continue, Also You Can Search By Partial Value.
      <br></br>
      <strong>Example</strong>: Lets Say A Field Contains Multiple Programming
      Langue Names (Java, JavaScript, C).<br></br>
      {`If You Search For The Field With Value "Java", then Names Which Contains
      "Java" (From Staring) Will Be Shown. So The Search Result Will Be Java &
      JavaScript.`}
    </Alert>
  );
}

export default function Download() {
  const [clientsUnified, setClientsUnified] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dates, setDate] = useState([]);
  const [clientLoading, setClientLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [allFields, setAllFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const theme = useTheme();
  const [dateIsBusy, setDateIsBusy] = useState({});
  useEffect(() => {
    let clients = [];
    getAllEngine().then((result) => {
      Object.keys(result).forEach((__class) => {
        for (let engine of result[__class]) {
          for (let name in engine.clients) {
            let _client = {};
            _client["name"] = name;
            _client["ip"] = engine.clients[name][0];
            _client["size"] = engine.clients[name][1];
            _client["engine"] = engine.configs.engine_name;
            _client["interface"] = engine.others.interface_port;
            clients.push(_client);
          }
        }
      });
      setClientsUnified(clients);
      setClientLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedClient) {
      const dateList = [];
      getHistory(getClients()[selectedClient].interface).then((result) => {
        if (
          result.data[getClients()[selectedClient].name] != "no data" &&
          result.data.hasOwnProperty(getClients()[selectedClient].name) &&
          Object.keys(result.data).length != 0
        ) {
          result.data[getClients()[selectedClient].name].forEach((value) => {
            let date = DateTime.fromFormat(value[0], "dd MMMM yyyy");
            dateList.push(date);
            setDateIsBusy((old) => {
              let newIndex = { ...old };
              newIndex[date.toFormat("dd LLLL yyyy")] = value[2] === "busy";
              return newIndex;
            });
          });
        }
        setDate(dateList);
        setHistoryLoading(false);
      });
    }
  }, [selectedClient]);

  function getClients() {
    let clients = {};
    for (let value of clientsUnified) {
      clients[`${value.name} - ${value.ip}`] = {
        name: value.name,
        engine: value.engine,
        interface: value.interface,
        ip: value.ip,
        size: value.size,
      };
    }
    return clients;
  }

  function ifDisable(provided, mode = "date") {
    for (const date of dates) {
      if (mode == "date") {
        if (
          provided.toFormat("dd LLLL yyyy") == date.toFormat("dd LLLL yyyy")
        ) {
          return false;
        }
      } else if (mode == "year") {
        if (provided.toFormat("yyyy") == date.toFormat("yyyy")) {
          return false;
        }
      }
    }
    return true;
  }

  useEffect(() => {
    setSelectedDate(null);
    setSelectedFields([]);
  }, [selectedClient]);

  const [mode, setMode] = useState("query");

  const [downloadConfig, setDownloadConfig] = useState(null);

  useEffect(() => {
    setDownloadConfig(null);
  }, [selectedDate, selectedClient]);

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        p: 1,
        gap: 2,
        scrollbarGutter: "stable",
        flexGrow: 0,
        boxSizing: "border-box",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          p: 1,
        }}
      >
        {!clientLoading ? (
          <>
            <Autocomplete
              id="client_ip"
              onChange={(event, value) => {
                setSelectedClient(value);
              }}
              disablePortal
              options={Object.keys(getClients())}
              sx={{ width: formStyle }}
              renderInput={(params) => (
                <TextField {...params} label="Client [Name - IP]" />
              )}
            />
            {!historyLoading ? (
              selectedClient != null ? (
                <>
                  {dates.length !== 0 ? (
                    <>
                      <LocalizationProvider dateAdapter={AdapterLuxon}>
                        <DatePicker
                          onChange={(date) => {
                            setSelectedDate(date.toFormat("dd LLLL yyyy"));
                          }}
                          label="History Date"
                          sx={{
                            width: formStyle,
                          }}
                          shouldDisableDate={ifDisable}
                          shouldDisableMonth={ifDisable}
                          shouldDisableYear={(date) => ifDisable(date, "year")}
                          format="dd  LLLL  yyyy"
                        />
                      </LocalizationProvider>
                      {selectedDate ? (
                        <FormControl
                          sx={{
                            width: formStyle,
                          }}
                        >
                          <InputLabel id="mode">Mode</InputLabel>
                          <Select
                            labelId="mode"
                            id="mode"
                            value={mode}
                            label="Mode"
                            onChange={(value) => {
                              setMode(value.target.value);
                              if (value.target.value == "full") {
                                let client = getClients()[selectedClient];
                                setDownloadConfig({
                                  interface: client.interface,
                                  name: client.name,
                                  date: selectedDate,
                                });
                                setSelectedFields([]);
                              }
                            }}
                          >
                            <MenuItem value={"full"}>Full Download</MenuItem>
                            <MenuItem value={"query"}>
                              Query With Download
                            </MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <div></div>
                      )}
                      {selectedDate ? (
                        !dateIsBusy[selectedDate] ? (
                          mode == "query" ? (
                            <QuerySelector
                              client={getClients()[selectedClient]}
                              date={selectedDate}
                              forwardToParentSelected={setSelectedFields}
                              forwardToParentAll={setAllFields}
                            />
                          ) : (
                            <DownloadButton
                              configs={downloadConfig}
                              widthStyle={formStyle}
                            />
                          )
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              p: 1,
                              flexGrow: 1,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Typography variant="h7" color="error.main">
                              Engine Is Working On Selected Date, Try 24 Hour
                              Later
                            </Typography>
                          </Box>
                        )
                      ) : (
                        <div></div>
                      )}
                    </>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        p: 1,
                        flexGrow: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h7" color="error.main">
                        No History Found
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <div></div>
              )
            ) : selectedClient !== null ? (
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  p: 1,
                  flexGrow: 1,
                  alignItems: "center",
                }}
              >
                <CircularProgress />
                <Typography>Loading History, Please Wait</Typography>
              </Box>
            ) : (
              <div></div>
            )}
          </>
        ) : (
          <Box
            sx={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              p: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Paper>
      {selectedFields.length != 0 ? (
        <GenerateFields
          fieldsConfig={allFields}
          fields={selectedFields}
          selectedClient={getClients()[selectedClient]}
          selectedDate={selectedDate}
        />
      ) : selectedClient &&
        selectedDate &&
        !dateIsBusy[selectedDate] &&
        mode == "query" ? (
        <Demo />
      ) : (
        <div></div>
      )}
    </Box>
  );
}

function QuerySelector({
  client,
  date,
  forwardToParentSelected,
  forwardToParentAll,
}) {
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState([]);
  const [fieldsError, setFieldsError] = useState(true);
  const [values, setValues] = useState([]);
  useEffect(() => {
    supportedQuery(client.interface, client.name, date).then((result) => {
      if (result.status === true) {
        setFields(result.data);
        forwardToParentAll(result.data);
        setLoading(false);
        setFieldsError(false);
      }
    });
  }, []);

  return (
    <>
      {fieldsError ? (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            p: 1,
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h7" color="error.main">
            Failed To Load Fields For Unknown Reason
          </Typography>
        </Box>
      ) : (
        <Autocomplete
          sx={{
            display: "flex",
            flexGrow: 1,
          }}
          multiple
          value={values}
          onChange={(event, value) => {
            setValues(value);
            forwardToParentSelected(value);
          }}
          options={Object.keys(fields)}
          loading={loading}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox
                icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                checkedIcon={<CheckBoxIcon fontSize="small" />}
                style={{ marginRight: 8 }}
                checked={selected}
              />
              {option}
            </li>
          )}
          renderInput={(params) => {
            return (
              <TextField
                {...params}
                label="Select Fields (Multiple Selectable)"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            );
          }}
        />
      )}
    </>
  );
}

function GenerateFields({
  fieldsConfig,
  fields,
  selectedClient,
  selectedDate,
}) {
  const _formStyle = {
    xs: "100%",
    lg: "19%",
  };
  const [globalInputs, setGlobalInputs] = useState({});

  const [showTable, setShowTable] = useState(false);
  useEffect(() => {
    setShowTable(false);
    let removedFields = [];
    for (let key in globalInputs) {
      if (!fields.includes(key)) {
        removedFields.push(key);
      }
    }
    let inputs = {};
    Object.entries(globalInputs).forEach(([key, value]) => {
      if (!removedFields.includes(key)) {
        inputs[key] = value;
      }
    });
    setGlobalInputs(inputs);
  }, [fields, selectedDate]);

  useEffect(() => {
    setShowTable(false);
    setLoadingCount("");
  }, [globalInputs]);

  const [loadingCount, setLoadingCount] = useState("");
  const [configsForTable, setConfigsForTable] = useState({});
  return (
    <>
      <Paper
        elevation={3}
        sx={{
          display: "flex",
          width: "100%",
          flexWrap: "wrap",
          p: 1,
          gap: 1,
        }}
      >
        {fields.map((value) => {
          return fieldsConfig[value] !== "time" ? (
            <CustomTextField
              id={value + "autoGenerated"}
              sx={{ width: _formStyle }}
              key={value}
              label={value}
              globalInputs={setGlobalInputs}
              validatorType={fieldsConfig[value]}
            />
          ) : (
            <LocalizationProvider
              key={value}
              dateAdapter={AdapterLuxon}
              adapterLocale="en"
            >
              <TimePicker
                sx={{ width: _formStyle }}
                views={["hours", "minutes", "seconds"]}
                onChange={(time) => {
                  if (time) {
                    let formatted = time.toFormat("HH:mm:ss");
                    setGlobalInputs((old) => {
                      let inputs = { ...old };
                      inputs[value] = formatted;
                      return inputs;
                    });
                  }
                }}
                label={"time"}
              />
            </LocalizationProvider>
          );
        })}

        <IconButton
          onClick={() => {
            setLoadingCount(
              `Please Wait While Searching! Database Size: ${selectedClient.size} GB`
            );

            let configurationForTable = {
              port: selectedClient.interface,
              client: selectedClient.name,
              date: selectedDate,
              conditions: globalInputs,
              starting: 0,
              limit: 1,
              total: 0,
            };

            queryCount(
              selectedClient.interface,
              selectedClient.name,
              selectedDate,
              globalInputs
            ).then((result) => {
              if (result.status != true || false) {
                setLoadingCount("Failed To Load Data For Unknown Reason");
                setConfigsForTable({});
              } else {
                if (result.data.total != 0) {
                  setLoadingCount(`Total Log Found: ${result.data.total}`);
                  setShowTable(true);
                  configurationForTable.total = result.data.total;
                  setConfigsForTable(configurationForTable);
                } else {
                  setLoadingCount(
                    `For The Given Fields Value, No Matches Found`
                  );
                  setConfigsForTable({});
                }
              }
            });
          }}
          style={{ backgroundColor: "transparent" }}
          disabled={Object.keys(globalInputs).length != fields.length}
          color="primary"
        >
          <SearchIcon />
        </IconButton>
      </Paper>
      {loadingCount.length != 0 ? (
        !loadingCount.includes("Searching") ? (
          <Alert
            style={{
              boxShadow: 3,
            }}
            severity={loadingCount.includes("Failed") ? "error" : "info"}
          >
            {loadingCount}
          </Alert>
        ) : (
          <Box width={"100%"} alignItems={"center"} gap={1} display={"flex"}>
            <Box
              sx={{
                pt: 1,
              }}
            >
              <CircularProgress />
            </Box>
            <Typography>{loadingCount}</Typography>
          </Box>
        )
      ) : (
        <div></div>
      )}

      {showTable ? (
        <Box
          sx={{
            position: "relative",
          }}
        >
          <Table configs={configsForTable} />
        </Box>
      ) : (
        <div></div>
      )}
    </>
  );
}

function CustomTextField(props) {
  const { globalInputs, validatorType, ...restProps } = props;
  const [helper, setHelper] = useState("");
  useEffect(() => {}, []);
  return (
    <TextField
      error={helper == "" ? false : true}
      {...restProps}
      onChange={(value) => {
        let _value = value.target.value;
        globalInputs((old) => {
          let inputs = { ...old };
          inputs[restProps.label] = _value;
          return inputs;
        });
        if (_value.length == 0) {
          setHelper("Input Can Not Be Empty");
          globalInputs((old) => {
            let inputs = { ...old };
            delete inputs[restProps.label];
            return inputs;
          });
          return;
        }
        if (validatorType == "port") {
          if (isValidPort(_value)) {
            setHelper("");
          } else {
            setHelper("Port Is Invalid");
            globalInputs((old) => {
              let inputs = { ...old };
              delete inputs[restProps.label];
              return inputs;
            });
          }
        } else {
          if (validateInputText(_value)) {
            setHelper("");
          } else {
            setHelper("Input Can Not Contain %");
            globalInputs((old) => {
              let inputs = { ...old };
              delete inputs[restProps.label];
              return inputs;
            });
          }
        }
      }}
      helperText={helper}
    />
  );
}

function DownloadButton({ configs, widthStyle, height = "3.3rem" }) {
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);
  const [token, setToken] = useState("#");
  const [seconds, setSeconds] = useState(0);
  const [expire, setExpire] = useState(false);
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    setLoading(true);
    setRequested(false);
    setToken("");
    setSeconds(null);
    setExpire(false);
    setClicked(false);
  }, [configs]);
  useEffect(() => {
    const click = setInterval(() => {
      setSeconds((old) => {
        if (old <= 0) {
          clearInterval(click);
          if (loading == false) {
            setExpire(true);
          }
          return 0;
        }
        return old - 1;
      });
    }, 1000);
    return () => {
      clearInterval(click);
    };
  }, [token]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: widthStyle,
        backgroundColor: "#60a5fa",
        height: height,
        borderRadius: 1,
        gap: 1,
      }}
    >
      {requested == false ? (
        <Typography
          color={"white"}
          variant="h6"
          sx={{
            cursor: "pointer",
          }}
          onClick={() => {
            setRequested(true);
            let conditions = null;
            if (configs.hasOwnProperty("conditions")) {
              conditions = configs.conditions;
            }
            getDownloadToken(
              configs.interface,
              configs.name,
              configs.date,
              conditions
            ).then((result) => {
              getDonwloadURL().then((url) => {
                setSeconds(result.expire_after_minute * 60 - 20);
                setToken(`${url}?token=${result.token}`);
                setLoading(false);
              });
            });
          }}
        >
          Request
        </Typography>
      ) : null}
      {loading == true && requested == true ? (
        <>
          <CircularProgress color="inherit" />
          <Typography color={"white"} variant="h6">
            Loading
          </Typography>
        </>
      ) : null}
      {loading == false && expire == false ? (
        <Link
          onClick={() => {
            setClicked(true);
            setExpire(true);
            setSeconds(-1);
          }}
          variant="h6"
          color="white"
          href={token}
          underline="none"
        >
          {`Download (Expire After: ${seconds > 0 ? seconds : 0}s)`}
        </Link>
      ) : null}
      {clicked == false && expire == true ? (
        <Typography color={"white"} variant="h6">
          Expired, Try Again
        </Typography>
      ) : null}
      {clicked == true && expire == true ? (
        <Typography color={"white"} variant="h6">
          Check Downloads
        </Typography>
      ) : null}
    </Box>
  );
}

async function getData(configs, limit, offset) {
  const columns = [];
  const rows = [];
  return await query(
    configs.port,
    configs.client,
    configs.date,
    configs.conditions,
    offset,
    limit
  ).then((result) => {
    for (let column of result.data.columns) {
      columns.push({ accessorKey: column, header: column });
    }
    // let idCount = 0;
    for (let _row of result.data.values) {
      let rowAsDict = {};
      for (let i = 0; i < _row.length; ++i) {
        rowAsDict[columns[i].accessorKey] = _row[i];
        // rowAsDict["id"] = idCount;
      }
      rows.push(rowAsDict);
      // idCount += 1;
    }
    return { columns: columns, rows: rows };
  });
}

function Table({ configs }) {
  const rowSize = 20;

  const totalRow = configs.total;

  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState([]);

  const [columns, setColumns] = useState([]);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: rowSize,
  });

  useState(() => {
    getData(configs, rowSize, 0).then((result) => {
      setColumns(result.columns);
      setRows(result.rows);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getData(configs, rowSize, pagination.pageIndex * pagination.pageSize).then(
      (result) => {
        setColumns(result.columns);
        setRows(result.rows);
        setLoading(false);
      }
    );
  }, [pagination.pageIndex]);

  return rows.length == 0 && columns.length == 0 ? (
    <CircularProgress size={"5rem"} />
  ) : (
    <MaterialReactTable
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
      }}
      enableDensityToggle={false}
      initialState={{
        density: "compact",
      }}
      manualPagination={true}
      muiPaginationProps={{
        showRowsPerPage: false,
        rowsPerPageOptions: { value: 15 },
      }}
      muiTableContainerProps={{
        sx: {},
      }}
      data={rows}
      columns={columns}
      enableFullScreenToggle={false}
      onPaginationChange={setPagination}
      state={{ pagination: pagination, isLoading: loading }}
      rowCount={totalRow}
      renderTopToolbarCustomActions={(table, info = configs) => {
        let converted = {
          interface: info.port,
          name: info.client,
          date: info.date,
          conditions: info.conditions,
        };
        return (
          <Box
            sx={{
              display: "flex",
              p: 1,
              width: {
                lg: "20%",
                xs: "60%",
              },
              alignItems: "center",
              gap: 1,
              flexDirection: "column",
            }}
          >
            <Typography>Download Matched Result </Typography>
            {
              <DownloadButton
                configs={converted}
                widthStyle={"100%"}
                height={{
                  lg: "2rem",
                  xs: "4rem",
                }}
              />
            }
          </Box>
        );
      }}
    />
  );
}
