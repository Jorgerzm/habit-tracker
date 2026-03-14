@REM Maven Wrapper script for Windows
@echo off
set MAVEN_PROJECTBASEDIR=%~dp0
set MAVEN_WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties

for /f "tokens=2 delims==" %%a in ('findstr "distributionUrl" "%MAVEN_WRAPPER_PROPERTIES%"') do set DISTRIBUTION_URL=%%a

set MAVEN_USER_HOME=%USERPROFILE%\.m2
if not exist "%MAVEN_USER_HOME%\wrapper\dists\" mkdir "%MAVEN_USER_HOME%\wrapper\dists\"

set MAVEN_HOME=%MAVEN_USER_HOME%\wrapper\dists\apache-maven-3.9.9

if not exist "%MAVEN_HOME%" (
  echo Downloading Maven...
  powershell -Command "Invoke-WebRequest -Uri '%DISTRIBUTION_URL%' -OutFile '%TEMP%\maven.zip'"
  powershell -Command "Expand-Archive -Path '%TEMP%\maven.zip' -DestinationPath '%MAVEN_USER_HOME%\wrapper\dists\'"
)

"%MAVEN_HOME%\bin\mvn.cmd" %*
