import socket
from unittest.mock import MagicMock, patch

from tpi_redes.services.proxy import ProxyServer


class TestProxyServer:
    def test_corrupt_data(self):
        # Force corruption
        proxy = ProxyServer(8081, "127.0.0.1", 8080, corruption_rate=1.0)
        
        data = b"Hello"
        corrupted = proxy.corrupt_data(data)
        
        # Must be same length but different content (unless unlucky bit flip on unused space, but bytearray check covers it)
        assert len(corrupted) == len(data)
        assert corrupted != data

    def test_no_corruption(self):
        # Disable corruption
        proxy = ProxyServer(8081, "127.0.0.1", 8080, corruption_rate=0.0)
        
        data = b"Hello"
        corrupted = proxy.corrupt_data(data)
        
        assert corrupted == data

    @patch("socket.socket")
    @patch("threading.Thread")
    def test_proxy_handle_client(self, mock_thread, mock_socket_cls):
        # Setup Mocks
        proxy = ProxyServer(8081, "target", 8080, 0.0)
        mock_client_socket = MagicMock()
        mock_target_socket = MagicMock()
        
        mock_socket_cls.return_value = mock_target_socket # For the outbound connection

        # Run handle_client
        proxy.handle_client(mock_client_socket)

        # Verify it connected to target
        mock_target_socket.connect.assert_called_with(("target", 8080))

        # Verify threads started (2 threads: client->target, target->client)
        assert mock_thread.call_count == 2
        mock_thread.return_value.start.assert_called()
