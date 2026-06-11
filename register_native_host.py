import winreg
import os
import json

def register():
    # Resolve paths relative to where this script is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    manifest_path = os.path.join(current_dir, "com.codondocumanger.companion.json")
    
    # 1. Update the companion manifest's path dynamically to native_host.bat's location
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            bat_path = os.path.join(current_dir, "native_host.bat")
            data["path"] = bat_path
            
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"[SUCCESS] Updated manifest path in JSON to: {bat_path}")
        except Exception as e:
            print(f"[ERROR] Failed to update JSON manifest: {e}")
    else:
        print(f"[WARNING] Manifest file not found at: {manifest_path}")

    # 2. Registry paths for Chrome and Edge
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
