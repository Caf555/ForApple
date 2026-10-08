@echo off
chcp 65001 >nul
rem 《畫海人》單機啟動：雙擊這個檔案，就會在這台電腦上開一個小網站，並打開瀏覽器開始玩。
rem 遊戲不能直接雙擊 index.html 開啟（瀏覽器的安全限制會擋住讀檔），所以需要這個小網站。
rem 玩完以後，關掉這個黑色視窗就好。
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo 找不到 Python，沒辦法開啟本機網站。
  echo 請先安裝 Python：https://www.python.org/downloads/
  echo 安裝時記得勾選「Add python.exe to PATH」。
  pause
  exit /b 1
)

set PORT=8766
echo 《畫海人》單機版啟動中……
echo 瀏覽器沒有自動打開的話，請手動前往 http://localhost:%PORT%
echo 玩完以後，關掉這個視窗即可。
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"
python -m http.server %PORT% --bind 127.0.0.1
