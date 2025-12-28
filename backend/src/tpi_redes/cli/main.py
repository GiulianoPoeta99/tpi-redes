import json
import logging
import sys
import time
from typing import Any

import click
from rich.console import Console
from rich.logging import RichHandler
from rich.traceback import install

console = Console(stderr=True)
logger = logging.getLogger("tpi-redes")


debug_mode = False


def handle_exception(exc_type: Any, exc_value: Any, exc_traceback: Any):
    """Global exception handler to ensure errors are emitted as JSON for Electron."""
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return

    if debug_mode:
        console.print_exception(show_locals=True)
        sys.exit(1)

    sys.exit(1)

    console.print(f"[bold red]Error:[/bold red] {exc_value}")

    sys.exit(1)


install(show_locals=True)

install(show_locals=True)

sys.excepthook = handle_exception


@click.group()
@click.option("--debug", is_flag=True, help="Enable debug mode (tracebacks).")
def cli(debug: bool):
    """File Transfer App CLI.

    Primary entry point for the backend services. Supports running
    Servers, Clients, Proxy, and Discovery services.
    Designed to interact with an Electron frontend via stdout JSON events.
    """
    global debug_mode
    if debug:
        debug_mode = True
        install(show_locals=True)
        logging.basicConfig(level=logging.DEBUG)
        logger.setLevel(logging.DEBUG)
    else:
        logging.basicConfig(
            level=logging.INFO,
            format="%(message)s",
            datefmt="[%X]",
            handlers=[RichHandler(console=console)],
        )
        logger.setLevel(logging.INFO)


