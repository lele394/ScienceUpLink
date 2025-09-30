import threading
from relay.tcp_server import create_tcp_server
from relay.http_server import create_http_server
from relay.registry import ClientRegistry
from relay.dispatcher import Dispatcher

# --- Configuration ---
TCP_HOST, TCP_PORT = "0.0.0.0", 9001
HTTP_HOST, HTTP_PORT = "0.0.0.0", 8000

if __name__ == "__main__":
    registry = ClientRegistry()
    dispatcher = Dispatcher(registry)

    tcp_server = create_tcp_server((TCP_HOST, TCP_PORT), registry, dispatcher)
    http_server = create_http_server((HTTP_HOST, HTTP_PORT), dispatcher)

    tcp_thread = threading.Thread(target=tcp_server.serve_forever, daemon=True)
    http_thread = threading.Thread(target=http_server.serve_forever, daemon=True)

    tcp_thread.start()
    http_thread.start()

    print(f"Relay TCP server listening on {TCP_HOST}:{TCP_PORT}")
    print(f"Relay HTTP server listening on http://{HTTP_HOST}:{HTTP_PORT}")
    
    # Create an event that will never be set, so we wait forever.
    shutdown_event = threading.Event()
    try:
        shutdown_event.wait() # Block here indefinitely using 0% CPU
    except KeyboardInterrupt:
        print("\nShutting down...")
        tcp_server.shutdown()
        http_server.shutdown()