"use server";
const axios = require("axios");
import { readFileSync } from "fs";
import { resolve } from "path";

const developmentMode = JSON.parse(
  readFileSync(resolve("../MODE.JSON"), "utf8")
)["DEVELOPMENT"];
const autoConfigFilePath = resolve("../AUTO_CONFIG.JSON");
const globalConfigsFilePath = resolve("../GLOBAL_CONFIG.JSON");
const autoConfigs = JSON.parse(readFileSync(autoConfigFilePath, "utf8"));
const globalConfigs = JSON.parse(readFileSync(globalConfigsFilePath, "utf8"));

let SERVER_SSL_PORT = "443";
let SERVER_SSL_IP = autoConfigs["FAST_API_SERVER_IP_WILL_AUTO_GENERATE"];

let SERVER_IP = "127.0.0.1";
let SERVER_PORT = developmentMode
  ? "2000"
  : globalConfigs["FAST_API_SERVER_PORT"];

export async function getDonwloadURL() {
  if (developmentMode) {
    return `http://${SERVER_IP}:${SERVER_PORT}/download`;
  } else {
    return `https://${SERVER_SSL_IP}:${SERVER_SSL_PORT}/download`;
  }
}

export async function getWebsocketURL() {
  if (developmentMode) {
    return `ws://${SERVER_IP}:${SERVER_PORT}/realtime`;
  } else {
    return `wss://${SERVER_SSL_IP}:${SERVER_SSL_PORT}/realtime`;
  }
}

export async function getServerIP() {
  return `${SERVER_SSL_IP}`;
}

export async function authorizeUser(username, password) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/get/token/json",
      {
        phone_number: username,
        password: password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    .then((result) => {
      return result.data;
    });
}

export async function renewSession(bearer) {
  try {
    return await axios
      .get(`http://${SERVER_IP}:${SERVER_PORT}` + "/renew/session", {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      })
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        return false;
      });
  } catch (error) {
    return false;
  }
}

export async function getAllUsers(bearer) {
  return await axios
    .get(`http://${SERVER_IP}:${SERVER_PORT}` + "/get/all/users", {
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function eligibleForAdmin() {
  return await axios
    .get(`http://${SERVER_IP}:${SERVER_PORT}` + "/eligible_for_admin")
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function alive() {
  return await axios
    .get(`http://${SERVER_IP}:${SERVER_PORT}` + "/alive")
    .then((response) => {
      return response.data.status === true;
    })
    .catch((error) => {
      return "error";
    });
}

export async function createAdmin(username, phone, password) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/create/admin",
      {
        user_name: username,
        phone_number: phone,
        password: password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    .then((response) => {
      if (response.data.status == true) {
        return true;
      }
      return false;
    })
    .catch((error) => {
      return false;
    });
}

export async function createUser(bearer, phone, password, admin, username) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/create/user",
      {
        user_name: username,
        phone_number: phone,
        password: password,
        is_admin: admin,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}

export async function deleteUser(bearer, phone) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/delete/user",
      {
        phone_number: phone,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function convertType(bearer, phone, admin) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/convert/to/admin",
      {
        is_admin: admin,
        phone_number: phone,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function updateSelf(bearer, password, username) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/update/user",
      {
        user_name: username,
        password: password,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function getTime() {
  return await axios
    .get(`http://${SERVER_IP}:${SERVER_PORT}` + "/get/time")
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function getEngineLoad(bearer, port) {
  const headers = {
    Authorization: `Bearer ${bearer}`,
  };
  const payload = {
    port: port,
  };
  return await axios
    .post(`http://${SERVER_IP}:${SERVER_PORT}` + "/get/engine_load", payload, {
      headers: headers,
    })
    .then((response) => {
      return response.data.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function getAllEngine(bearer) {
  return await axios
    .get(`http://${SERVER_IP}:${SERVER_PORT}` + "/get/all_engines", {
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
    })
    .then((response) => {
      if (response.data.status != true) {
        return "error";
      }
      return response.data.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function getSystemStatus(bearer) {
  return await axios
    .get(`http://${SERVER_IP}:${SERVER_PORT}` + "/get/system/status", {
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
    })
    .then((response) => {
      if (response.data.status != true) {
        return "error";
      }
      return response.data.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function editEngine(bearer, keepLog, days, port) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/set/engine_config",
      {
        port: port,
        keep_original_log: keepLog,
        auto_delete_days: days,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      if (response.data.status === true) {
        return true;
      }
      return false;
    })
    .catch((error) => {
      return false;
    });
}

export async function createEngine(bearer, _class, name, port, keepLog) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/create/engine",
      {
        engine_class: _class,
        engine_name: name,
        engine_port: port,
        keep_original_log: keepLog,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function deleteEngine(bearer, engineName) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/delete/engine",
      {
        engine: engineName,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      if (response.data.status === true) {
        return true;
      }
      return false;
    })
    .catch((error) => {
      return "error";
    });
}

export async function createClient(bearer, port, clientName, clientIp) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/add/client",
      {
        port: port,
        client: clientName,
        ip: clientIp,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}

export async function deleteClient(bearer, port, clientName) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/delete/client",
      {
        port: port,
        client: clientName,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}

export async function editClient(bearer, port, clientName, clientIp) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/edit/client",
      {
        port: port,
        client: clientName,
        ip: clientIp,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}

export async function getHistory(bearer, port) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/get/history",
      {
        port: port,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}

export async function supportedQuery(bearer, port, clientName, date) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/get/supported_query",
      {
        port: port,
        client: clientName,
        date: date,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}
export async function query(
  bearer,
  port,
  clientName,
  date,
  conditions,
  starting,
  limit
) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/query",
      {
        port: port,
        client: clientName,
        date: date,
        conditions: conditions,
        starting: starting,
        limit: limit,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}

export async function queryCount(bearer, port, clientName, date, conditions) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/query_count",
      {
        port: port,
        client: clientName,
        date: date,
        conditions: conditions,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}

export async function getDownloadToken(
  bearer,
  port,
  clientName,
  date,
  conditions = null
) {
  let request = {
    port: port,
    client: clientName,
    date: date,
  };
  if (conditions != null) {
    request.conditions = conditions;
  }

  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/get/download_token",
      {
        ...request,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}

export async function getAllTimeZone(bearer) {
  return await axios
    .get(`http://${SERVER_IP}:${SERVER_PORT}` + "/get_all_time_zone", {
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return "error";
    });
}

export async function setTImeZone(bearer, zone) {
  return await axios
    .post(
      `http://${SERVER_IP}:${SERVER_PORT}` + "/set_zone",
      {
        zone: zone,
      },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return false;
    });
}
