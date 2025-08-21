import struct

import pytest

from tpi_redes.networking.protocol import ProtocolHandler


class TestProtocolHandler:
    def test_pack_header(self):
        # Data to pack
        op_code = b'F'
        filename = "test.txt"
        file_size = 1024
        file_hash = "abc123hash"

        # Expected lengths
        name_len = len(filename.encode('utf-8'))
        hash_len = len(file_hash.encode('utf-8'))

        packed = ProtocolHandler.pack_header(op_code, filename, file_size, file_hash)

        # Header format: c H Q H 3s (16 bytes)
        # c: char (1)
        # H: unsigned short (2)
        # Q: unsigned long long (8)
        # H: unsigned short (2)
        # 3s: reserved (3)
        expected_struct = struct.pack(
            "!cHQH3s",
            op_code,
            name_len,
            file_size,
            hash_len,
            b'\x00\x00\x00'
        )

        assert len(packed) == 16
        assert packed == expected_struct

    def test_unpack_header(self):
        # Create a valid header
        op_code = b'F'
        name_len = 8
        file_size = 2048
        hash_len = 64
        reserved = b'\x00\x00\x00'

        data = struct.pack("!cHQH3s", op_code, name_len, file_size, hash_len, reserved)

        header = ProtocolHandler.unpack_header(data)

        assert header.op_code == op_code
        assert header.name_len == name_len
        assert header.file_size == file_size
        assert header.hash_len == hash_len

    def test_unpack_invalid_size(self):
        with pytest.raises(ValueError):
            ProtocolHandler.unpack_header(b'too_short')
