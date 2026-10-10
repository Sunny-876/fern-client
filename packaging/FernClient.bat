@echo off
rem Fern Client Diagnostic Launcher
if exist "%~dp0FernClient.exe" (
  start "" "%~dp0FernClient.exe" %*
) else (
  start "" "%~dp0dist-electron\main.cjs" %*
)
