import struct
import json

def send_frame(sock, obj):
    data = json.dumps(obj).encode('utf-8')
    sock.sendall(struct.pack('>I', len(data)) + data)

def recv_frame(sock):
    try:
        hdr = recvn(sock, 4)
        if not hdr: return None
        length = struct.unpack('>I', hdr)[0]
        body = recvn(sock, length)
        if not body: return None
        return json.loads(body.decode('utf-8'))
    except (struct.error, ConnectionResetError):
        return None

def recvn(sock, n):
    buf = b''
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf