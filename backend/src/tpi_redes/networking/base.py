from abc import ABC, abstractmethod


class BaseServer(ABC):
    def __init__(self, host: str, port: int, save_dir: str):
        self.host = host
        self.port = port
        self.save_dir = save_dir

    @abstractmethod
    def start(self):
        """Start the server loop."""
        pass

    @abstractmethod
    def stop(self):
        """Stop the server."""
        pass
