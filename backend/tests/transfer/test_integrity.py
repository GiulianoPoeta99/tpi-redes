import tempfile
from pathlib import Path

from tpi_redes.transfer.integrity import IntegrityVerifier


class TestIntegrityVerifier:
    def test_calculate_hash_sha256(self):
        # Create a temporary file with known content
        content = b"Hello, World!"
        # SHA256 of "Hello, World!" is:
        # dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f
        expected_hash = (
            "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"
        )

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        try:
            hasher = IntegrityVerifier(tmp_path)
            result = hasher.calculate_hash()
            assert result == expected_hash
        finally:
            tmp_path.unlink()

    def test_save_hash_file(self):
        content = b"Test Content"
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        try:
            hasher = IntegrityVerifier(tmp_path)
            hash_val = hasher.calculate_hash()
            hasher.save_hash_file()

            # The requirement says "create a .sha256 file".
            # If file is "data.txt", hash file should be "data.txt.sha256"
            # or "data.sha256"? Usually .sha256 is appended.
            hash_file = tmp_path.with_name(tmp_path.name + ".sha256")

            assert hash_file.exists()
            assert hash_file.read_text().strip() == hash_val

            # Cleanup hash file
            hash_file.unlink()
        finally:
            tmp_path.unlink()
