import http.server
import socketserver
import json
from urllib.parse import urlparse, parse_qs
import os

def create_http_server(addr, dispatcher):
    class HTTPHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            # --- THIS IS THE KEY FIX ---
            # The static folder is inside this file's directory.
            # We construct the correct absolute path to it.
            static_dir = os.path.join(os.path.dirname(__file__), 'static')
            # --- END OF FIX ---
            
            # The 'directory' argument tells the server where its root is.
            # All file requests will be relative to this path.
            super().__init__(*args, directory=static_dir, **kwargs)


DASHBOARDS_DIR = 'dashboards'

def create_http_server(addr, dispatcher):
    class HTTPHandler(http.server.SimpleHTTPRequestHandler):
        # ... (the __init__ method is the same as before) ...
        def __init__(self, *args, **kwargs):
            static_dir = os.path.join(os.path.dirname(__file__), 'static')
            super().__init__(*args, directory=static_dir, **kwargs)

        def do_GET(self):
            path = urlparse(self.path).path
            
            if path == '/':
                self.path = '/index.html'
                return super().do_GET()
            
            # --- NEW: Endpoint to list available dashboards ---
            elif path == '/dashboards/list':
                self._serve_dashboard_list()
            
            # --- MODIFIED: Endpoint to get a specific dashboard config ---
            elif path == '/dashboards/config':
                self._serve_dashboard_config()

            elif path == '/data':
                self._handle_data_request()
            else:
                super().do_GET()

        def _serve_dashboard_list(self):
            """Scans the dashboards directory and returns a list of configs."""
            dashboards = []
            try:
                for filename in os.listdir(DASHBOARDS_DIR):
                    if filename.endswith('.json'):
                        filepath = os.path.join(DASHBOARDS_DIR, filename)
                        with open(filepath, 'r') as f:
                            try:
                                config = json.load(f)
                                dashboards.append({
                                    'filename': filename,
                                    'name': config.get('dashboard_name', filename)
                                })
                            except json.JSONDecodeError:
                                # Ignore malformed JSON files
                                pass
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(dashboards).encode('utf-8'))
            except FileNotFoundError:
                self.send_error(404, "Dashboards directory not found")

        def _serve_dashboard_config(self):
            """Serves a single dashboard JSON file by name."""
            query = parse_qs(urlparse(self.path).query)
            filename = query.get('name', [None])[0]

            if not filename:
                return self.send_error(400, "Query parameter 'name' is required")
            
            # --- Security: Prevent path traversal attacks ---
            # Ensure the filename is just a name and not a path like ../../file
            safe_filename = os.path.basename(filename)
            if safe_filename != filename or not safe_filename.endswith('.json'):
                 return self.send_error(400, "Invalid filename")

            filepath = os.path.join(DASHBOARDS_DIR, safe_filename)
            try:
                with open(filepath, 'rb') as f:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404, f"Dashboard '{safe_filename}' not found")

        def _handle_data_request(self):
            query = parse_qs(urlparse(self.path).query)
            client_id = query.get('client_id', [None])[0]
            experiment = query.get('experiment', [None])[0]
            endpoint = {k: v[0] for k, v in query.items() if k not in ['client_id', 'experiment']}

            if not all([client_id, experiment, endpoint.get('name')]):
                return self.send_error(400, "Missing required query parameters")

            try:
                response = self.server.dispatcher.send_command(client_id, {"experiment": experiment, "endpoint": endpoint})
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response['response']).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))

    class ThreadingHTTPServer(socketserver.ThreadingTCPServer):
        allow_reuse_address = True

    server = ThreadingHTTPServer(addr, HTTPHandler)
    server.dispatcher = dispatcher
    return server