from unittest.mock import MagicMock, patch

from tpi_redes.networking.sniffer import PacketSniffer


class TestPacketSniffer:
    @patch("tpi_redes.networking.sniffer.AsyncSniffer")
    def test_start_stop(self, mock_sniffer_cls):
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

    @patch("tpi_redes.networking.sniffer.AsyncSniffer")
    def test_callback_logic(self, _):
        # We want to test that our callback extracts info correctly.
        # This is slightly tricky because the callback is passed to AsyncSniffer
        # and executed by Scapy. We can test the _process_packet method directly.

        sniffer = PacketSniffer(interface="lo", port=8080)

        # Mock a Scapy packet
        # Scapy packets are complex, we'll mock the attributes we access.
        mock_pkt = MagicMock()
        mock_pkt.haslayer.return_value = True
        mock_pkt.summary.return_value = "IP / TCP 127.0.0.1:12345 > 127.0.0.1:8080 S"

        # Execute callback
        # We need to access the private method or expose it.
        # For testing, accessing _process_packet is acceptable.
        sniffer._process_packet(mock_pkt)

        # Verify it added to the list (if we store them) or logged.
        # For now, let's assume get_packets returns the list.
        assert len(sniffer.get_packets()) == 1
        assert sniffer.get_packets()[0] == mock_pkt.summary()
