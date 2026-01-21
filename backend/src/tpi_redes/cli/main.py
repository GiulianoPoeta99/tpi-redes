import json
import logging
import platform
import sys
import time
from typing import Any

import click
from rich.console import Console
from rich.logging import RichHandler
from rich.traceback import install

from tpi_redes.config import (
    CHUNK_SIZE,
    DEFAULT_HOST,
    DEFAULT_PROXY_PORT,
    DEFAULT_SERVER_PORT,
)
from tpi_redes.platform_compat import is_npcap_installed

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
@click.option("--port", default=DEFAULT_SERVER_PORT)
@click.option("--interface", default=None)
@click.option("--socket-mode", is_flag=True, help="Use socket IPC instead of stdout")
@click.option("--socket-port", default=37021, help="Socket port for IPC")
def sniffer_service(port: int, interface: str | None, socket_mode: bool, socket_port: int):
    """(Internal) Privileged sniffer process.

    This command is intended to be called via `pkexec` (root) by the main process.
    It runs the `PacketSniffer` in stdout mode (Linux) or socket mode (Windows),
    emitting JSON packet captures.
    """
    import sys
    import os
    from pathlib import Path
    
    # For Windows elevated process, write to log file (stderr is lost)
    log_file = None
    log_path = None
    
    # Always try to create log file for debugging
    try:
        # Find backend directory (go up from src/tpi_redes/cli to backend root)
        backend_dir = Path(__file__).parent.parent.parent.parent
        log_path = backend_dir / "sniffer-elevated.log"
        
        # Use absolute path to ensure we can write even from different working directory
        log_path = log_path.resolve()
        
        log_file = open(log_path, "w", encoding="utf-8")
        log_file.write(f"=== Sniffer Service Started (PID={os.getpid()}) ===\n")
        log_file.flush()
        
        def log(msg):
            import time
            timestamp = time.strftime("%H:%M:%S")
            log_msg = f"[{timestamp}] {msg}\n"
            if log_file:
                log_file.write(log_msg)
                log_file.flush()
            # Also write to stderr if available
            try:
                sys.stderr.write(log_msg)
                sys.stderr.flush()
            except Exception:
                pass
    except Exception as e:
        # Fallback to stderr only
        def log(msg):
            try:
                sys.stderr.write(f"{msg}\n")
                sys.stderr.flush()
            except Exception:
                pass
        log(f"WARNING: Could not create log file: {e}")
    
    log(f"[SNIFFER-SERVICE] Started with PID={os.getpid()}")
    log(f"[SNIFFER-SERVICE] Working directory: {os.getcwd()}")
    log(f"[SNIFFER-SERVICE] port={port}, interface={interface}, socket_mode={socket_mode}, socket_port={socket_port}")
    log(f"[SNIFFER-SERVICE] PYTHONPATH={os.environ.get('PYTHONPATH', 'NOT SET')}")
    log(f"[SNIFFER-SERVICE] sys.path={sys.path[:3]}...")
    
    try:
        try:
            from tpi_redes.observability.sniffer import PacketSniffer
            log("[SNIFFER-SERVICE] PacketSniffer imported successfully")
        except Exception as e:
            log(f"[SNIFFER-SERVICE] FATAL: Failed to import PacketSniffer: {e}")
            import traceback
            log(f"[SNIFFER-SERVICE] Traceback:\n{traceback.format_exc()}")
            raise

        sniffer = PacketSniffer(interface=interface, port=port)
        log("[SNIFFER-SERVICE] PacketSniffer instance created")
        
        if socket_mode:
            log(f"[SNIFFER-SERVICE] Starting socket mode on port {socket_port}")
            try:
                sniffer.start_socket_mode(socket_port=socket_port, log_func=log)
            finally:
                if log_file:
                    log_file.write("=== Sniffer Service Ended ===\n")
                    log_file.close()
        else:
            log("[SNIFFER-SERVICE] Starting stdout mode")
            try:
                sniffer.start_stdout_mode()
            finally:
                if log_file:
                    log_file.write("=== Sniffer Service Ended ===\n")
                    log_file.close()
    except SystemExit:
        if log_file:
            log_file.write("=== Sniffer Service Exited ===\n")
            log_file.close()
        raise
    except Exception as e:
        log(f"[SNIFFER-SERVICE] UNEXPECTED ERROR: {e}")
        import traceback
        log(f"[SNIFFER-SERVICE] Traceback:\n{traceback.format_exc()}")
        if log_file:
            log_file.write("=== Sniffer Service Crashed ===\n")
            log_file.close()
        raise


