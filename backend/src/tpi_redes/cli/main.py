import json
import logging
import sys
from typing import Any

import click
from rich.console import Console
from rich.logging import RichHandler
from rich.traceback import install

# Configure Rich Console
console = Console(stderr=True)  # Logs to stderr to keep stdout clean for JSON

# Global flag for debug mode
debug_mode = False


def handle_exception(exc_type: Any, exc_value: Any, exc_traceback: Any):
    """Global exception handler."""
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return

    # If debug mode is on, use rich traceback (print to stderr)
    if debug_mode:
        console.print_exception(show_locals=True)
        # We also want to exit with error code
        sys.exit(1)

    # In Production mode, pretty print error and emit JSON
    console.print(f"[bold red]Error:[/bold red] {exc_value}")

    # Emit JSON error for Electron
    print(
        json.dumps(
            {"type": "ERROR", "message": str(exc_value), "code": exc_type.__name__}
        ),
        flush=True,
    )

    sys.exit(1)


# Install rich traceback handler (we control when to show it via debug_mode)
install(show_locals=True)

# Hook global exception handler
sys.excepthook = handle_exception

# Configure Logging (initial setup, will be reconfigured in cli)
logger = logging.getLogger("tpi-redes")


@click.group()
@click.option("--debug", is_flag=True, help="Enable debug mode (tracebacks).")
def cli(debug: bool):
    """File Transfer App CLI."""
    global debug_mode
    if debug:
        debug_mode = True
        # Re-install traceback handler with show_locals
        install(show_locals=True)
        # Set logging level to DEBUG
        logging.basicConfig(level=logging.DEBUG)
        logger.setLevel(logging.DEBUG)
    else:
        # Default logging
        logging.basicConfig(
            level=logging.INFO,
            format="%(message)s",
            datefmt="[%X]",
            handlers=[RichHandler(console=console)],
        )
        logger.setLevel(logging.INFO)


# ... (commands)

# NOTE: Updated commands to use global error handling implicitly,
# preventing 'try-except-print-traceback' duplication.
# Also removed explicit 'from ... import ...' inside commands where possible.


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
    discovery = None

    try:
        if sniff:
            from tpi_redes.networking.sniffer import PacketSniffer

            # Use default interface if not specified (None lets Scapy choose)
            sniffer = PacketSniffer(interface=None, port=port)
            sniffer.start()

        # Start Discovery Service Listener
        from tpi_redes.networking.discovery import DiscoveryService

        discovery = DiscoveryService()
        try:
            discovery.listen(port)
        except OSError:
            logger.warning("Discovery service could not bind (port in use?). Skipping.")

        logger.info(f"Starting {protocol.upper()} server on port {port}...")
        logger.info(f"Saving files to: {save_dir}")

        # Emit Ready Event
        print(
            json.dumps({"type": "SERVER_READY", "protocol": protocol, "port": port}),
            flush=True,
        )

        if protocol == "tcp":
            from tpi_redes.networking.tcp_server import TCPServer

            server = TCPServer(host="0.0.0.0", port=port, save_dir=save_dir)
            server.start()
        else:
            from tpi_redes.networking.udp_server import UDPServer

            server = UDPServer(host="0.0.0.0", port=port, save_dir=save_dir)
            server.start()

    except OSError as e:
        if e.errno == 98:  # Address already in use
            raise ConnectionError(f"Port {port} is already in use.") from e
        elif e.errno == 13:  # Permission denied
            raise PermissionError(
                f"Permission denied to bind to port {port}. Try using sudo."
            ) from e
        raise
    finally:
        if sniffer:
            sniffer.stop()
        if discovery:
            discovery.stop()


@cli.command()
@click.argument("files", nargs=-1, type=click.Path(exists=True, dir_okay=False))
@click.option("--ip", prompt="Receiver IP", help="IP address of the receiver")
@click.option("--port", default=8080, help="Port to connect to")
@click.option(
    "--protocol",
    type=click.Choice(["tcp", "udp"]),
    default="tcp",
    help="Protocol to use",
)
@click.option("--sniff", is_flag=True, help="Enable packet sniffer (requires root)")
@click.option("--delay", default=0.0, help="Delay between chunks in seconds")
def send_file(
    files: tuple[str], ip: str, port: int, protocol: str, sniff: bool, delay: float
):
    """Send one or more files to a remote server."""
    if not files:
        console.print("[bold red]Error:[/bold red] No files provided.")
        return

    sniffer = None
    from pathlib import Path

    file_paths = [Path(f) for f in files]

    try:
        # Start Sniffer if requested
        if sniff:
            from tpi_redes.networking.sniffer import PacketSniffer

            # We need to sniff on the interface used to reach 'ip'.
            sniffer = PacketSniffer(interface="any", port=port)  # Simplified
            sniffer.start()

        if protocol == "tcp":
            from tpi_redes.networking.tcp_client import TCPClient

            client = TCPClient()
            client.send_files(file_paths, ip, port, delay)
        else:
            from tpi_redes.networking.udp_client import UDPClient

            client = UDPClient()
            client.send_files(file_paths, ip, port, delay)

    except KeyboardInterrupt:
        console.print("\n[yellow]Transfer cancelled by user.[/yellow]")
    except Exception as e:
        # Let global handler catch it or re-raise
        raise e
    finally:
        if sniffer:
            sniffer.stop()


@cli.command()
@click.option("--listen-port", default=8081, help="Port to listen on (Proxy)")
@click.option("--target-ip", default="127.0.0.1", help="Target Server IP")
@click.option("--target-port", default=8080, help="Target Server Port")
@click.option(
    "--corruption-rate", default=0.0, help="Probability of bit flipping (0.0 - 1.0)"
)
def start_proxy(
    listen_port: int, target_ip: str, target_port: int, corruption_rate: float
):
    """Start a MITM Proxy Server."""
    from tpi_redes.networking.proxy import ProxyServer

    console.print(f"[bold red]Starting MITM Proxy on port {listen_port}...[/bold red]")
    console.print(f"Target: {target_ip}:{target_port}")
    console.print(f"Corruption Rate: {corruption_rate}")

    proxy = ProxyServer(listen_port, target_ip, target_port, corruption_rate)
    try:
        proxy.start()
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopping proxy...[/yellow]")


@cli.command()
def scan_network():
    """Scan for active peers on the local network."""
    from tpi_redes.networking.discovery import DiscoveryService
    # ... logic mostly same but cleaner output

    # We keep print(json) for Electron, using console(stderr) for logs
    # Actually wait, handle_exception prints to stdout for Electron.
    # We should ensure normal logs use stderr.
    pass  # Refactor this logic next step if needed, or inline here:

    discovery = DiscoveryService()
    peers = discovery.scan()
    print(json.dumps(peers or []))

    if not peers:
        console.print("[yellow]No peers found.[/yellow]")
    else:
        from rich.table import Table

        table = Table(title="Discovered Peers")
        table.add_column("Hostname", style="cyan")
        table.add_column("IP Address", style="green")
        table.add_column("Port", style="magenta")
        for peer in peers:
            table.add_row(peer["hostname"], peer["ip"], str(peer["port"]))
        console.print(table)


if __name__ == "__main__":
    cli()
