#!/usr/bin/env python3
"""
Script to create a portable Python environment for Windows distribution.

This script downloads Python embeddable for Windows and sets up all dependencies.
"""

import os
import platform
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

# Python version to embed
PYTHON_VERSION = "3.14.1"
PYTHON_EMBED_URL = f"https://www.python.org/ftp/python/{PYTHON_VERSION}/python-{PYTHON_VERSION}-embed-amd64.zip"


def download_file(url: str, dest: Path):
    """Download a file from URL to destination."""
    print(f"Downloading {url}...")
    urllib.request.urlretrieve(url, dest)
    print(f"Downloaded to {dest}")


def extract_zip(zip_path: Path, extract_to: Path):
    """Extract a zip file."""
    print(f"Extracting {zip_path} to {extract_to}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print("Extraction complete.")


def setup_embedded_python(backend_dir: Path):
    """Set up embedded Python for Windows distribution."""
    if platform.system() != "Windows":
        print("Warning: This script is designed to run on Windows.")
        print("For cross-platform builds, run this on Windows or use Docker.")
        return False

    # Create temp directory
    temp_dir = backend_dir / "temp_embed"
    temp_dir.mkdir(exist_ok=True)

    # Download Python embeddable
    python_zip = temp_dir / "python-embed.zip"
    if not python_zip.exists():
        try:
            download_file(PYTHON_EMBED_URL, python_zip)
        except Exception as e:
            print(f"Failed to download Python embeddable: {e}")
            print(f"Please download manually from {PYTHON_EMBED_URL}")
            return False

    # Extract Python
    embed_dir = temp_dir / "python"
    if embed_dir.exists():
        shutil.rmtree(embed_dir)
    embed_dir.mkdir()

    extract_zip(python_zip, embed_dir)

    # Modify python._pth to enable site packages
    pth_file = embed_dir / f"python{PYTHON_VERSION.replace('.', '')[:2]}._pth"
    if pth_file.exists():
        print("Modifying ._pth file to enable site-packages...")
        with open(pth_file) as f:
            lines = f.readlines()

        # Uncomment the import site line
        with open(pth_file, 'w') as f:
            for line in lines:
                if line.strip().startswith('#import site'):
                    f.write('import site\n')
                else:
                    f.write(line)

    # Download get-pip.py
    get_pip = temp_dir / "get-pip.py"
    if not get_pip.exists():
        print("Downloading get-pip.py...")
        urllib.request.urlretrieve(
            "https://bootstrap.pypa.io/get-pip.py",
            get_pip
        )

    # Install pip
    print("Installing pip...")
    python_exe = embed_dir / "python.exe"
    subprocess.run([str(python_exe), str(get_pip)], check=True)

    # Install uv
    print("Installing uv...")
    subprocess.run([str(python_exe), "-m", "pip", "install", "uv"], check=True)

    # Install project dependencies
    print("Installing project dependencies...")
    os.chdir(backend_dir)
    subprocess.run([str(python_exe), "-m", "uv", "sync"], check=True)

    # Copy to .venv for electron-builder to package
    venv_dir = backend_dir / ".venv"
    if venv_dir.exists():
        print("Backing up existing .venv...")
        backup_dir = backend_dir / ".venv.backup"
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        shutil.move(venv_dir, backup_dir)

    print("Copying embedded Python to .venv...")
    shutil.copytree(embed_dir, venv_dir)

    # Create Scripts directory structure (for compatibility)
    scripts_dir = venv_dir / "Scripts"
    scripts_dir.mkdir(exist_ok=True)

    # Copy python.exe to Scripts
    shutil.copy(venv_dir / "python.exe", scripts_dir / "python.exe")

    print("\n" + "="*60)
    print("Embedded Python setup complete!")
    print(f"Location: {venv_dir}")
    print("="*60)

    return True


def main():
    """Main entry point."""
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent

    print("TPI Redes - Python Embedding Script")
    print("=" * 60)
    print(f"Backend directory: {backend_dir}")
    print(f"Python version: {PYTHON_VERSION}")
    print("=" * 60)

    if not setup_embedded_python(backend_dir):
        print("\nSetup failed!")
        sys.exit(1)

    print("\nNext steps:")
    print("1. Navigate to frontend directory")
    print("2. Run: npm run build:win")
    print("3. Find the .exe in frontend/dist-release/")


if __name__ == "__main__":
    main()
