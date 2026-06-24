; MasterMind Windows NSIS installer customizations
; Sets up registry entries and shortcuts

!macro customInstall
  ; Write uninstall registry key
  WriteRegStr HKCU "Software\MasterMind" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\MasterMind" "Version" "${VERSION}"
!macroend

!macro customUnInstall
  ; Clean up registry on uninstall
  DeleteRegKey HKCU "Software\MasterMind"
!macroend
