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


@cli.command(hidden=True)
@click.option("--port", default=8080)
@click.option("--interface", default=None)
def sniffer_service(port: int, interface: str | None):
    """(Internal) Privileged sniffer process."""
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
    """Start the file receiver server."""
    sniffer_process = None
    discovery = None

    # Thread to read sniffer output
    import subprocess
    import threading

    try:
        if sniff:
            # Spawn sniffer as root via pkexec
            # We call the same executable (python -m tpi_redes.cli.main sniffer-service)
            # We MUST preserve PYTHONPATH because pkexec clears it
            import os
            current_dir = os.path.dirname(os.path.abspath(__file__))
            src_path = os.path.abspath(os.path.join(current_dir, "../.."))

            # Preserve GUI environment for pkexec prompt
            env_vars = ["env", f"PYTHONPATH={src_path}"]
            if "DISPLAY" in os.environ:
                env_vars.append(f"DISPLAY={os.environ['DISPLAY']}")
            if "XAUTHORITY" in os.environ:
                env_vars.append(f"XAUTHORITY={os.environ['XAUTHORITY']}")

            cmd = [
                "pkexec",
                *env_vars,
                sys.executable,
                "-m",
                "tpi_redes.cli.main",
                "sniffer-service",
                "--port",
                str(port)
            ]
            if interface:
                cmd.extend(["--interface", interface])

            logger.info("Requesting root privileges for Sniffer...")

            try:
                sniffer_process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=sys.stderr, # Forward stderr
                    text=True,
                    bufsize=1 # Line buffered
                )

                sniffer_ready_event = threading.Event()

                def forward_sniffer_output():
                    if not sniffer_process or not sniffer_process.stdout:
                        return
                    for line in sniffer_process.stdout:
                        # DEBUG: Log raw sniffer output to stderr via logger
                        if line.strip():
                            # Avoid double printing JSON if we log it.
                            # We use stderr write to avoid interfering with stdout JSON
                            sys.stderr.write(f"[SNIFFER_SUB] {line}")
                            sys.stderr.flush()

                        if "SNIFFER_READY" in line:
                            sniffer_ready_event.set()

                        # Forward to stdout (for Electron)
                        print(line, end="", flush=True)

                t = threading.Thread(target=forward_sniffer_output, daemon=True)
                t.start()

                # Wait for user to enter password and sniffer to start
                # This ensures we don't start the server/transfer until
                # we have confirmed root access (or user cancellation).
                # Wait loop with early exit if process dies (cancellation)
                import time
                wait_start = time.time()
                while not sniffer_ready_event.is_set():
                    if time.time() - wait_start > 30:
                        # Timeout
                        logger.error("Sniffer startup timed out.")
                        print(json.dumps({
                            "type": "SNIFFER_ERROR",
                            "code": "TIMEOUT",
                            "message": "Sniffer startup timed out."
                        }), flush=True)
                        break

                    if sniffer_process.poll() is not None:
                         # Process exited (User cancelled or error)
                         logger.warning(
                             "Sniffer authentication cancelled or process died."
                         )
                         # Emit error so UI hides/disables sniffer view
                         print(json.dumps({
                            "type": "SNIFFER_ERROR",
                            "code": "PERMISSION_DENIED",
                            "message": "Sniffer authentication cancelled."
                         }), flush=True)
                         break

                    time.sleep(0.1)

            except Exception as e:
                 logger.error(f"Failed to spawn sniffer: {e}")
                 # Emit error so UI knows
                 print(json.dumps({
                    "type": "SNIFFER_ERROR",
                    "code": "SPAWN_FAILED",
                    "message": str(e)
                 }), flush=True)



        # Start Discovery Service Listener
        from tpi_redes.services.discovery import DiscoveryService

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
            from tpi_redes.transport.tcp_server import TCPServer

            server = TCPServer(host="0.0.0.0", port=port, save_dir=save_dir)
            server.start()
        else:
            from tpi_redes.transport.udp_server import UDPServer

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
    """Send one or more files to a remote server."""
    if not files:
        console.print("[bold red]Error:[/bold red] No files provided.")
        return

    import subprocess
    import threading
    from pathlib import Path

    file_paths = [Path(f) for f in files]

    sniffer_process = None

    try:
        # Start Sniffer if requested
        if sniff:
            logger.info("Requesting root privileges for Sniffer...")
            import os
            current_dir = os.path.dirname(os.path.abspath(__file__))
            src_path = os.path.abspath(os.path.join(current_dir, "../.."))

            # Preserve GUI environment for pkexec prompt
            env_vars = ["env", f"PYTHONPATH={src_path}"]
            if "DISPLAY" in os.environ:
                env_vars.append(f"DISPLAY={os.environ['DISPLAY']}")
            if "XAUTHORITY" in os.environ:
                env_vars.append(f"XAUTHORITY={os.environ['XAUTHORITY']}")

            cmd = [
                "pkexec",
                *env_vars,
                sys.executable,
                "-m",
                "tpi_redes.cli.main",
                "sniffer-service",
                "--port",
                str(port)
            ]
            if interface:
                cmd.extend(["--interface", interface])

            try:
                sniffer_process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=sys.stderr,
                    text=True,
                    bufsize=1
                )

                sniffer_ready_event = threading.Event()

                def forward_sniffer_output():
                    if not sniffer_process or not sniffer_process.stdout:
                        return
                    for line in sniffer_process.stdout:
                        # DEBUG: Log raw sniffer output
                        if line.strip():
                            sys.stderr.write(f"[SNIFFER_SUB] {line}")
                            sys.stderr.flush()

                        if "SNIFFER_READY" in line:
                            sniffer_ready_event.set()
                        print(line, end="", flush=True)

                t = threading.Thread(target=forward_sniffer_output, daemon=True)
                t.start()

                # Block until Sniffer is READY or Cancelled
                import time
                wait_start = time.time()
                while not sniffer_ready_event.is_set():
                    if time.time() - wait_start > 30:
                        logger.error("Sniffer startup timed out.")
                        break

                    if sniffer_process.poll() is not None:
                         # Process exited (User cancelled or error)
                         logger.warning(
                             "Sniffer authentication cancelled or process died."
                         )
                         print(json.dumps({
                            "type": "SNIFFER_ERROR",
                            "code": "PERMISSION_DENIED",
                            "message": "Sniffer authentication cancelled."
                         }), flush=True)
                         break

                    time.sleep(0.1)

            except Exception as e:
                 logger.error(f"Failed to spawn sniffer: {e}")
                 print(json.dumps({
                    "type": "SNIFFER_ERROR",
                    "code": "SPAWN_FAILED",
                    "message": str(e)
                 }), flush=True)

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
        # Let global handler catch it or re-raise
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
    """Start a MITM Proxy Server."""
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
    """Scan for active peers on the local network."""
    from tpi_redes.services.discovery import DiscoveryService
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


@cli.command()
def list_interfaces():
    """List available network interfaces."""
    try:
        from scapy.all import get_if_list
        interfaces = get_if_list()
        print(json.dumps(interfaces))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    cli()
