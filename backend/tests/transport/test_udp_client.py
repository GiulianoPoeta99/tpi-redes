from tpi_redes.core.protocol import ProtocolHandler
from tpi_redes.transport.udp_client import UDPClient


class TestUDPClient:
    def test_send_file_udp(self, tmp_path):
        """Test UDP file sending.

        Verifies that header, metadata, and content packets are sent correctly.

        Args:
            tmp_path: Pytest fixture for source file.

        Returns:
            None: No return value.
        """
        file_path = tmp_path / "udp_source.txt"
        content = b"UDP Client Test Content"
        file_path.write_bytes(content)

        file_path.write_bytes(content)

        sent_packets = []

        class MockSocket:
            def sendto(self, data, addr):
                sent_packets.append((data, addr))

            def close(self):
                pass

            def getsockname(self):
                return ("127.0.0.1", 12345)

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb, **kwargs):
                pass

        import socket

        original_socket = socket.socket

        def mock_socket_ctor(*_args, **_kwargs):
            return MockSocket()

        socket.socket = mock_socket_ctor

        try:
            client = UDPClient()
            target_ip = "127.0.0.1"
            target_port = 9999
            client.send_files([file_path], target_ip, target_port)

            client.send_files([file_path], target_ip, target_port)

            assert len(sent_packets) >= 3
            header_pkt, addr1 = sent_packets[0]
            assert len(header_pkt) == 16
            assert addr1 == (target_ip, target_port)

            header = ProtocolHandler.unpack_header(header_pkt)
            assert header.op_code == b"F"
            assert header.file_size == len(content)

            assert header.file_size == len(content)

            metadata_pkt, addr2 = sent_packets[1]
            expected_meta_len = header.name_len + header.hash_len
            assert len(metadata_pkt) == expected_meta_len
            assert addr2 == (target_ip, target_port)

            assert len(metadata_pkt) == expected_meta_len
            assert addr2 == (target_ip, target_port)

            content_pkt, addr3 = sent_packets[2]
            assert content_pkt == content
            assert addr3 == (target_ip, target_port)

        finally:
            socket.socket = original_socket
