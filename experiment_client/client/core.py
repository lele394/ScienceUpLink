import socket
import struct
import json
import threading
import importlib.util
import sys
import io
import os
import time

# Assume the common framing utils are in a shared location
from .common.framing import send_frame, recv_frame

# --- Configuration ---
RELAY_HOST = 'localhost'
RELAY_PORT = 9001
MODULE_DIR = os.path.join(os.path.dirname(__file__), '..', 'modules')

class Client:
    def __init__(self, client_id: str):
        self.client_id = client_id
        self._loaded_modules = {}

    def _load_module(self, name: str):
        if name in self._loaded_modules:
            # In a real system, you might add reload logic here
            return self._loaded_modules[name]

        path = os.path.join(MODULE_DIR, f"{name}.py")
        if not os.path.isfile(path):
            raise FileNotFoundError(f"No module {name} at {path}")

        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self._loaded_modules[name] = mod
        return mod

    def _handle_command(self, cmd: dict) -> dict:
        exp_name = cmd.get('experiment')
        endpoint = cmd.get('endpoint', {})
        req_id = cmd.get('id')

        try:
            mod = self._load_module(exp_name)
            
            # Simple sandboxing: capture stdout/stderr
            old_stdout, old_stderr = sys.stdout, sys.stderr
            buf_out, buf_err = io.StringIO(), io.StringIO()
            sys.stdout, sys.stderr = buf_out, buf_err
            
            result = mod.handle(endpoint)
            
            sys.stdout, sys.stderr = old_stdout, old_stderr

            return {
                "type": "response", "id": req_id, "code": 1,
                "response": result,
                "stdout": buf_out.getvalue(), "stderr": buf_err.getvalue()
            }
        except Exception as e:
            print(f"Error handling command for experiment '{exp_name}': {e}")
            return {
                "type": "response", "id": req_id, "code": 0,
                "response": {"error": str(e)}, "stdout": "", "stderr": ""
            }

    def run(self):
        while True:
            try:
                sock = socket.create_connection((RELAY_HOST, RELAY_PORT))
                print(f"Connected to relay at {RELAY_HOST}:{RELAY_PORT}")
                
                # Announce ourselves to the relay
                hello_msg = {"type": "hello", "client_id": self.client_id}
                send_frame(sock, hello_msg)

                while True:
                    msg = recv_frame(sock)
                    if msg is None:
                        print("Relay disconnected.")
                        break
                    
                    if msg.get('type') == 'command':
                        response = self._handle_command(msg)
                        send_frame(sock, response)

            except ConnectionRefusedError:
                print("Connection to relay refused. Retrying in 5 seconds...")
                time.sleep(5)
            except Exception as e:
                print(f"An error occurred: {e}. Reconnecting in 5 seconds...")
                time.sleep(5)