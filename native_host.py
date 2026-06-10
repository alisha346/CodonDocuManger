import sys
import json
import struct
import urllib.request
import subprocess
import os

def is_server_running():
    try:
        req = urllib.request.Request("http://localhost:8765/api/recording/status")
        with urllib.request.urlopen(req, timeout=1) as response:
            return response.status == 200
    except Exception:
        return False

def start_server():
    if is_server_running():
        return "Already running"
    
    exe_path = r"D:\CodonDocuManger\CodonDocuManger.exe"
    if os.path.exists(exe_path):
        # CREATE_NEW_CONSOLE (0x00000010) launches the executable in a new command window
        subprocess.Popen([exe_path], creationflags=0x00000010, cwd=r"D:\CodonDocuManger")
        return "Started via EXE"
    
    bat_path = r"D:\CodonDocuManger\run_scribe.bat"
    if os.path.exists(bat_path):
        subprocess.Popen([bat_path], creationflags=0x00000010, cwd=r"D:\CodonDocuManger")
        return "Started via BAT"
        
    return "Failed: No executable or batch file found"

def send_message(message):
    data = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()

def main():
    while True:
        try:
            # Read message length (4 bytes)
            length_bytes = sys.stdin.buffer.read(4)
            if not length_bytes:
                break
            length = struct.unpack('I', length_bytes)[0]
            
            # Read message body
            message_bytes = sys.stdin.buffer.read(length)
            if not message_bytes:
                break
            message = json.loads(message_bytes.decode('utf-8'))
            
            # Process command
            command = message.get('command')
            if command == 'start_server':
                status = start_server()
                send_message({"status": "success", "info": status})
            elif command == 'ping':
                send_message({"status": "pong"})
            else:
                send_message({"status": "error", "error": "Unknown command"})
        except Exception as e:
            try:
                send_message({"status": "error", "error": str(e)})
            except:
                pass
            break

if __name__ == '__main__':
    main()
