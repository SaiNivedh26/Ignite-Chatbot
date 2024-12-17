import subprocess
import platform
import time
    
    # Commands for the chat application
command_uvicorn = ["python", "app.py"]
command_npm = ["npm", "start"]

if platform.system() == "Windows":
        process_uvicorn = subprocess.Popen(command_uvicorn, cwd="./", creationflags=subprocess.CREATE_NEW_CONSOLE, shell=True)
        time.sleep(10)
        process_npm  = subprocess.Popen(command_npm, cwd="./", creationflags=subprocess.CREATE_NEW_CONSOLE, shell=True)

else:
        process_uvicorn = subprocess.Popen(command_uvicorn, cwd="./")
        time.sleep(10)
        process_npm  = subprocess.Popen(command_npm, cwd="../")

if process_uvicorn.poll() is None and process_npm.poll() is None:
        print("Chat application started successfully.")
else:
        print("Failed to start the chat application. Please check the terminal for errors.")

