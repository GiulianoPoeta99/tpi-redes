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
def start_server(port: int, protocol: str, save_dir: str):
    """Start the file receiver server."""
    logger.info(f"Starting {protocol.upper()} server on port {port}...")
    logger.info(f"Saving files to: {save_dir}")

    if protocol == "tcp":
        from tpi_redes.networking.tcp_server import TCPServer
        server = TCPServer(host="0.0.0.0", port=port, save_dir=save_dir)
        server.start()
    else:
        from tpi_redes.networking.udp_server import UDPServer
        server = UDPServer(host="0.0.0.0", port=port, save_dir=save_dir)
        server.start()


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
def send_file(file: str, ip: str, port: int, protocol: str):
    """Send a file to a remote peer."""
    logger.info(f"Sending {file} to {ip}:{port} via {protocol.upper()}...")

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


if __name__ == "__main__":
    cli()
