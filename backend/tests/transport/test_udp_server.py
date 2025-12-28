from tpi_redes.transport.udp_server import UDPServer


class TestUDPServer:
    def test_initialization(self):
        server = UDPServer(host="127.0.0.1", port=9999, save_dir="/tmp")
        assert server.host == "127.0.0.1"
        assert server.port == 9999
        assert server.save_dir == "/tmp"

    def test_process_datagram_sequential(self, tmp_path):
        """Test sequential datagram processing.

        Simulates receiving Header, Metadata, and Content packets in order.

        Args:
            tmp_path: Pytest fixture for file saving.

        Returns:
            None: No return value.
        """
        save_dir = tmp_path / "received_udp"
        save_dir.mkdir()
        server = UDPServer(host="127.0.0.1", port=0, save_dir=str(save_dir))

        from tpi_redes.core.protocol import ProtocolHandler

        filename = "udp_test.txt"
        content = b"Hello UDP!"
        file_hash = "dummy_hash"
        addr = ("127.0.0.1", 55555)

        file_hash = "dummy_hash"
        addr = ("127.0.0.1", 55555)

        header = ProtocolHandler.pack_header(b"F", filename, len(content), file_hash)
        server.process_datagram(header, addr)

        metadata = filename.encode() + file_hash.encode()
        server.process_datagram(metadata, addr)

        server.process_datagram(content, addr)


        saved_file = save_dir / filename
        assert saved_file.exists()
        assert saved_file.read_bytes() == content
