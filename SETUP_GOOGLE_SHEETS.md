# Google 試算表多人同步設定

此版本已把 PWA 前端與 Apps Script API 都準備好，資料來源是：

- Google Sheet：富國島家庭旅遊_PWA資料庫
- Spreadsheet ID：`1JO2PLBntD7HPVfDmDpuxUUyAmCHT1M-tNFGVxf20DFo`

## 只需做一次的 Google Apps Script 部署

1. 開啟你的 Google 試算表。
2. 選「擴充功能 → Apps Script」。
3. 刪除預設內容，把 `google-apps-script/Code.gs` 全部貼入。
4. 儲存。
5. 點右上角「部署 → 新增部署作業」。
6. 類型選「網頁應用程式」。
7. 執行身分：選「我」。
8. 誰可以存取：若只讓家人使用，可依 Google 畫面提供的選項選擇適合的範圍；若 PWA 不登入 Google 就要直接同步，需允許持有網址者存取。
9. 部署後複製以 `/exec` 結尾的 Web App URL。

## 在 PWA 中連線

1. 打開 PWA。
2. 進入「工具」。
3. 找到「Google 試算表同步」。
4. 貼上 Web App URL。
5. 可填入自己的名稱，例如「偉琤」。
6. 點「儲存並同步」。

成功後：

- 行程、飯店、地點、備註、包車、緊急聯絡、清單資料會從 Google Sheet 讀取。
- 清單的勾選狀態會直接回寫 `checklist` 分頁。
- `updatedBy` 會寫入你在 PWA 設定的名稱。
- `updatedAt` 會寫入更新時間。
- 無網路或 API 暫時失敗時，PWA 仍可使用內建離線資料。

## 測試 API

部署後，把網址改成：

`你的WebApp網址?action=ping`

若看到包含 `"ok":true` 與 `"pong"` 的 JSON，表示 API 已部署成功。
