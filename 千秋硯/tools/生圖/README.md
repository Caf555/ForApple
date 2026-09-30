# 《千秋硯》批次生圖說明

用你電腦上的 ComfyUI（Qwen-Image 2.1 Viggle Turbo 工作流）批次產生遊戲用圖片。
定案：**方式 C**——在你自己的電腦上用 Claude Code 桌面版執行；美術風格為**水墨淡彩**；角色頭像使用**原生透明背景**。

---

## 一、第一次設定（只要做一次）

1. **安裝 Claude Code 桌面版**，登入你的帳號。
2. **把儲存庫下載到電腦**：在 Claude Code 桌面版中選「開啟儲存庫」，選 `Caf555/ForApple`。
   （或用 GitHub Desktop 下載，再用 Claude Code 開啟那個資料夾。）
3. **確認 Python 可以用**：ComfyUI 已經附帶 Python。另外需要 Pillow，第一次請 Claude 幫你執行：
   `pip install pillow`
4. **確認 ComfyUI 的模型**：工作流用到以下檔案，應該都已經在你的 ComfyUI 裡：
   - `qwen-image-2.1-UC-int8_convrot.safetensors`
   - `Qwen-Image-2.1-viggle-turbo-v0.2-5step-lora-r128.safetensors`
   - `qwen3vl_8b_w4a8.safetensors`
   - `qwen_image_2.1_vae_bf16.safetensors`

## 二、每次生圖

1. **啟動 ComfyUI**（網址預設是 `http://127.0.0.1:8188`）。
2. 在 Claude Code 桌面版裡，直接對 Claude 說：

   > 執行《千秋硯》的第一批生圖

   Claude 會讀這份說明，執行下面的指令：

   ```bash
   python 千秋硯/tools/生圖/batch.py
   ```

3. 腳本會依序產生清單上還沒有的圖。已經產生過的圖會自動略過，所以中途停掉、下次再跑也沒關係。
   - 第一批（已完成）：30 張場景背景、18 張角色頭像
   - 第二批（已完成）：20 張敵人圖（透明背景）、8 張劇情插圖
   - **卷二回一**：8 張背景、3 張頭像、6 張敵人、2 張插圖（清單在 `清單_卷二.json`）。對 Claude 說「執行《千秋硯》卷二的生圖」即可，指令和之前相同。
4. 完成後，打開 `千秋硯/tools/生圖/審圖.html`，逐張檢查。
5. 不滿意的圖，對 Claude 說「蒂娃_16 重畫」，它會執行：

   ```bash
   python 千秋硯/tools/生圖/batch.py --names 蒂娃_16 --force --seed-offset 1
   ```

   （`--seed-offset` 每次加 1，就會畫出不同的版本。）
6. 審完之後，對 Claude 說「把圖上傳並合併」。

## 三、給 Claude 的操作備忘

- 工作流：`workflows/t2i.json`（文生圖）、`workflows/edit.json`（圖生圖）。節點編號寫在清單的 `nodes` 欄位；使用者換了工作流，只要改那裡。
- 清單：資料夾裡所有 `清單_*.json` 會一起讀進來（畫風、節點與尺寸以 `清單_卷一.json` 為準）；用 `--list` 可以只跑其中一份。`style` 欄位可以替每一類（bg、cg、char、enemy）指定不同的畫風描述。`ref` 欄位表示以另一張圖為參考（圖生圖），用來讓同一角色在不同年紀長得一致；腳本會自動先產生被參考的圖。
- 輸出：
  - 原始 PNG 存在 `原圖/`（**不上傳**，已列在 `.gitignore`）
  - 網頁用 WebP 存在 `千秋硯/img/<類別>/`，並自動更新 `千秋硯/img/manifest.json`
  - 背景產生 `名稱-1600.webp`、`名稱-800.webp`；頭像產生 `名稱.webp`（512×512，保留透明通道）
- 腳本輸出「注意：輸出沒有透明通道」時，代表工作流沒有輸出 alpha。請向使用者確認 Qwen-Image 2.1 的透明背景要怎麼開啟（可能需要不同的節點或設定），再調整 `workflows/`。
- 上傳前請執行 `node 千秋硯/tools/check.mjs` 確認劇本沒有錯誤；只提交 `千秋硯/img/` 與清單的變更。
- 審圖時特別注意：卷二的人牲題材只畫等待與記憶，不畫過程；羌人圈只畫遠景與勞動；西拉雅族服飾不要出現刻板的「泛部落風」（羽毛頭飾、臉部彩繪等）；不要出現祭儀場面；真實歷史人物只畫遠景或背影；畫面裡不要出現文字。

## 四、指令一覽

| 指令 | 用途 |
|---|---|
| `python 千秋硯/tools/生圖/batch.py` | 產生所有還沒有的圖 |
| `--only bg` / `--only char` | 只產生背景／頭像 |
| `--names 名稱1,名稱2` | 只產生指定的圖 |
| `--force` | 已經有的也重畫 |
| `--seed-offset 1` | 換種子，畫出不同版本 |
| `--dry-run` | 只列出會做什麼，不實際生圖 |
| `--rebuild` | 不生圖，只用 `原圖/` 重新產生網頁檔案 |
| `--server http://…` | ComfyUI 不在預設網址時使用 |
