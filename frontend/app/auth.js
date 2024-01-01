import * as backend from "./backendFunctions";

export function clearSession() {
  localStorage.clear();
}

function saveSession(value) {
  localStorage.setItem("user", JSON.stringify(value));
}

function decodeJWT(token) {
  try {
    let [header, payload, signature] = token.split(".");
    let parsed = JSON.parse(atob(payload));
    parsed["token"] = token;
    return parsed;
  } catch (error) {
    return false;
  }
}

export function isSessionValid() {
  try {
    let userData = JSON.parse(localStorage.getItem("user"));
    let expirationTime = new Date(userData.expire);
    let currentTime = new Date();
    return currentTime < expirationTime;
  } catch (error) {
    return false;
  }
}

export function timeRemainsInSeconds() {
  try {
    let userData = JSON.parse(localStorage.getItem("user"));
    let expirationTime = new Date(userData.expire);
    let currentTime = new Date();
    let remain = expirationTime - currentTime;
    remain = parseInt((remain / 1000).toFixed(4), 10);
    if (remain < 0) {
      return 0;
    }
    if (typeof remain === "number") {
      return remain;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

export function getUser() {
  try {
    let userData = JSON.parse(localStorage.getItem("user"));
    return userData;
  } catch (error) {
    return false;
  }
}

export async function authorizeUser(username, password) {
  return await backend
    .authorizeUser(username, password)
    .then((response) => {
      let token = decodeJWT(response.data.access_token);
      if (token != false) {
        saveSession(token);
        return true;
      }
      throw new Error();
    })
    .catch((error) => {
      return false;
    });
}

export async function renewSession() {
  try {
    let token = getUser();
    if (token == false) {
      return false;
    }
    token = token["token"];
    return await backend
      .renewSession(await getUser().token)
      .then((response) => {
        let token = decodeJWT(response.data.access_token);
        if (token != false) {
          saveSession(token);
          return true;
        }
        throw new Error();
      })
      .catch((error) => {
        return false;
      });
  } catch (error) {
    return false;
  }
}

export async function getAllUsers() {
  return await backend.getAllUsers(await getUser().token).catch((error) => {
    return "error";
  });
}

export async function eligibleForAdmin() {
  return await backend.eligibleForAdmin();
}

export async function alive() {
  return await backend.alive();
}

export async function createAdmin(username, phone, password) {
  return await backend.createAdmin(username, phone, password);
}

export async function createUser(phone, password, admin, username) {
  return backend.createUser(
    await getUser().token,
    phone,
    password,
    admin,
    username
  );
}

export async function deleteUser(phone) {
  return await backend.deleteUser(await getUser().token, phone);
}

export async function convertType(phone, admin) {
  return await backend.convertType(await getUser().token, phone, admin);
}

export async function updateSelf(password, username) {
  return await backend.updateSelf(await getUser().token, password, username);
}

export async function getTime() {
  return await backend.getTime();
}

export async function getEngineLoad(port) {
  return await backend.getEngineLoad(await getUser().token, port);
}

export async function getAllEngine() {
  return await backend.getAllEngine(await getUser().token);
}

export async function getSystemStatus() {
  return await backend.getSystemStatus(await getUser().token);
}

export async function editEngine(keepLog, days, port) {
  return await backend.editEngine(await getUser().token, keepLog, days, port);
}

export async function createEngine(_class, name, port, keepLog) {
  return await backend.createEngine(
    await getUser().token,
    _class,
    name,
    port,
    keepLog
  );
}

export async function deleteEngine(engineName) {
  return await backend.deleteEngine(await getUser().token, engineName);
}

export async function createClient(port, clientName, clientIp) {
  return await backend.createClient(
    await getUser().token,
    port,
    clientName,
    clientIp
  );
}

export async function deleteClient(port, clientName) {
  return await backend.deleteClient(await getUser().token, port, clientName);
}

export async function editClient(port, clientName, clientIp) {
  return await backend.editClient(
    await getUser().token,
    port,
    clientName,
    clientIp
  );
}

export async function getHistory(port) {
  return await backend.getHistory(await getUser().token, port);
}

export async function supportedQuery(port, clientName, date) {
  return await backend.supportedQuery(
    await getUser().token,
    port,
    clientName,
    date
  );
}
export async function query(
  port,
  clientName,
  date,
  conditions,
  starting,
  limit
) {
  return await backend.query(
    await getUser().token,
    port,
    clientName,
    date,
    conditions,
    starting,
    limit
  );
}

export async function queryCount(port, clientName, date, conditions) {
  return await backend.queryCount(
    await getUser().token,
    port,
    clientName,
    date,
    conditions
  );
}

export async function getDownloadToken(
  port,
  clientName,
  date,
  conditions = null
) {
  return await backend.getDownloadToken(
    await getUser().token,
    port,
    clientName,
    date,
    conditions = conditions
  );
}

export async function getAllTimeZone() {
  return await backend.getAllTimeZone(await getUser().token);
}

export async function setTImeZone(zone) {
  return await backend.setTImeZone(await getUser().token, zone);
}