@cli.command()
@click.option("--port", default=DEFAULT_SERVER_PORT, help="Port to listen on")
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
            # Check if packet capture library is available
            if not is_npcap_installed():
                error_msg = (
                    "Npcap is not installed. Please install it from https://npcap.com/"
                    if platform.system() == "Windows"
                    else "libpcap is not installed. Please install libpcap-dev package."
                )
                logger.error(error_msg)
                print(
                    json.dumps(
                        {
                            "type": "SNIFFER_ERROR",
                            "code": "MISSING_DEPENDENCY",
                            "message": error_msg,
                        }
                    ),
                    flush=True,
                )
                # Continue without sniffer
            else:
                import os

                current_dir = os.path.dirname(os.path.abspath(__file__))
                src_path = os.path.abspath(os.path.join(current_dir, "../.."))

                # Prepare command based on OS
                if platform.system() == "Windows":
                    # Windows: No need for env wrapper, use direct command
                    cmd = [
                        sys.executable,
                        "-m",
                        "tpi_redes.cli.main",
                        "sniffer-service",
                        "--port",
                        str(port),
                    ]
                else:
                    # Linux: Use pkexec with env vars
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

                logger.info("Requesting administrator privileges for Sniffer...")

                try:
                    # Platform-specific privilege elevation
                    from tpi_redes.platform_compat import is_admin
                    
                    if platform.system() == "Windows":
                        # Windows: Use socket IPC for communication
                        import socket as sock_module
                        from tpi_redes.config import SNIFFER_IPC_PORT
                        
                        if is_admin():
                            # Already running as admin - use stdout mode like Linux
                            logger.info("Already running as admin, using stdout mode")
                            env = os.environ.copy()
                            env["PYTHONPATH"] = src_path
                            
                            sniffer_process = subprocess.Popen(
                                cmd,
                                stdout=subprocess.PIPE,
                                text=True,
                                bufsize=1,
                                env=env,
                            )
                        else:
                            # Not admin - need UAC elevation with socket IPC
                            logger.info("Requesting UAC elevation for sniffer...")
                            
                            # Create socket server to receive sniffer data
                            server_socket = sock_module.socket(sock_module.AF_INET, sock_module.SOCK_STREAM)
                            server_socket.setsockopt(sock_module.SOL_SOCKET, sock_module.SO_REUSEADDR, 1)
                            server_socket.bind(('127.0.0.1', SNIFFER_IPC_PORT))
                            server_socket.listen(1)
                            logger.info(f"Socket server listening on 127.0.0.1:{SNIFFER_IPC_PORT}")
                            
                            # Add socket mode flags to command
                            cmd.extend(["--socket-mode", "--socket-port", str(SNIFFER_IPC_PORT)])
                            
                            # Elevate with UAC
                            from tpi_redes.platform_compat import elevate_process_windows
                            
                            # Set PYTHONPATH for elevated process via environment variable
                            # Note: ShellExecuteEx doesn't directly support env vars, 
                            # so we set it globally (will be inherited)
                            original_pythonpath = os.environ.get("PYTHONPATH")
                            os.environ["PYTHONPATH"] = src_path
                            
                            try:
                                logger.info(f"Elevating command: {' '.join(cmd)}")
                                logger.info(f"PYTHONPATH set to: {src_path}")
                                process_handle = elevate_process_windows(cmd, {"PYTHONPATH": src_path})
                                logger.info("UAC dialog shown, waiting for user response...")
                                
                                # Wait for sniffer to connect (with longer timeout)
                                server_socket.settimeout(60)  # Increased to 60 seconds
                                logger.info("Waiting for elevated sniffer to connect...")
                                
                                try:
                                    client_socket, addr = server_socket.accept()
                                    logger.info(f"✓ Sniffer connected successfully from {addr}")
                                    
                                    # Create mock process object for compatibility
                                    class SocketSnifferProcess:
                                        def __init__(self, socket, handle):
                                            self.socket = socket
                                            self.handle = handle
                                            self.pid = None
                                        
                                        def poll(self):
                                            return None
                                        
                                        def terminate(self):
                                            try:
                                                self.socket.close()
                                            except Exception:
                                                pass
                                    
                                    sniffer_process = SocketSnifferProcess(client_socket, process_handle)
                                    
                                    # Forward socket data to stdout in thread
                                    def forward_sniffer_socket():
                                        try:
                                            buffer = ""
                                            while True:
                                                data = client_socket.recv(4096).decode('utf-8')
                                                if not data:
                                                    logger.info("Sniffer disconnected")
                                                    break
                                                buffer += data
                                                while '\n' in buffer:
                                                    line, buffer = buffer.split('\n', 1)
                                                    if line.strip():
                                                        print(line, flush=True)
                                        except Exception as e:
                                            logger.error(f"Sniffer socket error: {e}")
                                    
                                    threading.Thread(target=forward_sniffer_socket, daemon=True).start()
                                    logger.info("Sniffer socket forwarding started")
                                    
                                except sock_module.timeout:
                                    logger.error("✗ Sniffer connection timed out after 60s (user may have denied UAC or process failed)")
                                    logger.error("Check if elevated process started correctly - try running as Administrator")
                                    print(json.dumps({
                                        "type": "SNIFFER_ERROR",
                                        "code": "PERMISSION_DENIED",
                                        "message": "Administrator privileges required. UAC was denied or timed out."
                                    }), flush=True)
                                    sniffer_process = None
                            except Exception as e:
                                logger.error(f"Failed to elevate sniffer: {e}", exc_info=True)
                                # User clicked "No" on UAC or error occurred
                                print(json.dumps({
                                    "type": "SNIFFER_ERROR",
                                    "code": "PERMISSION_DENIED",
                                    "message": f"Administrator privileges denied: {e}"
                                }), flush=True)
                                sniffer_process = None
                            finally:
                                # Restore original PYTHONPATH
                                if original_pythonpath is not None:
                                    os.environ["PYTHONPATH"] = original_pythonpath
                                elif "PYTHONPATH" in os.environ:
                                    del os.environ["PYTHONPATH"]
                    else:
                        # Linux: pkexec handles privilege elevation with modal dialog
                        # This blocks until user accepts/rejects
                        sniffer_process = subprocess.Popen(
                            cmd, stdout=subprocess.PIPE, text=True, bufsize=1
                        )

                # Only wait for sniffer if we successfully started it
                # Check if we have stdout (not socket mode)
                if sniffer_process is not None and hasattr(sniffer_process, 'stdout') and sniffer_process.stdout:
                    sniffer_ready_event = threading.Event()

                    def forward_sniffer_output():
                        try:
                            if not sniffer_process or not sniffer_process.stdout:
                                return
                            for line in sniffer_process.stdout:
                                if line.strip():
                                    sniffer_ready_event.set()
                                print(line, end="", flush=True)
                        except Exception as e:
                            logger.error(f"Sniffer output forwarding failed: {e}")

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
                            logger.warning(f"Sniffer process exited. Code: {exit_code}")
                            print(
                                json.dumps(
                                    {
                                        "type": "SNIFFER_ERROR",
                                        "code": "PERMISSION_DENIED",
                                        "message": f"Sniffer died (Code {exit_code}).",
                                    }
                                ),
                                flush=True,
                            )
                            break

                        time.sleep(0.1)
                elif sniffer_process is not None:
                    # Socket mode - sniffer already connected and forwarding
                    logger.info("Sniffer ready (socket mode)")
                else:
                    # Sniffer not started (no admin permissions on Windows)
                    logger.info("Continuing without packet capture.")

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
@click.option("--port", default=DEFAULT_SERVER_PORT, help="Port to connect to")
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
@click.option("--chunk-size", default=CHUNK_SIZE, help="Buffer size in bytes")
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
            logger.info("Requesting administrator privileges for Sniffer...")
            import os

            current_dir = os.path.dirname(os.path.abspath(__file__))
            src_path = os.path.abspath(os.path.join(current_dir, "../.."))

            # Prepare command based on OS
            if platform.system() == "Windows":
                cmd = [
                    sys.executable,
                    "-m",
                    "tpi_redes.cli.main",
                    "sniffer-service",
                    "--port",
                    str(port),
                ]
            else:
                # Preserve GUI environment for pkexec prompt on Linux
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
                # Platform-specific privilege elevation
                from tpi_redes.platform_compat import is_admin
                
                if platform.system() == "Windows":
                    # Windows: Use socket IPC for communication
                    import socket as sock_module
                    from tpi_redes.config import SNIFFER_IPC_PORT
                    
                    if is_admin():
                        # Already running as admin - use stdout mode
                        logger.info("Already running as admin, using stdout mode")
                        env = os.environ.copy()
                        env["PYTHONPATH"] = src_path
                        
                        sniffer_process = subprocess.Popen(
                            cmd,
                            stdout=subprocess.PIPE,
                            stderr=sys.stderr,
                            text=True,
                            bufsize=1,
                            env=env,
                        )
                    else:
                        # Not admin - need UAC elevation with socket IPC
                        logger.info("Requesting UAC elevation for sniffer...")
                        
                        # Create socket server to receive sniffer data
                        server_socket = sock_module.socket(sock_module.AF_INET, sock_module.SOCK_STREAM)
                        server_socket.setsockopt(sock_module.SOL_SOCKET, sock_module.SO_REUSEADDR, 1)
                        server_socket.bind(('127.0.0.1', SNIFFER_IPC_PORT))
                        server_socket.listen(1)
                        
                        # Add socket mode flags to command
                        cmd.extend(["--socket-mode", "--socket-port", str(SNIFFER_IPC_PORT)])
                        
                        # Elevate with UAC
                        from tpi_redes.platform_compat import elevate_process_windows
                        try:
                            process_handle = elevate_process_windows(cmd, {"PYTHONPATH": src_path})
                            logger.info("UAC dialog shown, waiting for user response...")
                            
                            # Wait for sniffer to connect (with timeout)
                            server_socket.settimeout(30)
                            try:
                                client_socket, addr = server_socket.accept()
                                logger.info(f"Sniffer connected from {addr}")
                                
                                # Create mock process object for compatibility
                                class SocketSnifferProcess:
                                    def __init__(self, socket, handle):
                                        self.socket = socket
                                        self.handle = handle
                                        self.pid = None
                                        self.stdout = None  # For compatibility
                                    
                                    def poll(self):
                                        return None
                                    
                                    def terminate(self):
                                        try:
                                            self.socket.close()
                                        except Exception:
                                            pass
                                
                                sniffer_process = SocketSnifferProcess(client_socket, process_handle)
                                
                                # Forward socket data to stdout in thread
                                def forward_sniffer_socket():
                                    try:
                                        buffer = ""
                                        while True:
                                            data = client_socket.recv(4096).decode('utf-8')
                                            if not data:
                                                break
                                            buffer += data
                                            while '\n' in buffer:
                                                line, buffer = buffer.split('\n', 1)
                                                if line.strip():
                                                    print(line, flush=True)
                                    except Exception as e:
                                        logger.error(f"Sniffer socket error: {e}")
                                
                                threading.Thread(target=forward_sniffer_socket, daemon=True).start()
                                
                            except sock_module.timeout:
                                logger.error("Sniffer connection timed out (user may have denied UAC)")
                                print(json.dumps({
                                    "type": "SNIFFER_ERROR",
                                    "code": "PERMISSION_DENIED",
                                    "message": "Administrator privileges required. UAC was denied or timed out."
                                }), flush=True)
                                sniffer_process = None
                        except Exception as e:
                            logger.error(f"Failed to elevate sniffer: {e}")
                            print(json.dumps({
                                "type": "SNIFFER_ERROR",
                                "code": "PERMISSION_DENIED",
                                "message": "Administrator privileges denied."
                            }), flush=True)
                            sniffer_process = None
                else:
                    # Linux: Use pkexec
                sniffer_process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=sys.stderr,
                        text=True,
                        bufsize=1,
                )

                # Only wait for sniffer ready if we have stdout (not socket mode)
                if sniffer_process and hasattr(sniffer_process, 'stdout') and sniffer_process.stdout:
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
                else:
                    # Socket mode - sniffer already connected
                    logger.info("Sniffer ready (socket mode)")

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
@click.option("--listen-port", default=DEFAULT_PROXY_PORT, help="Port to listen on (Proxy)")
@click.option("--target-ip", default=DEFAULT_HOST, help="Target Server IP")
@click.option("--target-port", default=DEFAULT_SERVER_PORT, help="Target Server Port")
@click.option(
    "--corruption-rate", default=0.0, help="Probability of bit flipping (0.0 - 1.0)"
)
@click.option(
    "--interface",
    default=None,
    help="Network interface to bind/sniff on (e.g. eth0)",
)
@click.option(
    "--protocol",
    default="tcp",
    type=click.Choice(["tcp", "udp"], case_sensitive=False),
    help="Protocol to proxy (TCP or UDP)",
)
def start_proxy(
    listen_port: int,
    target_ip: str,
    target_port: int,
    corruption_rate: float,
    interface: str | None,
    protocol: str,
):
    """Start a MITM Proxy Server.

    Requires client setup to connect to this proxy port instead of real server.
    If --interface is specified, attempts to escalate privileges to support sniffing.
    """
    import os
    import subprocess
    import sys
    import threading

    sniffer_process = None
    discovery = None

    if interface:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        src_path = os.path.abspath(os.path.join(current_dir, "../.."))

        # Prepare command based on OS
        if platform.system() == "Windows":
            cmd = [
                sys.executable,
                "-m",
                "tpi_redes.cli.main",
                "sniffer-service",
                "--port",
                str(listen_port),
                "--interface",
                interface,
            ]
        else:
            cmd = [
                "pkexec",
                "env",
                f"PYTHONPATH={src_path}",
                sys.executable,
                "-m",
                "tpi_redes.cli.main",
                "sniffer-service",
                "--port",
                str(listen_port),
                "--interface",
                interface,
            ]

        logger.info("Requesting administrator privileges for Sniffer...")

        try:
            # Platform-specific privilege elevation
            from tpi_redes.platform_compat import is_admin
            
            if platform.system() == "Windows":
                # Windows: Use socket IPC for communication
                import socket as sock_module
                from tpi_redes.config import SNIFFER_IPC_PORT
                
                if is_admin():
                    # Already running as admin - use stdout mode
                    logger.info("Already running as admin, using stdout mode")
                    env = os.environ.copy()
                    env["PYTHONPATH"] = src_path
                    
                    sniffer_process = subprocess.Popen(
                        cmd, stdout=subprocess.PIPE, text=True, bufsize=1, env=env
                    )
                    
                    def forward_sniffer_output():
                        try:
                            if not sniffer_process or not sniffer_process.stdout:
                                return
                            for line in sniffer_process.stdout:
                                print(line, end="", flush=True)
                        except Exception as e:
                            logger.error(f"Sniffer output forwarding failed: {e}")

                    threading.Thread(target=forward_sniffer_output, daemon=True).start()
                else:
                    # Not admin - need UAC elevation with socket IPC
                    logger.info("Requesting UAC elevation for sniffer...")
                    
                    # Create socket server to receive sniffer data
                    server_socket = sock_module.socket(sock_module.AF_INET, sock_module.SOCK_STREAM)
                    server_socket.setsockopt(sock_module.SOL_SOCKET, sock_module.SO_REUSEADDR, 1)
                    server_socket.bind(('127.0.0.1', SNIFFER_IPC_PORT))
                    server_socket.listen(1)
                    
                    # Add socket mode flags to command
                    cmd.extend(["--socket-mode", "--socket-port", str(SNIFFER_IPC_PORT)])
                    
                    # Elevate with UAC
                    from tpi_redes.platform_compat import elevate_process_windows
                    try:
                        process_handle = elevate_process_windows(cmd, {"PYTHONPATH": src_path})
                        logger.info("UAC dialog shown, waiting for user response...")
                        
                        # Wait for sniffer to connect (with timeout)
                        server_socket.settimeout(30)
                        try:
                            client_socket, addr = server_socket.accept()
                            logger.info(f"Sniffer connected from {addr}")
                            
                            # Create mock process object
                            class SocketSnifferProcess:
                                def __init__(self, socket, handle):
                                    self.socket = socket
                                    self.handle = handle
                                    self.pid = None
                                
                                def poll(self):
                                    return None
                                
                                def terminate(self):
                                    try:
                                        self.socket.close()
                                    except Exception:
                                        pass
                            
                            sniffer_process = SocketSnifferProcess(client_socket, process_handle)
                            
                            # Forward socket data to stdout
                            def forward_sniffer_socket():
                                try:
                                    buffer = ""
                                    while True:
                                        data = client_socket.recv(4096).decode('utf-8')
                                        if not data:
                                            break
                                        buffer += data
                                        while '\n' in buffer:
                                            line, buffer = buffer.split('\n', 1)
                                            if line.strip():
                                                print(line, flush=True)
                                except Exception as e:
                                    logger.error(f"Sniffer socket error: {e}")
                            
                            threading.Thread(target=forward_sniffer_socket, daemon=True).start()
                            
                        except sock_module.timeout:
                            logger.error("Sniffer connection timed out (user may have denied UAC)")
                            sniffer_process = None
                    except Exception as e:
                        logger.error(f"Failed to elevate sniffer: {e}")
                        sniffer_process = None
            else:
                # Linux: Use pkexec
                sniffer_process = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, text=True, bufsize=1
                )

            def forward_sniffer_output():
                try:
                    if not sniffer_process or not sniffer_process.stdout:
                        return
                    for line in sniffer_process.stdout:
                        print(line, end="", flush=True)
                except Exception as e:
                    logger.error(f"Sniffer output forwarding failed: {e}")

            threading.Thread(target=forward_sniffer_output, daemon=True).start()

        except Exception as e:
            logger.error(f"Failed to start sniffer: {e}")

    from tpi_redes.services.discovery import DiscoveryService
    from tpi_redes.services.proxy import ProxyServer

    console.print(
        f"[bold red]Starting MITM Proxy ({protocol.upper()}) "
        f"on port {listen_port}...[/bold red]"
    )
    console.print(f"Target: {target_ip}:{target_port}")
    if interface:
        console.print(f"Interface: {interface} (Sniffer Attached)")
    console.print(f"Corruption Rate: {corruption_rate}")

    proxy = ProxyServer(
        listen_port, target_ip, target_port, corruption_rate, interface, protocol
    )

    try:
        discovery = DiscoveryService()
        try:
            discovery.listen(listen_port)
        except OSError:
            logger.warning("Discovery service could not bind (port in use?). Skipping.")

        proxy.start()
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopping proxy...[/yellow]")
    except Exception as e:
        console.print(f"\n[bold red]Fatal error starting proxy: {e}[/bold red]")
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        if discovery:
            discovery.stop()
        if sniffer_process:
            from contextlib import suppress

            with suppress(Exception):
                sniffer_process.terminate()


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
