@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
set "ANDROID_HOME=C:\Users\moshi\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

echo ===================================================
echo [STALK] Building Release APK on Local Machine...
echo CPU: AMD Ryzen 5 8500G (12 Threads)
echo ===================================================

cd /d "%~dp0android"
call gradlew.bat assembleRelease

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================
    echo [SUCCESS] Release APK built successfully!
    echo Location:
    echo %~dp0android\app\build\outputs\apk\release\app-release.apk
    echo ===================================================
) else (
    echo.
    echo [ERROR] Build failed. Please inspect the log above.
)

