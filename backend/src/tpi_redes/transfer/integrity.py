import hashlib
from pathlib import Path


class IntegrityVerifier:
    def __init__(self, file_path: Path):
        self._file_path = file_path

    def calculate_hash(self) -> str:
        """Calculate SHA-256 hash of the file."""
        sha256_hash = hashlib.sha256()
        with open(self._file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def save_hash_file(self) -> Path:
        """Save the calculated hash to a .sha256 file."""
        hash_value = self.calculate_hash()
        hash_file_path = self._file_path.with_name(self._file_path.name + ".sha256")
        hash_file_path.write_text(hash_value)
        return hash_file_path
