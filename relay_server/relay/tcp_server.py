import socketserver
from .common.framing import recv_frame

def create_tcp_server(addr, registry, dispatcher):
    class TCPHandler(socketserver.BaseRequestHandler):
        def handle(self):
            client_id = None
            try:
                hello = recv_frame(self.request)
                if not hello or hello.get('type') != 'hello':
                    print("Client failed to send hello message.")
                    return
                
                client_id = hello['client_id']
                self.server.registry.add_client(client_id, self.request)

                while True:
                    msg = recv_frame(self.request)
                    if msg is None: break
                    
                    if msg.get('type') == 'response':
                        self.server.dispatcher.handle_response(msg)

            finally:
                if client_id:
                    self.server.registry.remove_client(client_id)

    class ThreadingTCPServer(socketserver.ThreadingTCPServer):
        allow_reuse_address = True

    server = ThreadingTCPServer(addr, TCPHandler)
    server.registry = registry
    server.dispatcher = dispatcher
    return server