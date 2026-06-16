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
    } else if (action === "saveFcmToken") {
      output.setContent(JSON.stringify(saveFcmToken_(e.parameter.member, e.parameter.token)));
    } else if (action === "notifyFriend") {
      output.setContent(JSON.stringify(notifyFriend_(e.parameter.member)));
    } else if (action === "sendTestPush") {
      output.setContent(JSON.stringify(sendTestPush_(e.parameter.member)));
    } else if (action === "sendCustomPush") {
      output.setContent(JSON.stringify(sendCustomPush_(e.parameter.target, e.parameter.title, e.parameter.body)));
    } else if (action === "getPushHistory") {
      output.setContent(JSON.stringify(getPushHistory_()));
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

// ── FCM 푸시 알림 ──

var FCM_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCwFI3EpFpoUHAy\njSkRzyxlwlWAa4IJ9wR4wHHPYAGX1jM4+nop14x+Dut+rAexiyC40WB4POxma6t+\nTSfsXxPKjHi3S2a1aaCLsQZGujuZh5HVWNBgmPMkrgR2qMjlKFbEaPwGTHDmX/Nv\nK7i9ZdFmR0itkiHJWPV0CZBcCl+HpLgwFGoGrRLRexyp/Sl0kzxhamoA0RQd4M6B\nHnxnooZI9DO42VR+cEl8d5Oxs9JWIHNjkjIvEF74Rn+i+xcCoGNrto9Shu3MMkIE\nUxTdlz+sJiTC5KFiq4O+Uu9fo7ktd3UXgVI15U4oriXrH/G+AFDoHxS9RWyr7QNI\nBv7Y21ndAgMBAAECggEAAmA/StBTmVAUjioSIXe5MqT9AF7zAe1qYF1rFmWblTqX\nta9zkeL4YK8U2xW5Li/MFj0FCeT7Ok/o9YBXBz0qiDN9ttjL9FYONjRXpawCUope\nG7yMu0ZKaaFLgB+7mOlYGmMMRjgmgdqjmfQYvxLY+4H/Z2WEZ9zNGxlnRZwCOVNS\n8D486FxZI6govbCKQt5ClGg1NHQtzf/roypDpEy4FME7X5FbkGUPNFz2lk8EVxWq\nBA52uDVrvFJetQ/0Txgt+gYW5aMnq7Gb7OsNQ8hbpKkqQVDJjORvKLOpIqwyL+7S\n/eSRf5/CSYltraNxuGBxXT7+T5Psf1cbm9BzekhSxQKBgQDlqXUNkNwE1V7JAaSw\nH94/PEsyl/xEBazkd5gNoYp9TtGsoLmHPcCtVG2hAg2xzkh87Xp9SjGsrnWDFDDV\n5wlAGEsF/rBvAinbaulg0QX57TP+Y+YMPvr5B+NqkM7WxfH1+SG92444cxRNpV7z\n2tNTnlgWYijFr4irTngHRMl/vwKBgQDERgRANP6l9lTB5eybd9+CgBTPlTREgwFc\nEai+gg6pT3EiOAuYo2mTD2JZ8/w0knTuJauZ37cNpY1V4hD5TT15VxFWQ7VO+MBt\n+SReBh1zxLHP90AkI/vK8Em9c0JA1c+5ADOPqlspyoatN2/t0xxGO0vNRI+ONPSe\nJh8kVR3NYwKBgQDi/d1SvjWolVfs5jHnXmglKivM4smUVeOvoMDp4BtohOnabLVT\nBWcWKhd9BvGQJyogR/xEL3vviDNfjipCkOrkrd4hG704yvOiCgaHCbGVd6xnKEft\nHKakUvakkmHNh7ICAu4loAbupleP8v5pmYQ75op7/SL9WOSFJLafwI5EMwKBgAbJ\nTPhTXMKsQ734jzfI60d92jpbNFVyGifuzGDZ6lvcTVMbkPsUG2BkVcg6cWv37GcX\nklldrNyh7sMbb+7OxuNdKVJMQQab/ztOM/20RGxuTp+cMvGM9PXNXR9Zzt6jBe2l\nniLHhyNox0NR+WLFu+KJxlMwna4TEqotM0J0VvV1AoGBANxDG4RMJutnLBb9+R6R\ni+Em1lFH5e1+68cLUdyKuXkKRUY7DPKGReIVqxHaWoKXh3MRT/jUsq3JsmeqSO7R\nbkyFo9szG0y0GjuOTuRLWXgEVmHIgFTMUDc/79FFV+iS96iFZVhUh/bCeIdCW9I2\nphuDXVB3cPI32BoGeyb5joHX\n-----END PRIVATE KEY-----\n";

function getSettingValue_(key) {
  const res = getSettings();
  return String((res.data || {})[key] || '');
}

function saveFcmToken_(member, token) {
  if (!member || !token) return { ok: false, error: 'missing params' };
  const result = saveSettings('fcm_token_' + member, token);
  ensureReminderTrigger_();
  return result;
}

function ensureReminderTrigger_() {
  if (getSettingValue_('trigger_created') === 'true') return;
  try {
    createReminderTrigger();
    saveSettings('trigger_created', 'true');
  } catch(e) {}
}

function sendTestPush_(member) {
  const token = getSettingValue_('fcm_token_' + member);
  if (!token) return { ok: false, error: 'no_token' };
  try {
    sendPush_(token, '테스트 알림 🔔', member + '에게 발송된 테스트 푸시예요!');
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.toString() };
  }
}

function notifyFriend_(member) {
  const friendName = member === '예진' ? '지은' : '예진';
  const token = getSettingValue_('fcm_token_' + friendName);
  if (!token) return { ok: true, skipped: 'no_token' };
  try {
    sendPush_(token, '몸짱대결 💪', member + '이 오늘 기록 남겼어 👀');
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.toString() };
  }
}

