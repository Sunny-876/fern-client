; -------------------------------------------------------------------------
; Fern Client - Windows Production NSIS Installer Script
; Target: FernClientSetup.exe (Windows 10/11 x64)
; Bundles complete self-contained Electron runtime and desktop client
; -------------------------------------------------------------------------

!include "MUI2.nsh"
!include "FileFunc.nsh"

SetCompressor /SOLID zlib

Name "Fern Client"
OutFile "..\release\FernClientSetup.exe"
InstallDir "$LOCALAPPDATA\Programs\Fern Client"
InstallDirRegKey HKCU "Software\FernClient" "InstallDir"
RequestExecutionLevel user

VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "Fern Client"
VIAddVersionKey "CompanyName" "Fern Client Team"
VIAddVersionKey "LegalCopyright" "© 2026 Fern Client"
VIAddVersionKey "FileDescription" "Fern Client Minecraft Launcher & Custom Client Setup"
VIAddVersionKey "FileVersion" "1.0.0.0"
VIAddVersionKey "ProductVersion" "1.0.0"

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Installer Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\FernClient.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Fern Client"
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Fern Client Core" SecCore
  ; Install all bundled application files and Electron runtime
  SetOutPath "$INSTDIR"
  File /r "..\release\win-unpacked\*"

  ; Write installation path to registry
  WriteRegStr HKCU "Software\FernClient" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\FernClient" "Version" "1.0.0"

  ; Add/Remove Programs integration
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "DisplayName" "Fern Client"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "Publisher" "Fern Client Team"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "DisplayIcon" '"$INSTDIR\FernClient.exe",0'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "NoRepair" 1

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\Fern Client"
  CreateShortcut "$SMPROGRAMS\Fern Client\Fern Client.lnk" "$INSTDIR\FernClient.exe" "" "$INSTDIR\FernClient.exe" 0
  CreateShortcut "$SMPROGRAMS\Fern Client\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Fern Client.lnk" "$INSTDIR\FernClient.exe" "" "$INSTDIR\FernClient.exe" 0
SectionEnd

Section "Uninstall"
  ; Remove application files and directories
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\Fern Client\Fern Client.lnk"
  Delete "$SMPROGRAMS\Fern Client\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Fern Client"
  Delete "$DESKTOP\Fern Client.lnk"

  ; Remove registry keys
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient"
  DeleteRegKey HKCU "Software\FernClient"

  ; Handle user data cleanup: in silent mode, preserve user data. In interactive mode, prompt.
  IfSilent KeepData
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove Fern Client user configurations and settings? (Minecraft world saves and installations will NOT be deleted unless chosen)" IDNO KeepData
    RMDir /r "$APPDATA\Fern Client\launcher"
  KeepData:
SectionEnd
