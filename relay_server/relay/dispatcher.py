import threading
import uuid
import json
from .common.framing import send_frame

class Dispatcher:
    def __init__(self, registry):
        self.registry = registry
        self._waiters = {}
        self._lock = threading.Lock()

    def send_command(self, client_id, command, timeout=10.0):
        sock, client_lock = self.registry.get_client_socket_and_lock(client_id)
        
        req_id = str(uuid.uuid4())
        command['id'] = req_id
        command['type'] = 'command'
        
        event = threading.Event()
        response_holder = {}

        with self._lock:
            self._waiters[req_id] = (event, response_holder)

        try:
            with client_lock:
                send_frame(sock, command)
            
            if not event.wait(timeout):
                raise TimeoutError("Client response timed out")
            
            return response_holder.get('response')

        finally:
            with self._lock:
                self._waiters.pop(req_id, None)

    def handle_response(self, response):
        req_id = response.get('id')
        with self._lock:
            waiter = self._waiters.get(req_id)
        
        if waiter:
            event, response_holder = waiter
            response_holder['response'] = response
            event.set()