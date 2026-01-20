"""Platform compatibility layer for Windows/Linux differences.

This module abstracts OS-specific functionality to enable cross-platform operation.
"""

import ctypes
import logging
import platform
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger("tpi-redes")


def is_admin() -> bool:
    """Check if the current process has administrator/root privileges.

    Returns:
        bool: True if running with elevated privileges, False otherwise.
    """
    system = platform.system()

    if system == "Windows":
        try:
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception as e:
            logger.warning(f"Could not determine admin status on Windows: {e}")
            return False
    else:  # Linux, macOS, etc.
        try:
            import os

            return os.geteuid() == 0
        except AttributeError:
            logger.warning("geteuid not available on this platform")
            return False


def elevate_privileges(cmd: list[str]) -> subprocess.Popen | None:
    """Execute a command with elevated privileges.

    Args:
        cmd: Command and arguments as a list (e.g., ['python', 'script.py', '--arg'])

    Returns:
        subprocess.Popen | None: The spawned process or None if elevation failed.
    """
    system = platform.system()

    if system == "Windows":
        # On Windows, we need to use ShellExecuteEx with "runas" verb
        # However, subprocess doesn't support this directly, so we use ctypes
        try:
            # Convert command list to string for Windows
            # Note: This is a simplified approach. For production, consider using pywin32
            cmd_str = " ".join(f'"{arg}"' if " " in arg else arg for arg in cmd)

            # Use ShellExecuteW to request elevation
            # SHELLEXECUTEINFOW structure approach
            SEE_MASK_NOCLOSEPROCESS = 0x00000040
            SEE_MASK_NO_CONSOLE = 0x00008000

            class SHELLEXECUTEINFO(ctypes.Structure):
                _fields_ = [
                    ("cbSize", ctypes.c_ulong),
                    ("fMask", ctypes.c_ulong),
                    ("hwnd", ctypes.c_void_p),
                    ("lpVerb", ctypes.c_wchar_p),
                    ("lpFile", ctypes.c_wchar_p),
                    ("lpParameters", ctypes.c_wchar_p),
                    ("lpDirectory", ctypes.c_wchar_p),
                    ("nShow", ctypes.c_int),
                    ("hInstApp", ctypes.c_void_p),
                    ("lpIDList", ctypes.c_void_p),
                    ("lpClass", ctypes.c_wchar_p),
                    ("hKeyClass", ctypes.c_void_p),
                    ("dwHotKey", ctypes.c_ulong),
                    ("hIconOrMonitor", ctypes.c_void_p),
                    ("hProcess", ctypes.c_void_p),
                ]

            sei = SHELLEXECUTEINFO()
            sei.cbSize = ctypes.sizeof(sei)
            sei.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NO_CONSOLE
            sei.lpVerb = "runas"
            sei.lpFile = cmd[0]
            sei.lpParameters = " ".join(cmd[1:]) if len(cmd) > 1 else None
            sei.nShow = 0  # SW_HIDE

            if not ctypes.windll.shell32.ShellExecuteExW(ctypes.byref(sei)):
                logger.error("ShellExecuteExW failed")
                return None

            # Return a mock Popen-like object
            # For proper implementation, consider using pywin32's win32process
            class MockPopen:
                def __init__(self, handle):
                    self.handle = handle
                    self.pid = None

                def poll(self):
                    return None

                def terminate(self):
                    if self.handle:
                        try:
                            ctypes.windll.kernel32.TerminateProcess(self.handle, 1)
                        except Exception:
                            pass

            return MockPopen(sei.hProcess)

        except Exception as e:
            logger.error(f"Failed to elevate privileges on Windows: {e}")
            return None

    else:  # Linux
        # Use pkexec on Linux
        elevated_cmd = ["pkexec"] + cmd
        try:
            process = subprocess.Popen(
                elevated_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
            return process
        except Exception as e:
            logger.error(f"Failed to elevate privileges on Linux: {e}")
            return None


def elevate_process_windows(cmd: list[str], env: dict[str, str] | None = None) -> int:
    """Launch process with UAC elevation on Windows.
    
    Shows UAC dialog and launches elevated process.
    
    Args:
        cmd: Command and arguments as list (e.g., ['python.exe', '-m', 'module', 'arg'])
        env: Environment variables (currently not directly supported, must be set by child)
    
    Returns:
        int: Process handle of the elevated process
        
    Raises:
        Exception: If UAC is denied or elevation fails
    """
    if platform.system() != "Windows":
        raise RuntimeError("elevate_process_windows only works on Windows")
    
    try:
        # For Windows UAC elevation, we need to use ShellExecuteEx with 'runas' verb
        # pywin32 is cleaner than ctypes for this
        import win32con
        from win32com.shell import shell, shellcon
        
        # Prepare command: first element is executable, rest are params
        executable = cmd[0]
        params = ' '.join(f'"{arg}"' for arg in cmd[1:])
        
        # Set environment variables in the command if provided
        # Note: ShellExecuteEx doesn't directly support env vars,
        # so we need to set PYTHONPATH via the command itself
        if env and "PYTHONPATH" in env:
            # Prepend env variable setting to params
            pythonpath = env["PYTHONPATH"]
            # We'll pass it as an argument that the child process will set
            # Actually, for Python modules, PYTHONPATH must be in environment
            # We'll rely on the child to inherit or set it
            pass
        
        logger.info(f"Requesting UAC elevation for: {executable} {params}")
        
        # ShellExecuteEx with runas verb shows UAC dialog
        process_info = shell.ShellExecuteEx(
            nShow=win32con.SW_HIDE,  # Hidden window
            fMask=shellcon.SEE_MASK_NOCLOSEPROCESS,  # Return process handle
            lpVerb='runas',  # Triggers UAC elevation
            lpFile=executable,
            lpParameters=params,
        )
        
        return process_info['hProcess']  # Return process handle
        
    except Exception as e:
        logger.error(f"Failed to elevate process: {e}")
        raise


def kill_process_tree(pid: int) -> None:
    """Kill a process and all its children.

    Args:
        pid: Process ID to kill
    """
    if not pid:
        return

    system = platform.system()

    if system == "Windows":
        # Use taskkill on Windows
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                capture_output=True,
                timeout=5,
            )
        except Exception as e:
            logger.warning(f"Failed to kill process tree on Windows: {e}")
    else:  # Linux
        # Use pkill to kill children, then kill parent
        try:
            subprocess.run(["pkill", "-P", str(pid)], capture_output=True, timeout=5)
            import os
            import signal

            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass  # Already dead
        except Exception as e:
            logger.warning(f"Failed to kill process tree on Linux: {e}")


