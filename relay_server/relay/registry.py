import threading

class ClientRegistry:
    def __init__(self):
        self._clients = {}
        self._lock = threading.Lock()

    def add_client(self, client_id, sock):
        with self._lock:
            self._clients[client_id] = {"sock": sock, "lock": threading.Lock()}
        print(f"Client registered: {client_id}")

    def remove_client(self, client_id):
        with self._lock:
            if client_id in self._clients:
                del self._clients[client_id]
        print(f"Client unregistered: {client_id}")

    def get_client_socket_and_lock(self, client_id):
        with self._lock:
            client = self._clients.get(client_id)
            if client:
                return client["sock"], client["lock"]
        raise KeyError(f"Client '{client_id}' not found.")