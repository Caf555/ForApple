# ForApple 儲存庫說明

這個儲存庫收錄多個獨立的網頁作品（多為單一 HTML 檔）。使用者偏好正體中文，且沒有程式設計背景，說明時請用淺白的中文、一步一步引導。

## 《千秋硯》文字 RPG

- 遊戲：`千秋硯/`（多檔案，需透過網址開啟，發布在 GitHub Pages）
- 企劃與設定：`文字RPG企劃/`
- 劇本：`千秋硯/content/*.txt`，語法見 `文字RPG企劃/劇本語法說明.md`
- 修改劇本或資料後，務必執行 `node 千秋硯/tools/check.mjs`
- 批次生圖：見 `千秋硯/tools/生圖/README.md`（使用者本機的 ComfyUI + Qwen-Image 2.1）
