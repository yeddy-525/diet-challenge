const SHEET_CHALLENGE = "챌린지기록";
const SHEET_GUEST = "게스트기록";
const SHEET_EXERCISE_DB = "운동DB";

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const action = e.parameter.action;
    const sheet = e.parameter.sheet || 'challenge';
    if (action === "get") {
      output.setContent(JSON.stringify(getData(sheet)));
    } else if (action === "set") {
      output.setContent(JSON.stringify(setData(sheet, e.parameter.member, e.parameter.dateKey, e.parameter.value)));
    } else if (action === "getGuests") {
      output.setContent(JSON.stringify(getGuests()));
    } else if (action === "deleteGuest") {
      output.setContent(JSON.stringify(deleteGuest(e.parameter.nickname)));
    } else if (action === "getGuestCodes") {
      output.setContent(JSON.stringify(getGuestCodes()));
    } else if (action === "addGuestCode") {
      output.setContent(JSON.stringify(addGuestCode(e.parameter.code, e.parameter.nickname)));
    } else if (action === "deleteGuestCode") {
      output.setContent(JSON.stringify(deleteGuestCode(e.parameter.code)));
    } else if (action === "updateGuestNickname") {
      output.setContent(JSON.stringify(updateGuestCodeNickname(e.parameter.code, e.parameter.nickname)));
    } else if (action === "validateGuestCode") {
      output.setContent(JSON.stringify(validateGuestCode(e.parameter.code)));
    } else if (action === "getSettings") {
      output.setContent(JSON.stringify(getSettings()));
    } else if (action === "saveSettings") {
      output.setContent(JSON.stringify(saveSettings(e.parameter.key, e.parameter.value)));
    } else if (action === "getExerciseDB") {
      output.setContent(JSON.stringify(getExerciseDB()));
    } else {
      output.setContent(JSON.stringify({ error: "unknown action" }));
    }
  } catch(err) {
    output.setContent(JSON.stringify({ error: err.toString() }));
  }
  return output;
}

function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["member", "dateKey", "value", "updatedAt"]);
  }
  return sheet;
}

function getData(sheetType) {
  const sheetName = sheetType === 'guest' ? SHEET_GUEST : SHEET_CHALLENGE;
  const sheet = getOrCreateSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  const data = {};
  for (let i = 1; i < rows.length; i++) {
    const member = rows[i][0];
    const dateKey = rows[i][1];
    const value = rows[i][2];
    if (!member || !dateKey) continue;
    if (!data[member]) data[member] = {};
    data[member][dateKey] = value;
  }
  return { ok: true, data };
}

function setData(sheetType, member, dateKey, value) {
  const sheetName = sheetType === 'guest' ? SHEET_GUEST : SHEET_CHALLENGE;
  const sheet = getOrCreateSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === member && rows[i][1] === dateKey) {
      sheet.getRange(i + 1, 3).setValue(value);
      sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
      return { ok: true };
    }
  }
  sheet.appendRow([member, dateKey, value, new Date().toISOString()]);
  return { ok: true };
}

function getGuests() {
  const sheet = getOrCreateSheet(SHEET_GUEST);
  const rows = sheet.getDataRange().getValues();
  const nicknames = [...new Set(rows.slice(1).map(r => r[0]).filter(n => n))];
  return { ok: true, nicknames };
}

function deleteGuest(nickname) {
  const sheet = getOrCreateSheet(SHEET_GUEST);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === nickname) sheet.deleteRow(i + 1);
  }
  return { ok: true };
}

function getGuestCodes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("게스트코드");
  if (!sheet) return { ok: true, codes: [] };
  const rows = sheet.getDataRange().getValues();
  const codes = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) codes.push({ code: rows[i][0], nickname: rows[i][1]||'', createdAt: rows[i][2]||'' });
  }
  return { ok: true, codes };
}

function addGuestCode(code, nickname) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("게스트코드");
  if (!sheet) {
    sheet = ss.insertSheet("게스트코드");
    sheet.appendRow(["code", "nickname", "createdAt"]);
  }
  // 중복 확인
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === code) return { ok: false, error: "이미 존재하는 코드예요" };
  }
  sheet.appendRow([code, nickname||'', new Date().toISOString()]);
  return { ok: true };
}

function deleteGuestCode(code) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("게스트코드");
  if (!sheet) return { ok: false };
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === code) { sheet.deleteRow(i + 1); }
  }
  return { ok: true };
}

function updateGuestCodeNickname(code, nickname) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("게스트코드");
  if (!sheet) return { ok: false };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === code) {
      sheet.getRange(i + 1, 2).setValue(nickname);
      return { ok: true };
    }
  }
  return { ok: false };
}

function validateGuestCode(code) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("게스트코드");
  if (!sheet) return { ok: false, valid: false };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === code) {
      return { ok: true, valid: true, nickname: rows[i][1]||'' };
    }
  }
  return { ok: true, valid: false };
}

function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("설정");
  if (!sheet) return { ok: true, data: {} };
  const rows = sheet.getDataRange().getValues();
  const data = {};
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) data[rows[i][0]] = rows[i][1];
  }
  return { ok: true, data };
}

function saveSettings(key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("설정");
  if (!sheet) {
    sheet = ss.insertSheet("설정");
    sheet.appendRow(["key", "value", "updatedAt"]);
  }
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
      return { ok: true };
    }
  }
  sheet.appendRow([key, value, new Date().toISOString()]);
  return { ok: true };
}

function getExerciseDB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_EXERCISE_DB);
  if (!sheet) return { ok: true, data: {} };
  const rows = sheet.getDataRange().getValues();
  const data = {};
  for (let i = 1; i < rows.length; i++) {
    const part = rows[i][0];
    const name = rows[i][1];
    if (!part || !name) continue;
    if (!data[part]) data[part] = [];
    data[part].push(name);
  }
  return { ok: true, data };
}
