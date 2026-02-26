@echo off
cd /d "%~dp0"
set PY=

rem Prefer real install paths (avoids Windows Store python stub)
for %%V in (314 313 312 311 310 39) do (
  if exist "%LocalAppData%\Programs\Python\Python3%%V\python.exe" (
    set "PY=%LocalAppData%\Programs\Python\Python3%%V\python.exe"
    goto :run
  )
)
if exist "C:\Python313\python.exe" set "PY=C:\Python313\python.exe" && goto :run
if exist "C:\Python312\python.exe" set "PY=C:\Python312\python.exe" && goto :run
if exist "C:\Python311\python.exe" set "PY=C:\Python311\python.exe" && goto :run

where py >nul 2>&1 && set PY=py
if defined PY goto :run

where python >nul 2>&1 && set PY=python
if defined PY goto :run

echo.
echo  Python not found.
echo.
pause
exit /b 1

:run
%PY% -m pip install -r requirements.txt -q
%PY% app.py
pause
