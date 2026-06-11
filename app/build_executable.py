import os
import subprocess
import sys
import shutil
from pathlib import Path

def build():
    app_dir = Path(__file__).parent.resolve()
    frontend_dir = app_dir / "frontend"
    backend_dir = app_dir / "backend"
    
    print("--- 1. Building React Frontend ---")
    if not (frontend_dir / "package.json").exists():
        print("[ERROR] Frontend directory not found.")
        sys.exit(1)
        
    print("Running npm run build...")
    subprocess.run("npm run build", shell=True, cwd=str(frontend_dir), check=True)
    
    dist_dir = frontend_dir / "dist"
    if not dist_dir.exists():
        print("[ERROR] Frontend dist directory was not created.")
        sys.exit(1)
    print("Frontend build successful!")

    print("\n--- 2. Building Standalone Executable via PyInstaller ---")
    
    # We will trigger pyinstaller from within our virtual environment
    venv_pyinstaller = app_dir / ".venv" / "Scripts" / "pyinstaller.exe"
    if not venv_pyinstaller.exists():
        venv_pyinstaller = "pyinstaller"
        
    cmd = [
        str(venv_pyinstaller),
        "--onefile",
        "--noconfirm",
        "--clean",
        "--name", "CodonDocuManger",
        "--add-data", "frontend/dist;frontend/dist",
        "--hidden-import", "pynput.keyboard._win32",
        "--hidden-import", "pynput.mouse._win32",
        str(backend_dir / "main.py")
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd, cwd=str(app_dir), check=True)
    
    exe_file = app_dir / "dist" / "CodonDocuManger.exe"
    if exe_file.exists():
        print(f"\n[SUCCESS] Standalone executable created at: {exe_file}")
        # Copy to the root directory D:\CodonDocuManger for convenience
        dest_exe = app_dir.parent / "CodonDocuManger.exe"
        shutil.copy2(exe_file, dest_exe)
        print(f"[INFO] Copied executable to: {dest_exe}")
    else:
        print("\n[ERROR] Executable was not found in dist/")
        sys.exit(1)

if __name__ == "__main__":
    build()
