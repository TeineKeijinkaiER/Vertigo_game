const SHEET_NAME = "vertigo_results";
const SHEET_NAME_LEARN = "bppv_learn_views";
const SPREADSHEET_ID = "";
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
const HEADERS_LEARN = [
  "receivedAt",
  "viewedAt",
  "roleId",
  "roleName",
  "lessonId",
  "family",
  "side",
  "title",
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
    spreadsheetUrl: sheet.getParent().getUrl(),
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const isLearnView = payload.kind === "bppv_learn_view";
    const sheetName = isLearnView ? SHEET_NAME_LEARN : SHEET_NAME;
    const headers = isLearnView ? HEADERS_LEARN : HEADERS;
    const toRow = isLearnView ? toLearnRow_ : toResultRow_;

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

function getSheet_(sheetName) {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Create this Apps Script from a Google Spreadsheet or set SPREADSHEET_ID.");
  }
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
}

function toResultRow_(p) {
  return [
    new Date().toISOString(),
    p.completedAt || "",
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

function toLearnRow_(p) {
  return [
    new Date().toISOString(),
    p.viewedAt || "",
    p.roleId || "",
    p.roleName || "",
    p.lessonId || "",
    p.family || "",
    p.side || "",
    p.title || "",
    p.appVersion || "",
    p.pageUrl || "",
  ];
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
