from tpi_redes.networking.tcp_server import TCPServer


class TestTCPServer:
    def test_initialization(self):
        server = TCPServer(host="127.0.0.1", port=9999, save_dir="/tmp")
        assert server.host == "127.0.0.1"
        assert server.port == 9999
        assert server.save_dir == "/tmp"

    def test_handle_client_receive_file(self, tmp_path):
        # Setup
        save_dir = tmp_path / "received"
        save_dir.mkdir()
        server = TCPServer(host="127.0.0.1", port=0, save_dir=str(save_dir))

        # Mock socket
        class MockSocket:
            def __init__(self, data_stream: bytes):
                self.data_stream = data_stream
                self.closed = False

            def recv(self, bufsize: int) -> bytes:
                if not self.data_stream:
                    return b""
                chunk = self.data_stream[:bufsize]
                self.data_stream = self.data_stream[bufsize:]
                return chunk

            def close(self):
                self.closed = True

        # Prepare data: Header + Content
        from tpi_redes.networking.protocol import ProtocolHandler
        filename = "test_file.txt"
        content = b"Hello TCP World!"
        file_hash = "dummy_hash"

        header = ProtocolHandler.pack_header(b'F', filename, len(content), file_hash)
        stream_data = header + filename.encode() + file_hash.encode() + content

        mock_sock = MockSocket(stream_data)

        # Execute
        server.handle_client(mock_sock, ("127.0.0.1", 12345))

        # Verify
        saved_file = save_dir / filename
        assert saved_file.exists()
        assert saved_file.read_bytes() == content

