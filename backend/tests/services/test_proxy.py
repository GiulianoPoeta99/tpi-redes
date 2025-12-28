from unittest.mock import MagicMock, patch

from tpi_redes.services.proxy import ProxyServer


class TestProxyServer:
    """Tests for the ProxyServer class."""

    def test_corrupt_data(self):
        """Test data corruption logic.

        Verifies that data is altered when corruption rate is set to 1.0.

        Returns:
            None: No return value.
        """
        proxy = ProxyServer(8081, "127.0.0.1", 8080, corruption_rate=1.0)

        data = b"Hello"
        corrupted = proxy.corrupt_data(data)

        assert len(corrupted) == len(data)
        assert corrupted != data

    def test_no_corruption(self):
        """Test no-corruption logic.

        Verifies that data remains unchanged when corruption rate is set to 0.0.

        Returns:
            None: No return value.
        """

        proxy = ProxyServer(8081, "127.0.0.1", 8080, corruption_rate=0.0)

        data = b"Hello"
        corrupted = proxy.corrupt_data(data)

        assert corrupted == data

    @patch("socket.socket")
    @patch("threading.Thread")
    def test_proxy_handle_client(self, mock_thread, mock_socket_cls):
        """Test proxy client handling.

        Args:
            mock_thread: Mocked threading.Thread class.
            mock_socket_cls: Mocked socket.socket class.

        Returns:
            None: No return value.
        """

        proxy = ProxyServer(8081, "target", 8080, 0.0)
        mock_client_socket = MagicMock()
        mock_target_socket = MagicMock()

        mock_socket_cls.return_value = mock_target_socket

        proxy.handle_client(mock_client_socket)

        mock_target_socket.connect.assert_called_with(("target", 8080))

        assert mock_thread.call_count == 2
        mock_thread.return_value.start.assert_called()
