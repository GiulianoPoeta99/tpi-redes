from unittest.mock import MagicMock, patch

from tpi_redes.observability.sniffer import PacketSniffer


class TestPacketSniffer:
    @patch("os.geteuid", return_value=0)
    @patch("tpi_redes.observability.sniffer.AsyncSniffer")
    def test_start_stop(self, mock_sniffer_cls, mock_geteuid):
        # Setup mock
        mock_sniffer_instance = MagicMock()
        mock_sniffer_cls.return_value = mock_sniffer_instance

        # Initialize
        sniffer = PacketSniffer(interface="eth0", port=8080)

        # Start
        sniffer.start()
        mock_sniffer_cls.assert_called_once()
        mock_sniffer_instance.start.assert_called_once()

        # Stop
        sniffer.stop()
        mock_sniffer_instance.stop.assert_called_once()

    @patch("tpi_redes.observability.sniffer.AsyncSniffer")
    def test_callback_logic(self, _):
        # Use real Scapy packets to avoid Mock serialization issues with json.dumps
        from scapy.layers.inet import IP, TCP

        sniffer = PacketSniffer(interface="lo", port=8080)

        # Create a real packet
        pkt = IP(src="127.0.0.1", dst="127.0.0.1") / TCP(
            dport=8080, flags="S", seq=100, ack=0
        )

        # Execute callback
        # We need to access the private method or expose it.
        # For testing, accessing _process_packet is acceptable.
        sniffer._process_packet(pkt)

        # Verify it added to the list
        assert len(sniffer.get_packets()) == 1
        assert "S" in sniffer.get_packets()[0]  # Summary should contain flag
