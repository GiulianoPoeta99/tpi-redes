import struct
from dataclasses import dataclass
from typing import ClassVar


@dataclass
class Header:
    """Represents the fixed-size protocol header.

    Attributes:
        op_code (bytes): Operation code (e.g., b'F' for File).
        name_len (int): Length of the filename in bytes.
        file_size (int): Total size of the file in bytes.
        hash_len (int): Length of the hash string in bytes.
    """

    op_code: bytes
    name_len: int
    file_size: int
    hash_len: int


class ProtocolHandler:
    """Handles packing and unpacking of the custom binary protocol.

    Protocol Format (16 bytes, Big-endian):
        !       : Network byte order
        c       : OpCode (1 byte)
        H       : Name Length (unsigned short, 2 bytes)
        Q       : File Size (unsigned long long, 8 bytes)
        H       : Hash Length (unsigned short, 2 bytes)
        3s      : Reserved Padding (3 bytes)
    """

    HEADER_FORMAT: ClassVar[str] = "!cHQH3s"
    HEADER_SIZE: ClassVar[int] = struct.calcsize(HEADER_FORMAT)

    @staticmethod
    def pack_header(
        op_code: bytes, filename: str, file_size: int, file_hash: str
    ) -> bytes:
        """Pack metadata into a binary header.

        Args:
            op_code: Operation identifier (e.g., b'F').
            filename: Name of the file being sent.
            file_size: Size of the file in bytes.
            file_hash: Integrity hash of the file.

        Returns:
            bytes: The packed 16-byte header.
        """
        name_bytes = filename.encode("utf-8")
        hash_bytes = file_hash.encode("utf-8")

        return struct.pack(
            ProtocolHandler.HEADER_FORMAT,
            op_code,
            len(name_bytes),
            file_size,
            len(hash_bytes),
            b"\x00\x00\x00",
        )

    @staticmethod
    def unpack_header(data: bytes) -> Header:
        """Unpack a binary header into a structured object.

        Args:
            data: Raw bytes received from the network.

        Returns:
            Header: The parsed header object.

        Raises:
            ValueError: If the data length matches the expected header size.
            struct.error: If unpacking fails due to format mismatch.
        """
        if len(data) != ProtocolHandler.HEADER_SIZE:
            raise ValueError(
                f"Invalid header size: expected {ProtocolHandler.HEADER_SIZE}, "
                f"got {len(data)}"
            )

        unpacked = struct.unpack(ProtocolHandler.HEADER_FORMAT, data)

        return Header(
            op_code=unpacked[0],
            name_len=unpacked[1],
            file_size=unpacked[2],
            hash_len=unpacked[3],
        )
