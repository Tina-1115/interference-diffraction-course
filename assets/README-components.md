# 共用元件說明

所有頁面由 `PAGE-TEMPLATE.html` 複製；`<link>`／`<script>` 用相對路徑 `assets/...`。逐項用法與範例請看 PAGE-TEMPLATE.html 內的註解，此處為速查。

## body 屬性
| 屬性 | 說明 |
|---|---|
| `data-page` | 本頁代碼（= 檔名），導覽標示與進度用 |
| `data-prev` / `data-next` | 上一步／下一步 href，頁尾按鈕自動渲染（顯示目標頁標題） |

site.js 自動插入：導覽列 `#iod-nav`（全部頁面、當前頁 `aria-current`、完成綠點）、進度條 `#iod-progress`（本頁位置、整體完成、學生代碼）、頁尾 `#iod-pager`。

## CSS 元件
| class | 用途 |
|---|---|
| `.bridge-in` / `.bridge-out` | 承接前頁／下頁預告橋接語（標籤文字自動加上） |
| `.qcard[data-qid][data-act]` | 題卡；內含 `name` 欄位自動儲存、`.saved` 顯示儲存時間 |
| `.q-head .q-no .q-goal .q-stem .opt .answer-key` | 題卡內部結構 |
| `.hints > details.L1/.L2/.L3` | 折疊提示；展開記錄 `hint_L1` 等 |
| `.rubric` + `input[name=rubric][value=1|2|3]` | 三級自評，自動儲存 |
| `.badge-add`（行內）、`.add-block`（整段） | 「整合補充」標記，凡非原文件內容皆須使用 |
| `.asset-tag` | 素材序號（自動前綴「素材」），搭配 `figure.asset` |
| `.card .grid .tbl(.tbl-wrap) .btn .placeholder .muted .small` | 通用版面 |

## 儲存
key 前綴 `iod:`：`student`（匿名代碼）、`prog:<page>`（完成度）、`ans:<page>:<qid>:<field>`（`{value,ts,history,activity}`）。localStorage 不可用時退回記憶體，不丟錯。

## 按鈕屬性（自動綁定）
`data-iod-export="csv|json"`、`data-iod-clear`、`data-iod-complete`、`data-iod-student`（填入學生代碼）。

## JS API（`window.IOD`）
`store.get/set/remove/keys`、`studentId()`、`saveAnswer(page,qid,field,value,activity)`、`getAnswer(page,qid,field)`、`logEvent(...)`、`allAnswers()`、`getProgress(page)`、`setProgress(page,pct,done)`、`markDone(page)`、`overall()`、`exportCSV()`、`exportJSON()`、`toCSV()`、`toJSON()`、`download(name,text,mime)`、`clearAll()`、`toast(msg)`、`pages`、`version`。

匯出欄位：`student_id, activity, page, qid, field, value, timestamp, revisions, version`；JSON 另含 `progress` 與每筆 `history`（修訂歷程）。

## 介面元件（site.css／site.js，由 site.js 自動插入，頁面不需手寫）
| 元件 | 說明 |
|---|---|
| 側欄目錄 `#iod-side.side` | 桌面（視窗 ≥ 1024px）固定在左側，`html.has-side` 讓內文讓出 `--side-w`；分組 `.s-group`／`.s-list`／`.s-item.cur`（目前頁、`aria-current="page"`），每項顯示完成狀態 `.s-stat`（未開始／N%／完成）與進度條 `.s-bar`。目前頁下方的本頁章節 `ol.toc` 由 `main` 內 `h2`、`h3`、`.qcard[data-qid]` 自動產生，隨捲動標示目前章節；內容動態改變時（MutationObserver）重建。 |
| 收合與手機抽屜 | 桌面按頂欄「收合目錄／展開目錄」切換 `html.side-collapsed`；視窗 < 1024px（手機／平板）按「☰目錄」開啟抽屜 `html.side-open` 並出現 `.side-backdrop`；點遮罩、「關閉目錄」、按 Esc 或點側欄連結即關閉。桌面側欄開合記在 `iod:ui:side`。 |
| 深色模式切換 `[data-theme-btn]` | 頂欄與側欄底部各一顆，循環「自動（跟隨系統）→ 深色 → 淺色」，寫入 `iod:ui:theme`，並設定 `<html data-theme="dark|light">`（自動時移除屬性，改由 `prefers-color-scheme` 決定）。色彩一律用 `:root` 的 CSS 變數；圖表／模擬畫布與 `figure.asset` 維持白底（內含深色線條），其內文字顏色已另行指定。 |
| `site.css` 內 `AUTO-DARK BEGIN/END` 區塊 | 由 `gen_dark.py` 依各 `assets/css/page-*.css` 的淺色寫死色碼自動產生深色對應規則，**勿手改**。改了任何 `page-*.css` 後必須重跑 `python3 gen_dark.py`（腳本不在本資料夾；放在開發用 scratchpad，需要時請向維護者索取或依其規則重寫），否則該頁新色碼在深色模式不會被轉換。 |
| `.callout`（+`.tip`／`.ok`／`.warn`／`.danger`） | 通用提示框：左側色條＋淡底，第一個子元素 `<strong>` 當標題；`.tip` 藍、`.ok` 綠、`.warn` 琥珀、`.danger` 紅。與 `.bridge-in/.bridge-out`（承接／預告）並用但不取代。 |
| 步驟條 `.poe-steps`／`.poe-legend`／`.stepper`／`.act-steps` | 箭頭式（chevron）步驟條，內層用 `<span>` 或 `<li>`；`.cur` = 目前步驟、`.on` = 已通過；窄螢幕自動改為 2 欄方塊。POE 卡片的四步（預測／觀察／解釋／修正）由頁面 JS 切換 `.on`／`.cur`；`.poe-legend` 各步顏色由 inline `style` 指定，深色模式請用 `var(--c-primary-bg)` 而非 `var(--c-primary)` 當白字底色。 |

## 按鈕樣式類別（`.btn` 家族）
| class／屬性 | 用途 |
|---|---|
| `.btn` | 主要（藍底白字），最小高度 42px 方便觸控 |
| `.btn.ghost` | 次要（白底描邊）；`aria-pressed="true"` 時顯示 ✓ 與強調底色 |
| `.btn.danger`（可加 `.ghost`） | 危險／清除類，紅色 |
| `.btn.lockbtn`、`[data-poe-lock]` | 「送出並鎖定」：琥珀色＋🔒，提醒不可逆 |
| `.btn.main`、`[data-poe-finish]`、`[data-iod-complete]` | 完成類：綠色＋✓ |
| `.btn.on`、`.btn.sel` | 選取中狀態（篩選鈕、已選項目） |
| `:disabled`／`[aria-disabled="true"]` | 灰底虛線框，明確不可按 |
| `.btn-row`、`.lockbar` | 按鈕列（自動換行、間距） |

## 新增頁面
1. 複製範本；2. 在 `site.js` 的 `PAGES` 加一列（順序即導覽順序）；3. 設定 `data-page/prev/next`。
