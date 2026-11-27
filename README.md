# 干涉與繞射線上教材

高中物理「波的疊加、雙狹縫干涉、單狹縫繞射與薄膜干涉」的純前端互動教材：預測 → 觀察 → 解釋 → 修正（POE）流程、互動模擬、前後測與教師專區。

## 開啟方式
直接用瀏覽器（Chrome／Edge／Firefox／Safari）開啟 `index.html` 即可，**不需要伺服器、安裝或網路**（`file://` 可用）。

## 資料夾結構
```
index.html            學習地圖（入口）
pretest.html / posttest.html   前測／後測（含前後測比較）
unit1.html  unit2.html  unit3.html   第1～3節（波的疊加／雙狹縫干涉／繞射與應用）
misconceptions.html   迷思速查
assessment.html       評量地圖（題目對應學習目標，可跳到前後測各題）
resources.html        延伸學習（依程度分流）
teacher.html          教師專區（對照表、教案、素材、驗收、學習資料管理、補遺）
assets/css/           site.css（共用與深色模式）、page-*.css（各頁）
assets/js/            site.js（導覽、側欄、儲存、匯出）、quiz-engine.js、page-*.js
assets/PAGE-TEMPLATE.html、assets/README-components.md   新增頁面的範本與元件速查
```

## 資料與隱私
學生作答存在**該瀏覽器的 localStorage**（key 前綴 `iod:`），不上傳任何伺服器；換瀏覽器、清除網站資料或無痕視窗會遺失。可於各頁或教師專區匯出 CSV／JSON，並以學生代碼（隨機匿名碼）識別。

## 限制
- 互動「AI 追問」為本機規則式示範，不是真實 AI。
- 模擬與圖為自繪示意，非實拍或精確色度；原實拍照片以來源連結（需網路）提供。
- 外部連結（Wikimedia 等）需網路；其餘功能離線可用。
- 僅以 Chrome（桌面與手機尺寸模擬）做過自動化測試；其他瀏覽器未逐項驗證。

## 專案報告
完整的專案報告（來源文件整合、做法、限制與後續建議）：[docs/專案報告.md](docs/專案報告.md)
