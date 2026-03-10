/**
 * Blog-Read-Forced — GAS バックエンド
 *
 * スプレッドシートへの記事保存と未読記事のランダム取得を行う。
 * GAS のウェブアプリとしてデプロイし、doPost / doGet を公開する。
 *
 * スプレッドシートのカラム構成:
 *   A: タイトル  B: URL  C: 登録日時  D: ステータス  E: メモ  F: ソース
 */

/** @type {string} スプレッドシートのシート名 */
const SHEET_NAME = "articles";

/**
 * アクティブなスプレッドシートの対象シートを返す。
 * シートが存在しない場合は新規作成する。
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // ヘッダー行を追加
    sheet.appendRow(["タイトル", "URL", "登録日時", "ステータス", "メモ", "ソース"]);
  }
  return sheet;
}

/**
 * JSON レスポンスを生成して返す。
 *
 * @param {Object} data - レスポンスオブジェクト
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST リクエストを処理し、記事をスプレッドシートに保存する。
 *
 * リクエストボディ (JSON):
 *   - url    {string} 必須。記事の URL
 *   - title  {string} 任意。空の場合は url をタイトル代わりに使用
 *   - source {string} 任意。登録元 ("iPhone" / "Chrome拡張")
 *
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const url = (data.url || "").trim();

    if (!url) {
      return jsonResponse({ status: "error", message: "urlが不正です" });
    }

    const title = (data.title || "").trim() || url;
    const source = (data.source || "").trim() || "不明";

    const sheet = getSheet();
    sheet.appendRow([title, url, new Date(), "未読", "", source]);

    return jsonResponse({ status: "ok", message: "保存しました" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

/**
 * GET リクエストを処理し、未読記事をランダムで 1 件返す。
 *
 * レスポンス (JSON):
 *   - status: "ok"    → title, url を含む
 *   - status: "empty" → 未読記事なし
 *
 * @param {GoogleAppsScript.Events.DoGet} _e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doGet(_e) {
  try {
    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();

    // 1行目はヘッダーなのでスキップ、D列 (index 3) が "未読" の行を抽出
    const unread = rows.slice(1).filter((row) => row[3] === "未読");

    if (unread.length === 0) {
      return jsonResponse({ status: "empty" });
    }

    const picked = unread[Math.floor(Math.random() * unread.length)];

    return jsonResponse({
      status: "ok",
      title: picked[0],
      url: picked[1],
    });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}
