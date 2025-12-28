from unittest.mock import MagicMock, patch

from tpi_redes.observability.sniffer import PacketSniffer


class TestPacketSniffer:
    @patch("os.geteuid", return_value=0)
    @patch("tpi_redes.observability.sniffer.AsyncSniffer")
    def test_start_stop(self, mock_sniffer_cls, _):
        """Test start and stop lifecycle.

        Verifies that the sniffer is initialized, started, and stopped correctly.

        Args:
            mock_sniffer_cls: Mocked AsyncSniffer class.
            _: Unused geteuid mock.

        Returns:
            None: No return value.
        """
        mock_sniffer_instance = MagicMock()
        mock_sniffer_cls.return_value = mock_sniffer_instance

        sniffer = PacketSniffer(interface="eth0", port=8080)

        sniffer.start()
        mock_sniffer_cls.assert_called_once()
        mock_sniffer_instance.start.assert_called_once()

        sniffer.stop()
        mock_sniffer_instance.stop.assert_called_once()

    @patch("tpi_redes.observability.sniffer.AsyncSniffer")
    def test_callback_logic(self, _):
        """Test packet processing callback.

        Uses real Scapy packets to avoid mock serialization issues.
        Accesses private `_process_packet` to simulate callback execution.

        Args:
            _: Unused AsyncSniffer mock.

        Returns:
            None: No return value.
        """
        from scapy.layers.inet import IP, TCP

        sniffer = PacketSniffer(interface="lo", port=8080)

        pkt = IP(src="127.0.0.1", dst="127.0.0.1") / TCP(
            dport=8080, flags="S", seq=100, ack=0
        )

        sniffer._process_packet(pkt)

        assert len(sniffer.get_packets()) == 1
        assert "S" in sniffer.get_packets()[0]
