from abc import ABC, abstractmethod


class BaseServer(ABC):
    """Abstract base class for all file transfer servers.

    Attributes:
        host (str): IP address to bind the server to (e.g., "0.0.0.0").
        port (int): Port number to listen on.
        save_dir (str): Directory path where received files will be stored.
    """

    def __init__(self, host: str, port: int, save_dir: str):
        """Initialize the server configuration.

        Args:
            host: IP address to bind to.
            port: Port number to use.
            save_dir: Path to storage directory.

        Returns:
            None
        """
        self.host = host
        self.port = port
        self.save_dir = save_dir

    @abstractmethod
    def start(self):
        """Start the server loop.

        This method should be non-blocking or managed via threading
        if intended to run alongside other tasks.

        Returns:
            None: No return value.
        """
        pass

    @abstractmethod
    def stop(self):
        """Stop the server gracefully.

        Should ensure that all sockets are closed and resources released.

        Returns:
            None: No return value.
        """
        pass
