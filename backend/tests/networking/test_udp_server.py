from tpi_redes.networking.udp_server import UDPServer


class TestUDPServer:
    def test_initialization(self):
        server = UDPServer(host="127.0.0.1", port=9999, save_dir="/tmp")
        assert server.host == "127.0.0.1"
        assert server.port == 9999
        assert server.save_dir == "/tmp"

    def test_process_datagram_sequential(self, tmp_path):
        save_dir = tmp_path / "received_udp"
        save_dir.mkdir()
        server = UDPServer(host="127.0.0.1", port=0, save_dir=str(save_dir))

        from tpi_redes.networking.protocol import ProtocolHandler

        filename = "udp_test.txt"
        content = b"Hello UDP!"
        file_hash = "dummy_hash"
        addr = ("127.0.0.1", 55555)

        # 1. Header
        header = ProtocolHandler.pack_header(b"F", filename, len(content), file_hash)
        server.process_datagram(header, addr)

        # 2. Metadata
        metadata = filename.encode() + file_hash.encode()
        server.process_datagram(metadata, addr)

        # 3. Content
        server.process_datagram(content, addr)

        # Verify
        saved_file = save_dir / filename
        assert saved_file.exists()
        assert saved_file.read_bytes() == content