def get_python_path(venv_dir: Path | str) -> Path:
    """Get the correct path to the Python interpreter in a virtual environment.

    Args:
        venv_dir: Path to the virtual environment directory

    Returns:
        Path: Full path to the Python interpreter
    """
    venv_path = Path(venv_dir)
    system = platform.system()

    if system == "Windows":
        return venv_path / "Scripts" / "python.exe"
    else:  # Linux, macOS
        return venv_path / "bin" / "python"


def is_npcap_installed() -> bool:
    """Check if Npcap is installed on Windows.

    On Linux, checks for libpcap instead.

    Returns:
        bool: True if packet capture library is available
    """
    system = platform.system()

    if system == "Windows":
        import os
        import winreg

        # Check multiple registry locations (64-bit and 32-bit)
        registry_keys = [
            r"SOFTWARE\Npcap",
            r"SOFTWARE\WOW6432Node\Npcap",
            r"SOFTWARE\WinPcap",
            r"SOFTWARE\WOW6432Node\WinPcap",
        ]

        for key_path in registry_keys:
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                    logger.debug(f"Found pcap installation via registry: {key_path}")
                    return True
            except FileNotFoundError:
                continue

        # Check for physical files as fallback
        file_locations = [
            r"C:\Windows\System32\Npcap\wpcap.dll",
            r"C:\Windows\SysWOW64\Npcap\wpcap.dll",
            r"C:\Program Files\Npcap\wpcap.dll",
            r"C:\Program Files (x86)\Npcap\wpcap.dll",
        ]

        for file_path in file_locations:
            if os.path.exists(file_path):
                logger.debug(f"Found Npcap installation via file: {file_path}")
                return True

        logger.debug("Npcap not detected on Windows")
        return False
    else:  # Linux
        # Check if libpcap is available by trying to import scapy
        try:
            from scapy.arch import get_if_list

            get_if_list()  # Will fail if libpcap is not installed
            return True
        except Exception:
            return False


def setup_process_death_signal():
    """Configure the process to die if parent dies (Linux only).

    On Windows, this is a no-op as the mechanism doesn't exist.
    """
    system = platform.system()

    if system == "Linux":
        try:
            import ctypes
            import signal

            libc = ctypes.CDLL("libc.so.6")
            PR_SET_PDEATHSIG = 1
            libc.prctl(PR_SET_PDEATHSIG, signal.SIGKILL, 0, 0, 0)
            logger.debug("Configured PR_SET_PDEATHSIG for process")
        except Exception as e:
            logger.debug(f"Could not set PR_SET_PDEATHSIG: {e}")
    else:
        # Windows doesn't have this mechanism
        # Process lifetime is managed differently via job objects
        pass
