from unittest.mock import MagicMock, call, patch

import pytest

from tpi_redes.networking.tcp_client import TCPClient
from tpi_redes.networking.udp_client import UDPClient


@pytest.fixture
def mock_socket():
    with patch("socket.socket") as mock_sock:
        mock_inst = MagicMock()
        mock_sock.return_value.__enter__.return_value = mock_inst
        mock_inst.getsockname.return_value = ("127.0.0.1", 12345)
        yield mock_inst


@pytest.fixture
def mock_file(tmp_path):
    f = tmp_path / "test_delay.txt"
    f.write_text("A" * 8192)  # 2 chunks of 4096
    return f


@patch("time.sleep")
@pytest.mark.usefixtures("mock_socket")
def test_tcp_client_delay(mock_sleep, mock_file):
    client = TCPClient()
    delay = 0.5
    client.send_files([mock_file], "127.0.0.1", 8080, delay=delay)

    # Needs to be called at least once per chunk
    # check calls to ensure sleep(0.5) happened
    calls = [call(delay), call(delay)]
    mock_sleep.assert_has_calls(calls, any_order=False)


@patch("time.sleep")
@pytest.mark.usefixtures("mock_socket")
def test_udp_client_delay(mock_sleep, mock_file):
    client = UDPClient()
    delay = 0.5
    client.send_files([mock_file], "127.0.0.1", 8080, delay=delay)

    delay_calls = [c for c in mock_sleep.mock_calls if c == call(delay)]
    assert len(delay_calls) >= 2
