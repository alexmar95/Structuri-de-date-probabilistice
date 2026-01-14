@echo off
title Prezentare - Structuri de Date Probabilistice
echo ============================================
echo   Structuri de Date Probabilistice
echo   Server local pentru prezentare
echo ============================================
echo.
echo Se porneste serverul pe http://localhost:8080
echo.
echo Apasa Ctrl+C pentru a opri serverul.
echo ============================================
echo.

:: Deschide browser-ul automat dupa 2 secunde
start "" cmd /c "timeout /t 2 >nul && start http://localhost:8080"

:: Porneste serverul Python
python -m http.server 8080

pause

