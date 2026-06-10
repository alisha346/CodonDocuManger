import winreg
import os

def register():
    manifest_path = r"D:\CodonDocuManger\com.codondocumanger.companion.json"
    
    # Registry paths for Chrome and Edge
    paths = [
        r"Software\Microsoft\Edge\NativeMessagingHosts\com.codondocumanger.companion",
        r"Software\Google\Chrome\NativeMessagingHosts\com.codondocumanger.companion"
    ]
    
    for path in paths:
        try:
            # Open or create the key in HKEY_CURRENT_USER
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, path)
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, manifest_path)
            winreg.CloseKey(key)
            print(f"[SUCCESS] Registered registry key for: HKCU\\{path}")
        except Exception as e:
            print(f"[ERROR] Failed to register HKCU\\{path}: {e}")

if __name__ == '__main__':
    register()
