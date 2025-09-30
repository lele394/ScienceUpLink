import os
import sys

# Add the client package to the path to allow imports
sys.path.append(os.path.dirname(__file__))

from client.core import Client

RELAY_HOST = 'localhost'
RELAY_PORT = 9001

if __name__ == "__main__":
    print("Starting experiment client...")
    # This ID must match the 'clientId' in the relay's ui_config.json
    client = Client(client_id="test-client-1", RELAY_HOST=RELAY_HOST, RELAY_PORT=RELAY_PORT) 
    client.run()