@cli.command(hidden=True)
@click.option("--port", default=8080)
@click.option("--interface", default=None)
def sniffer_service(port: int, interface: str | None):
    """(Internal) Privileged sniffer process.

    This command is intended to be called via `pkexec` (root) by the main process.
    It runs the `PacketSniffer` in stdout mode, emitting JSON packet captures.
    """
    from tpi_redes.observability.sniffer import PacketSniffer

    sniffer = PacketSniffer(interface=interface, port=port)
    sniffer.start_stdout_mode()


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
@click.option(
    "--sniff",
    is_flag=True,
    help="Enable packet sniffer (requires root permissions)",
)
@click.option("--interface", default=None, help="Network interface to sniff")
def start_server(
    port: int, protocol: str, save_dir: str, sniff: bool, interface: str | None
):
    """Start the file receiver server.

    Optionally spawns a privileged subprocess for packet sniffing if --sniff is used.
    Also starts the DiscoveryService listener to announce presence on the network.
    """
    sniffer_process = None
    discovery = None

    import subprocess
    import threading

    try:
        if sniff:
            import os

            current_dir = os.path.dirname(os.path.abspath(__file__))
            src_path = os.path.abspath(os.path.join(current_dir, "../.."))

            env_vars = ["env", f"PYTHONPATH={src_path}"]

            cmd = [
                "pkexec",
                *env_vars,
                sys.executable,
                "-m",
                "tpi_redes.cli.main",
                "sniffer-service",
                "--port",
                str(port),
            ]
            if interface:
                cmd.extend(["--interface", interface])

            logger.info("Requesting root privileges for Sniffer...")

            try:
                sniffer_process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    text=True,
                    bufsize=1
                )

                sniffer_ready_event = threading.Event()

                def forward_sniffer_output():
                    if not sniffer_process or not sniffer_process.stdout:
                        return
                    for line in sniffer_process.stdout:
                        if line.strip():
                            sniffer_ready_event.set()
                        print(line, end="", flush=True)

                t = threading.Thread(target=forward_sniffer_output, daemon=True)
                t.start()
                wait_start = time.time()
                while not sniffer_ready_event.is_set():
                    if time.time() - wait_start > 30:
                        logger.error("Sniffer startup timed out.")
                        print(
                            json.dumps(
                                {
                                    "type": "SNIFFER_ERROR",
                                    "code": "TIMEOUT",
                                    "message": "Sniffer startup timed out.",
                                }
                            ),
                            flush=True,
                        )
                        break

                    if sniffer_process.poll() is not None:
                        exit_code = sniffer_process.poll()
                        logger.warning(
                            f"Sniffer process exited. Code: {exit_code}"
                        )
                        print(
                            json.dumps(
                                {
                                    "type": "SNIFFER_ERROR",
                                    "code": "PERMISSION_DENIED",
                                    "message": f"Sniffer process died (Code {exit_code}).",
                                }
                            ),
                            flush=True,
                        )
                        break

                    time.sleep(0.1)

            except Exception as e:
                logger.error(f"Failed to spawn sniffer: {e}")
                print(
                    json.dumps(
                        {
                            "type": "SNIFFER_ERROR",
                            "code": "SPAWN_FAILED",
                            "message": str(e),
                        }
                    ),
                    flush=True,
                )
        from tpi_redes.services.discovery import DiscoveryService

        discovery = DiscoveryService()
        try:
            discovery.listen(port)
        except OSError:
            logger.warning("Discovery service could not bind (port in use?). Skipping.")

        logger.info(f"Starting {protocol.upper()} server on port {port}...")
        logger.info(f"Saving files to: {save_dir}")
        print(
            json.dumps({"type": "SERVER_READY", "protocol": protocol, "port": port}),
            flush=True,
        )

        if protocol == "tcp":
            from tpi_redes.transport.tcp_server import TCPServer

            server = TCPServer(host="0.0.0.0", port=port, save_dir=save_dir)
            server.start()
        else:
            from tpi_redes.transport.udp_server import UDPServer

            server = UDPServer(host="0.0.0.0", port=port, save_dir=save_dir)
            server.start()

    except OSError as e:
        if e.errno == 98:
            raise ConnectionError(f"Port {port} is already in use.") from e
        elif e.errno == 13:
            raise PermissionError(
                f"Permission denied to bind to port {port}. Try using sudo."
            ) from e
        raise
    finally:
        if sniffer_process:
            sniffer_process.terminate()
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
@click.option(
    "--sniff",
    is_flag=True,
    help="Enable packet sniffer (requires root permissions)",
)
@click.option("--interface", default=None, help="Network interface to sniff")
@click.option("--delay", default=0.0, help="Delay between chunks in seconds")
@click.option("--chunk-size", default=4096, help="Buffer size in bytes")
def send_file(
    files: tuple[str],
    ip: str,
    port: int,
    protocol: str,
    sniff: bool,
    interface: str | None,
    delay: float,
    chunk_size: int,
):
    """Send one or more files to a remote server.

    Initiates a TCP or UDP client to transfer files.
    Can also spawn a local sniffer to capture outgoing traffic.
    """
    if not files:
        console.print("[bold red]Error:[/bold red] No files provided.")
        return

    import subprocess
    import threading
    from pathlib import Path

    file_paths = [Path(f) for f in files]

    sniffer_process = None

    try:
        if sniff:
            logger.info("Requesting root privileges for Sniffer...")
            import os

            current_dir = os.path.dirname(os.path.abspath(__file__))
            src_path = os.path.abspath(os.path.join(current_dir, "../.."))

            # Preserve GUI environment for pkexec prompt
            cmd = [
                "pkexec",
                "env",
                f"PYTHONPATH={src_path}",
                sys.executable,
                "-m",
                "tpi_redes.cli.main",
                "sniffer-service",
                "--port",
                str(port),
            ]
            if interface:
                cmd.extend(["--interface", interface])

            try:
                sniffer_process = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=sys.stderr, text=True, bufsize=1
                )

                sniffer_ready_event = threading.Event()

                def forward_sniffer_output():
                    if not sniffer_process or not sniffer_process.stdout:
                        return
                    for line in sniffer_process.stdout:
                        if line.strip():
                            sys.stderr.write(f"[SNIFFER_SUB] {line}")
                            sys.stderr.flush()

                        if "SNIFFER_READY" in line:
                            sniffer_ready_event.set()
                        print(line, end="", flush=True)

                t = threading.Thread(target=forward_sniffer_output, daemon=True)
                t.start()
                import time

                wait_start = time.time()
                while not sniffer_ready_event.is_set():
                    if time.time() - wait_start > 30:
                        logger.error("Sniffer startup timed out.")
                        break

                    if sniffer_process.poll() is not None:
                        logger.warning(
                            "Sniffer authentication cancelled or process died."
                        )
                        print(
                            json.dumps(
                                {
                                    "type": "SNIFFER_ERROR",
                                    "code": "PERMISSION_DENIED",
                                    "message": "Sniffer authentication cancelled.",
                                }
                            ),
                            flush=True,
                        )
                        break

                    time.sleep(0.1)

            except Exception as e:
                logger.error(f"Failed to spawn sniffer: {e}")
                print(
                    json.dumps(
                        {
                            "type": "SNIFFER_ERROR",
                            "code": "SPAWN_FAILED",
                            "message": str(e),
                        }
                    ),
                    flush=True,
                )

        if protocol == "tcp":
            from tpi_redes.transport.tcp_client import TCPClient

            client = TCPClient()
            client.send_files(file_paths, ip, port, delay, chunk_size)
        else:
            from tpi_redes.transport.udp_client import UDPClient

            client = UDPClient()
            client.send_files(file_paths, ip, port, delay, chunk_size)

    except KeyboardInterrupt:
        console.print("\n[yellow]Transfer cancelled by user.[/yellow]")
    except Exception as e:
        raise e
    finally:
        if sniffer_process:
            sniffer_process.terminate()


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
    """Start a MITM Proxy Server.

    Requires client setup to connect to this proxy port instead of real server.
    """
    from tpi_redes.services.proxy import ProxyServer

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
    """Scan for active peers on the local network.

    Uses `DiscoveryService` to broadcast PINGs and lists responding peers.
    Output is printed as both JSON (for IPC) and a Rich Table (for human usage).
    """
    from tpi_redes.services.discovery import DiscoveryService

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


@cli.command()
def list_interfaces():
    """List available network interfaces using Scapy."""
    try:
        from scapy.all import get_if_list

        interfaces = get_if_list()
        print(json.dumps(interfaces))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    cli()
