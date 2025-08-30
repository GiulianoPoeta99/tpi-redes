import logging

import click
from rich.console import Console
from rich.logging import RichHandler

# Configure Rich Console
console = Console()

# Configure Logging
logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(console=console, rich_tracebacks=True)],
)
logger = logging.getLogger("tpi-redes")


@click.group()
def cli():
    """Socket-based File Transfer App CLI"""
    pass


@cli.command()
@click.option("--port", default=8080, help="Port to listen on")
@click.option(
    "--protocol",
    type=click.Choice(["tcp", "udp"]),
    default="tcp",
    help="Protocol to use",
)
@click.option(
    "--save-dir", default="./received_files", help="Directory to save received files"
)
@click.option("--sniff", is_flag=True, help="Enable packet sniffer (requires root)")
def start_server(port: int, protocol: str, save_dir: str, sniff: bool):
    """Start the file receiver server."""
    sniffer = None
    if sniff:
        from tpi_redes.networking.sniffer import PacketSniffer

        # Default interface 'lo' for localhost testing, ideally configurable
        sniffer = PacketSniffer(interface="lo", port=port)
        sniffer.start()

    logger.info(f"Starting {protocol.upper()} server on port {port}...")
    logger.info(f"Saving files to: {save_dir}")

    try:
        if protocol == "tcp":
            from tpi_redes.networking.tcp_server import TCPServer

            server = TCPServer(host="0.0.0.0", port=port, save_dir=save_dir)
            server.start()
        else:
            from tpi_redes.networking.udp_server import UDPServer

            server = UDPServer(host="0.0.0.0", port=port, save_dir=save_dir)
            server.start()
    finally:
        if sniffer:
            sniffer.stop()


@cli.command()
@click.option(
    "--file", required=True, type=click.Path(exists=True), help="File to send"
)
@click.option("--ip", required=True, help="Destination IP")
@click.option("--port", default=8080, help="Destination Port")
@click.option(
    "--protocol",
    type=click.Choice(["tcp", "udp"]),
    default="tcp",
    help="Protocol to use",
)
@click.option("--sniff", is_flag=True, help="Enable packet sniffer (requires root)")
def send_file(file: str, ip: str, port: int, protocol: str, sniff: bool):
    """Send a file to a remote peer."""
    sniffer = None
    if sniff:
        from tpi_redes.networking.sniffer import PacketSniffer

        sniffer = PacketSniffer(interface="lo", port=port)
        sniffer.start()

    logger.info(f"Sending {file} to {ip}:{port} via {protocol.upper()}...")

    try:
        if protocol == "tcp":
            from pathlib import Path

            from tpi_redes.networking.tcp_client import TCPClient

            client = TCPClient()
            try:
                client.send_file(Path(file), ip, port)
            except Exception as e:
                logger.error(f"Failed to send file: {e}")
        else:
            from pathlib import Path

            from tpi_redes.networking.udp_client import UDPClient

            client = UDPClient()
            try:
                client.send_file(Path(file), ip, port)
            except Exception as e:
                logger.error(f"Failed to send file: {e}")
    finally:
        if sniffer:
            sniffer.stop()


if __name__ == "__main__":
    cli()