function getAccessToken_() {
  const privateKey = FCM_PRIVATE_KEY;
  const email = 'firebase-adminsdk-fbsvc@diet-challenge-7cb23.iam.gserviceaccount.com';
  const now = Math.floor(Date.now() / 1000);
  const header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=+$/, '');
  const jwtClaims = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })).replace(/=+$/, '');
  const sig = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(header + '.' + jwtClaims, privateKey)
  ).replace(/=+$/, '');
  const jwt = header + '.' + jwtClaims + '.' + sig;
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    payload: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jwt)
  });
  return JSON.parse(res.getContentText()).access_token;
}

function sendPush_(token, title, body) {
  const accessToken = getAccessToken_();
  UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/diet-challenge-7cb23/messages:send', {
    method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify({
      message: {
        token: token,
        notification: { title: title, body: body },
        webpush: {
          notification: {
            icon: 'https://yeddy-525.github.io/diet-challenge/icons/icon-192.png',
            tag: 'diet-challenge'
          }
        }
      }
    })
  });
}

function getDayInfoKST_() {
  const nowKST = new Date(Date.now() + 9 * 3600000);
  const dow = nowKST.getUTCDay(); // 0=일, 1=월 ...
  const dayIdx = dow === 0 ? 6 : dow - 1; // 월=0, 일=6
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monKST = new Date(nowKST.getTime() + diffToMon * 86400000);
  return { dayIdx: dayIdx, weekKey: monKST.toISOString().slice(0, 10), dow: dow };
}

function getMealData_() {
  var info = getDayInfoKST_();
  var sheet = getOrCreateSheet(SHEET_CHALLENGE);
  var rows = sheet.getDataRange().getValues();
  var data = {};
  for (var i = 1; i < rows.length; i++) {
    var m = rows[i][0], dk = rows[i][1], v = rows[i][2];
    if (!m || !dk) continue;
    if (!data[m]) data[m] = {};
    data[m][dk] = v;
  }
  return { info: info, data: data };
}

// 매일 14:00 KST — 점심 미입력 시 알림
function sendLunchReminder() {
  var res = getMealData_();
  if (res.info.dow === 0) return;
  var members = ['예진', '지은'];
  for (var j = 0; j < members.length; j++) {
    var member = members[j];
    var token = getSettingValue_('fcm_token_' + member);
    if (!token) continue;
    var md = res.data[member] || {};
    var m1 = String(md[res.info.weekKey + '_d' + res.info.dayIdx + '_m1'] || '').trim();
    if (!m1) {
      try { sendPush_(token, '기 록 해 🔥', '점심 먹었을 텐데 왜 안 써?'); } catch(e) {}
    }
  }
}

// 매일 20:00 KST — 저녁 미입력 시 알림
function sendDinnerReminder() {
  var res = getMealData_();
  if (res.info.dow === 0) return;
  var members = ['예진', '지은'];
  for (var j = 0; j < members.length; j++) {
    var member = members[j];
    var token = getSettingValue_('fcm_token_' + member);
    if (!token) continue;
    var md = res.data[member] || {};
    var m2 = String(md[res.info.weekKey + '_d' + res.info.dayIdx + '_m2'] || '').trim();
    if (!m2) {
      try { sendPush_(token, '기 록 해 🔥', '저녁 먹었을 텐데 왜 안 써?'); } catch(e) {}
    }
  }
}

function createReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'checkAndSendReminders' || fn === 'sendLunchReminder' || fn === 'sendDinnerReminder') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('sendLunchReminder').timeBased().atHour(14).everyDays(1).create();
  ScriptApp.newTrigger('sendDinnerReminder').timeBased().atHour(20).everyDays(1).create();
}

// GAS 편집기에서 직접 실행 — 기존 트리거 삭제 후 새 시간으로 재등록
function resetTriggers() {
  saveSettings('trigger_created', 'false');
  createReminderTrigger();
  saveSettings('trigger_created', 'true');
}

// ── 커스텀 푸시 발송 + 기록 ──

function logPush_(target, title, body, result) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('푸시기록');
  if (!sheet) {
    sheet = ss.insertSheet('푸시기록');
    sheet.appendRow(['보낸시간', '대상', '제목', '내용', '결과']);
  }
  sheet.appendRow([new Date().toISOString(), target, title, body, result]);
}

function sendCustomPush_(target, title, body) {
  if (!title || !body) return { ok: false, error: 'missing params' };
  var members = target === '전체' ? ['예진', '지은'] : [target];
  var results = [];
  for (var i = 0; i < members.length; i++) {
    var member = members[i];
    var token = getSettingValue_('fcm_token_' + member);
    if (!token) {
      logPush_(member, title, body, '토큰없음');
      results.push({ member: member, ok: false, error: 'no_token' });
      continue;
    }
    try {
      sendPush_(token, title, body);
      logPush_(member, title, body, '성공');
      results.push({ member: member, ok: true });
    } catch(e) {
      logPush_(member, title, body, '실패: ' + e.toString());
      results.push({ member: member, ok: false, error: e.toString() });
    }
  }
  return { ok: true, results: results };
}

function getPushHistory_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('푸시기록');
  if (!sheet) return { ok: true, history: [] };
  var rows = sheet.getDataRange().getValues();
  var history = [];
  for (var i = rows.length - 1; i >= 1 && history.length < 30; i--) {
    history.push({
      time: rows[i][0] ? new Date(rows[i][0]).toISOString() : '',
      target: rows[i][1],
      title: rows[i][2],
      body: rows[i][3],
      result: rows[i][4]
    });
  }
  return { ok: true, history: history };
}
