/**
 * Blog-Read-Forced — popup.js
 *
 * ポップアップの UI ロジック。
 * - GAS URL の保存・読み込み
 * - 現在タブの URL / タイトルを GAS に POST して記事を登録
 */

/** @type {string} ストレージキー: GAS WebアプリURL */
const STORAGE_KEY_GAS_URL = "gasUrl";

/** @type {HTMLInputElement} */
const gasUrlInput = /** @type {HTMLInputElement} */ (document.getElementById("gas-url-input"));

/** @type {HTMLButtonElement} */
const saveUrlBtn = /** @type {HTMLButtonElement} */ (document.getElementById("save-url-btn"));

/** @type {HTMLButtonElement} */
const registerBtn = /** @type {HTMLButtonElement} */ (document.getElementById("register-btn"));

/** @type {HTMLElement} */
const messageEl = /** @type {HTMLElement} */ (document.getElementById("message"));

// ── ユーティリティ ────────────────────────────────────────

/**
 * メッセージ欄にテキストを表示する。
 *
 * @param {string} text - 表示するメッセージ
 * @param {"success"|"error"|""} type - スタイルクラス
 */
function showMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = type;
}

/**
 * ボタンの活性 / 非活性を切り替える。
 *
 * @param {HTMLButtonElement} btn
 * @param {boolean} disabled
 */
function setDisabled(btn, disabled) {
  btn.disabled = disabled;
}

// ── 初期化 ───────────────────────────────────────────────

/**
 * ポップアップ表示時に保存済み GAS URL をインプットに反映する。
 */
async function init() {
  const result = await chrome.storage.local.get(STORAGE_KEY_GAS_URL);
  if (result[STORAGE_KEY_GAS_URL]) {
    gasUrlInput.value = result[STORAGE_KEY_GAS_URL];
  }
}

// ── イベントハンドラ ─────────────────────────────────────

/**
 * 「URL を保存」ボタンのクリックハンドラ。
 * 入力した GAS URL を chrome.storage.local に保存する。
 */
saveUrlBtn.addEventListener("click", async () => {
  const url = gasUrlInput.value.trim();
  if (!url) {
    showMessage("URL を入力してください", "error");
    return;
  }

  setDisabled(saveUrlBtn, true);
  try {
    await chrome.storage.local.set({ [STORAGE_KEY_GAS_URL]: url });
    showMessage("URL を保存しました", "success");
  } catch (err) {
    showMessage("保存に失敗しました", "error");
    console.error(err);
  } finally {
    setDisabled(saveUrlBtn, false);
  }
});

/**
 * 「この記事を登録」ボタンのクリックハンドラ。
 * アクティブなタブの URL とタイトルを GAS に POST する。
 */
registerBtn.addEventListener("click", async () => {
  const gasUrl = gasUrlInput.value.trim();
  if (!gasUrl) {
    showMessage("先に GAS URL を保存してください", "error");
    return;
  }

  setDisabled(registerBtn, true);
  showMessage("登録中...");

  try {
    // 現在タブの情報を取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showMessage("タブ情報を取得できませんでした", "error");
      return;
    }

    // GAS へ POST
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tab.url,
        title: tab.title || "",
        source: "Chrome拡張",
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.status === "ok") {
      showMessage("登録しました！", "success");
    } else {
      showMessage(`エラー: ${data.message || "不明"}`, "error");
    }
  } catch (err) {
    showMessage("登録に失敗しました", "error");
    console.error("[Blog-Read-Forced] POST 失敗:", err);
  } finally {
    setDisabled(registerBtn, false);
  }
});

// ── エントリーポイント ────────────────────────────────────
init();
