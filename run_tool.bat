@echo off
title Game Level Deconstructor - Competitor Analysis Tool
color 0b

echo =========================================================
echo       GAME LEVEL DECONSTRUCTOR - COMPETITOR TOOL
echo =========================================================
echo.
echo [1/2] Dang kiem tra moi truong Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Python! Vui long cai dat Python 3.10+ va them vao PATH.
    pause
    exit /b
)

echo [2/2] Dang khoi dong Web Dashboard tren Localhost...
echo.
echo Giao dien Web se tu dong mo tai: http://127.0.0.1:5000
echo Nhan Ctrl + C trong cua so nay de tat server.
echo.

:: Cho server khoi dong 1.5 giay roi tu mo trinh duyet
start "" timeout /t 2 /nobreak >nul ^& start http://127.0.0.1:5000

:: Chay Flask App
python app.py

pause
