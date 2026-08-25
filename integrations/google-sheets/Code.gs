const SHEET_NAME = "vertigo_results";
const SHEET_NAME_PRACTICE = "bppv_practice_opens";
const SPREADSHEET_ID = "";
const TIME_ZONE = "Asia/Tokyo";
const TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

/** 新規スプレッドシートに最初からある空タブ。使っていなければ消す */
const DEFAULT_SHEET_NAMES = ["シート1", "Sheet1"];

const HEADERS = [
  "receivedAt",
  "completedAt",
  "roleId",
  "roleName",
  "caseId",
  "caseTitle",
  "category",
  "rank",
  "score",
  "endingTier",
  "diagnosisCorrect",
  "sideCorrect",
  "maneuverPerfect",
  "fromRandom",
  "appVersion",
  "pageUrl",
];

/** BPPVれんしゅうを開いた記録。型や左右は問わないので列も持たない */
const HEADERS_PRACTICE = [
  "receivedAt",
  "openedAt",
  "roleId",
  "roleName",
  "appVersion",
  "pageUrl",
];

function doGet() {
  const sheet = getSheet_(SHEET_NAME);
  ensureHeaders_(sheet, HEADERS);
  return jsonOutput_({
    ok: true,
    app: "VERTIGO Google Sheets collector",
    sheetName: SHEET_NAME,
    practiceSheetName: SHEET_NAME_PRACTICE,
    timeZone: TIME_ZONE,
    spreadsheetUrl: sheet.getParent().getUrl(),
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const isPracticeOpen = payload.kind === "bppv_practice_open";
    const sheetName = isPracticeOpen ? SHEET_NAME_PRACTICE : SHEET_NAME;
    const headers = isPracticeOpen ? HEADERS_PRACTICE : HEADERS;
    const toRow = isPracticeOpen ? toPracticeRow_ : toResultRow_;

    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      const sheet = getSheet_(sheetName);
      ensureHeaders_(sheet, headers);
      sheet.appendRow(toRow(payload));
    } finally {
      lock.releaseLock();
    }
    return jsonOutput_({ ok: true });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error && error.message ? error.message : String(error) });
  }
}

function parsePayload_(e) {
  const content =
    e && e.parameter && e.parameter.payload
      ? e.parameter.payload
      : e && e.postData && e.postData.contents
        ? e.postData.contents
        : "{}";
  const payload = JSON.parse(content);
  if (!payload || typeof payload !== "object") throw new Error("Payload must be a JSON object.");
  return payload;
}

function getSpreadsheet_() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Create this Apps Script from a Google Spreadsheet or set SPREADSHEET_ID.");
  }
  return spreadsheet;
}

function getSheet_(sheetName) {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  removeUnusedDefaultSheets_(spreadsheet);
  return sheet;
}

/**
 * 「シート1」（英語版なら Sheet1）が空のまま残っていたら削除する。
 * 中身が1つでも入っていれば触らない。最後の1枚は消せないので、
 * 記録用シートを作ったあとに呼ぶこと。
 */
function removeUnusedDefaultSheets_(spreadsheet) {
  DEFAULT_SHEET_NAMES.forEach(function (name) {
    if (spreadsheet.getSheets().length <= 1) return;
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) return;
    if (sheet.getLastRow() > 0 || sheet.getLastColumn() > 0) return;
    spreadsheet.deleteSheet(sheet);
  });
}

/** スクリプトエディタから手で実行して、空の「シート1」を片づけるための入口 */
function cleanupEmptyDefaultSheets() {
  removeUnusedDefaultSheets_(getSpreadsheet_());
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
}

function toResultRow_(p) {
  return [
    nowJst_(),
    toJst_(p.completedAt),
    p.roleId || "",
    p.roleName || "",
    p.caseId === undefined ? "" : p.caseId,
    p.caseTitle || "",
    p.category || "",
    p.rank || "",
    p.score === undefined ? "" : p.score,
    p.endingTier || "",
    p.diagnosisCorrect === undefined ? "" : p.diagnosisCorrect,
    p.sideCorrect === undefined ? "" : p.sideCorrect,
    p.maneuverPerfect === undefined || p.maneuverPerfect === null ? "" : p.maneuverPerfect,
    p.fromRandom === undefined ? "" : p.fromRandom,
    p.appVersion || "",
    p.pageUrl || "",
  ];
}

function toPracticeRow_(p) {
  return [
    nowJst_(),
    toJst_(p.openedAt),
    p.roleId || "",
    p.roleName || "",
    p.appVersion || "",
    p.pageUrl || "",
  ];
}

function nowJst_() {
  return Utilities.formatDate(new Date(), TIME_ZONE, TIME_FORMAT);
}

/**
 * クライアントは日本時刻の "yyyy-MM-dd HH:mm:ss" を送ってくるので、そのまま通す。
 * 古い版が送る UTC の ISO 8601（例 2026-08-25T10:30:00.000Z）だけ日本時刻へ直す。
 */
function toJst_(value) {
  if (!value) return "";
  if (typeof value !== "string") return value;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return Utilities.formatDate(parsed, TIME_ZONE, TIME_FORMAT);
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
