# 富國島家庭旅遊 PWA V2

## 本版修改
- 地圖：改成 Leaflet + OpenStreetMap 真實地圖，可縮放、拖曳、點標記，並可開 Google Maps 導航。
- 行程：Day 1–6 全部加入縮圖；圖片框使用同一 CSS 比例，Day 5/6 不再比前面扁。
- 工具 > 飯店資訊：加入地址、電話、開啟導航、一鍵撥打。
- 工具 > 包車資訊：加入司機/電話/WhatsApp/LINE/車型/日期/接送/備註；右側只保留一鍵撥打。
- 工具 > 緊急聯絡：改為警察、救護車、駐外協助；有電話時可一鍵撥打。
- 清單與其他既有功能維持原本邏輯。

## 測試
用 VS Code Live Server 開啟 `index.html`。不要直接用 `file://` 雙擊。

## 注意
- Leaflet 程式與 OpenStreetMap 圖磚目前從網路載入；無網路時地圖底圖可能無法顯示，但地點列表與其他 PWA 內容仍可使用。
- `driver_info` 與 `emergency_contacts` 中尚未填電話的項目，介面會顯示「請先填電話」，不會產生錯誤撥號連結。
- 目前 V2 使用 `js/data.js` 內的資料快照。若要讓 Google 試算表修改後即時反映到 PWA，下一階段需接 Apps Script / API。


## V3：Google 試算表多人同步

已加入 Apps Script API 與 PWA 雲端同步介面。詳細步驟請看 `SETUP_GOOGLE_SHEETS.md`。未設定 API URL 時，PWA 仍維持 V2 的離線功能。


## 已綁定雲端 API

此版本已內建 Apps Script Web App URL，開啟 PWA 後會自動從 Google 試算表同步資料，不需要每支手機手動貼 API 網址。
