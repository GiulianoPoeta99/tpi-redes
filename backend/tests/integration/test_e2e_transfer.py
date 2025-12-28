import hashlib
import threading
import time
import socket
from pathlib import Path
import pytest
from tpi_redes.transport.tcp_client import TCPClient
from tpi_redes.transport.tcp_server import TCPServer

def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]

class TestEndToEndTransfer:
    def test_tcp_file_transfer(self, tmp_path):
        # 1. Setup Environment
        server_port = get_free_port()
        receive_dir = tmp_path / "received"
        receive_dir.mkdir()
        
        # Create Dummy File
        send_file = tmp_path / "test_file.bin"
        original_data = b"Hello World" * 1000
        send_file.write_bytes(original_data)
        
        # 2. Start Server in Thread
        server = TCPServer(host="127.0.0.1", port=server_port, save_dir=str(receive_dir))
        
        server_thread = threading.Thread(target=server.start, daemon=True)
        server_thread.start()
        
        # Give server time to bind
        time.sleep(0.5)
        
        try:
            # 3. Start Client and Transfer
            client = TCPClient()
            client.send_files([send_file], "127.0.0.1", server_port)
            
            # 4. Verification
            # Allow time for server to flush to disk
            time.sleep(0.5)
            
            received_file = receive_dir / "test_file.bin"
            assert received_file.exists()
            assert received_file.read_bytes() == original_data
            
            # Verify Hash File
            hash_file = receive_dir / "test_file.bin.sha256"
            assert hash_file.exists()
            expected_hash = hashlib.sha256(original_data).hexdigest()
            assert hash_file.read_text() == expected_hash

        finally:
            # Cleanup (Server runs indefinitely, so we can't easily stop it cleanly without logic)
            # But daemon thread will die with main process.
            # Ideally TCPServer should have a stop() method.
            server.stop()
