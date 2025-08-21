import struct
from dataclasses import dataclass
from typing import ClassVar


@dataclass
class Header:
    op_code: bytes
    name_len: int
    file_size: int
    hash_len: int

class ProtocolHandler:
    # Header Format:
    # ! = Network (Big-endian)
    # c = char (1 byte) - OpCode
    # H = unsigned short (2 bytes) - Name Length
    # Q = unsigned long long (8 bytes) - File Size
    # H = unsigned short (2 bytes) - Hash Length
    # 3s = 3 bytes padding - Reserved
    HEADER_FORMAT: ClassVar[str] = "!cHQH3s"
    HEADER_SIZE: ClassVar[int] = struct.calcsize(HEADER_FORMAT)

    @staticmethod
    def pack_header(
        op_code: bytes, filename: str, file_size: int, file_hash: str
    ) -> bytes:
        """Pack metadata into a 16-byte binary header."""
        name_bytes = filename.encode("utf-8")
        hash_bytes = file_hash.encode("utf-8")

        return struct.pack(
            ProtocolHandler.HEADER_FORMAT,
            op_code,
            len(name_bytes),
            file_size,
            len(hash_bytes),
            b"\x00\x00\x00"  # Padding
        )

    @staticmethod
    def unpack_header(data: bytes) -> Header:
        """Unpack a 16-byte binary header."""
        if len(data) != ProtocolHandler.HEADER_SIZE:
            raise ValueError(
                f"Invalid header size: expected {ProtocolHandler.HEADER_SIZE}, "
                f"got {len(data)}"
            )

        unpacked = struct.unpack(ProtocolHandler.HEADER_FORMAT, data)
        # unpacked = (op_code, name_len, file_size, hash_len, reserved)

        return Header(
            op_code=unpacked[0],
            name_len=unpacked[1],
            file_size=unpacked[2],
            hash_len=unpacked[3]
        )
