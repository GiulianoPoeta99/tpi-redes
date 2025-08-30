from tpi_redes.networking.protocol import ProtocolHandler
from tpi_redes.networking.udp_client import UDPClient


class TestUDPClient:
    def test_send_file_udp(self, tmp_path):
        # Setup source file
        file_path = tmp_path / "udp_source.txt"
        content = b"UDP Client Test Content"
        file_path.write_bytes(content)

        # Mock socket
        sent_packets = []

        class MockSocket:
            def sendto(self, data, addr):
                sent_packets.append((data, addr))

            def close(self):
                pass

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        # Mock socket.socket
        import socket

        original_socket = socket.socket

        def mock_socket_ctor(*_args, **_kwargs):
            return MockSocket()

        socket.socket = mock_socket_ctor

        try:
            client = UDPClient()
            target_ip = "127.0.0.1"
            target_port = 9999
            client.send_file(file_path, target_ip, target_port)

            # Verify sent packets
            # 1. Header
            assert len(sent_packets) >= 3
            header_pkt, addr1 = sent_packets[0]
            assert len(header_pkt) == 16
            assert addr1 == (target_ip, target_port)

            header = ProtocolHandler.unpack_header(header_pkt)
            assert header.op_code == b"F"
            assert header.file_size == len(content)

            # 2. Metadata
            metadata_pkt, addr2 = sent_packets[1]
            expected_meta_len = header.name_len + header.hash_len
            assert len(metadata_pkt) == expected_meta_len
            assert addr2 == (target_ip, target_port)

            # 3. Content
            # Since content is small, it should be in one chunk
            content_pkt, addr3 = sent_packets[2]
            assert content_pkt == content
            assert addr3 == (target_ip, target_port)

        finally:
            socket.socket = original_socket
