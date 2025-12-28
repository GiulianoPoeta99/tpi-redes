import struct

import pytest

from tpi_redes.core.protocol import ProtocolHandler


class TestProtocolHandler:
    def test_pack_header(self):
        """Test packing of protocol header.

        Header format (16 bytes, big-endian '!'):
        - c: op_code (1 byte)
        - H: name_len (2 bytes)
        - Q: file_size (8 bytes)
        - H: hash_len (2 bytes)
        - 3s: reserved (3 bytes)

        Returns:
            None: No return value.
        """
        op_code = b"F"
        filename = "test.txt"
        file_size = 1024
        file_hash = "abc123hash"

        name_len = len(filename.encode("utf-8"))
        hash_len = len(file_hash.encode("utf-8"))

        packed = ProtocolHandler.pack_header(op_code, filename, file_size, file_hash)


        expected_struct = struct.pack(
            "!cHQH3s", op_code, name_len, file_size, hash_len, b"\x00\x00\x00"
        )

        assert len(packed) == 16
        assert packed == expected_struct

    def test_unpack_header(self):
        """Test unpacking of protocol header.

        Verifies that binary data is correctly parsed into a Header namedtuple.

        Returns:
            None: No return value.
        """
        op_code = b"F"
        name_len = 8
        file_size = 2048
        hash_len = 64
        reserved = b"\x00\x00\x00"

        data = struct.pack("!cHQH3s", op_code, name_len, file_size, hash_len, reserved)

        header = ProtocolHandler.unpack_header(data)

        assert header.op_code == op_code
        assert header.name_len == name_len
        assert header.file_size == file_size
        assert header.hash_len == hash_len

    def test_unpack_invalid_size(self):
        with pytest.raises(ValueError):
            ProtocolHandler.unpack_header(b"too_short")
