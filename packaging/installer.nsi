; -------------------------------------------------------------------------
; Fern Client - Windows Production NSIS Installer Script
; Target: FernClientSetup.exe (Windows 10/11 x64)
; -------------------------------------------------------------------------

!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "Fern Client"
OutFile "FernClientSetup.exe"
InstallDir "$LOCALAPPDATA\Programs\Fern Client"
InstallDirRegKey HKCU "Software\FernClient" "InstallDir"
RequestExecutionLevel user

VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "Fern Client"
VIAddVersionKey "CompanyName" "Fern Client Team"
VIAddVersionKey "LegalCopyright" "© 2026 Fern Client"
VIAddVersionKey "FileDescription" "Fern Client Minecraft Launcher & Custom Client"
VIAddVersionKey "FileVersion" "1.0.0.0"
VIAddVersionKey "ProductVersion" "1.0.0"

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Fern Client Core" SecCore
  SetOutPath "$INSTDIR"

  ; Clean previous installation files without touching user data
  File /r "..\dist\*"
  File /r "..\dist-electron\*"

  WriteRegStr HKCU "Software\FernClient" "InstallDir" "$INSTDIR"

  ; Add/Remove Programs integration
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "DisplayName" "Fern Client"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "Publisher" "Fern Client Team"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient" "NoRepair" 1

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\Fern Client"
  CreateShortcut "$SMPROGRAMS\Fern Client\Fern Client.lnk" "$INSTDIR\Fern Client.exe" "" "$INSTDIR\Fern Client.exe" 0
  CreateShortcut "$SMPROGRAMS\Fern Client\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Fern Client.lnk" "$INSTDIR\Fern Client.exe" "" "$INSTDIR\Fern Client.exe" 0
SectionEnd

Section "Uninstall"
  ; Remove binaries
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\Fern Client\Fern Client.lnk"
  Delete "$SMPROGRAMS\Fern Client\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Fern Client"
  Delete "$DESKTOP\Fern Client.lnk"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient"
  DeleteRegKey HKCU "Software\FernClient"

  ; Prompt user before removing user data / Minecraft installations
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove Fern Client user configurations and settings? (Minecraft world saves and installations will NOT be deleted unless chosen)" IDNO KeepData
    RMDir /r "$APPDATA\Fern Client\config"
  KeepData:
SectionEnd
