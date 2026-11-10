@echo off
setlocal EnableExtensions
set "OUT=%USERPROFILE%\Desktop\EasyStore_Windows_Diagnostic.txt"
set "APPLOG=%USERPROFILE%\Desktop\EasyStore_Startup_Diagnostic.txt"
if not exist "%~dp0Easy Store V4.2.exe" (
 echo Put this file beside the diagnostic Easy Store V4.2.exe first.
 pause
 exit /b 2
)
>"%OUT%" echo Easy Store diagnostic launch
>>"%OUT%" echo Start: %DATE% %TIME%
pushd "%~dp0"
start "" /wait "%~dp0Easy Store V4.2.exe"
set "APP_EXIT=%ERRORLEVEL%"
>>"%OUT%" echo Process exit code: %APP_EXIT%
>>"%OUT%" echo End: %DATE% %TIME%
>>"%OUT%" echo.
>>"%OUT%" echo === Recent application crash providers, including CLR 2.0 events ===
wevtutil qe Application /q:"*[System[(Provider[@Name='.NET Runtime'] or Provider[@Name='.NET Runtime 2.0 Error Reporting'] or Provider[@Name='Application Error'] or Provider[@Name='Windows Error Reporting']) and TimeCreated[timediff(@SystemTime) <= 86400000]]]" /rd:true /c:100 /f:text >>"%OUT%" 2>&1
call :wer "%LOCALAPPDATA%\Microsoft\Windows\WER"
call :wer "%ProgramData%\Microsoft\Windows\WER"
popd
echo.
echo Send EasyStore_Startup_Diagnostic.txt and EasyStore_Windows_Diagnostic.txt from Desktop.
if exist "%APPLOG%" (
 start "" notepad.exe "%APPLOG%"
) else (
 echo No startup log found on the standard Desktop path. Windows crash report will open.
 start "" notepad.exe "%OUT%"
)
pause
exit /b

:wer
if not exist "%~1" exit /b
for /f "delims=" %%F in ('dir /s /b /a-d "%~1\Report.wer" 2^>nul') do (
 findstr /i /c:"Easy Store" "%%F" >nul 2>nul
 if not errorlevel 1 (
  >>"%OUT%" echo.
  >>"%OUT%" echo === WER: %%F ===
  type "%%F" >>"%OUT%"
 )
)
exit /b
