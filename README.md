# TPI Redes - File Transfer App

A robust, educational File Transfer Application built to demonstrate Networking concepts (TCP/UDP, Layer 4 Reliability, Security).

## 🚀 Features

### Core
- **Dual Protocol Support:** Send and receive files via **TCP** (Reliable) or **UDP** (Best Effort).
- **Integrity Verification:** SHA-256 hash verification to detect data corruption.
- **Real-time Logs:** Visual feedback of the transfer process.

### Advanced
- **Packet Sniffer:** Built-in network analyzer with "Wireshark-style" packet inspection.
- **Sliding Window Visualizer:** Real-time graph of TCP Flow Control (Window Size, ACKs).
- **Layer 4 Statistics:** Live metrics for RTT (Round Trip Time) and Throughput.
- **MITM Attack Simulation:** Proxy server to intercept traffic and simulate data corruption (Bit Flipping) to test integrity checks.
### Premium Experience
- **Batch Transfer:** Drag & Drop multiple files and send them sequentially.
- **Configurable Chunk Size:** Optimize performance by selecting buffer size (1KB - 64KB).
- **Latency Simulation:** Add artificial delay to test network conditions.
- **Advanced Dashboard:** Visualize historical throughput with interactive charts and KPIs.
- **Persistent History:** Keep track of all your transfers across sessions.

## 🛠️ Tech Stack
- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Electron.
- **Backend:** Python, Scapy (Networking), Click (CLI).
- **Tooling:** Just (Task Runner), Biome (Lint/Format), Vitest (Testing), UV (Python Pkg Manager).

## 📦 Prerequisites

### Linux
- **Python 3.14** (and `uv` installed via `pip install uv`)
- **Node.js 18+**
- **Just** (`curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash`)
- **Libpcap** (for Scapy/Sniffer): `sudo apt install libpcap-dev`

### Windows
- **Python 3.14+** (from [python.org](https://www.python.org/downloads/))
- **Node.js 18+** (LTS from [nodejs.org](https://nodejs.org/))
- **Just** (`scoop install just` or download from [GitHub](https://github.com/casey/just/releases))
- **uv** (`pip install uv`)
- **Npcap** (for packet capture, from [npcap.com](https://npcap.com/))

> ⚠️ **Windows Note:** Some features require administrator privileges. See [Windows Build Guide](docs/WINDOWS_BUILD.md) for detailed setup.

## ⚡ Quick Start

### Linux / macOS

1. **Install Dependencies:**
   ```bash
   just install
   ```
   This will install all Backend (Python 3.14 via uv) and Frontend dependencies.

2. **Run the Application:**
   ```bash
   just run
   ```
   This starts the Frontend (Electron) app.

3. **Run Backend CLI (Optional):**
   ```bash
   just run-backend --help
   ```

### Windows

1. **Install Dependencies:**
   ```powershell
   # Backend
   cd backend
   uv sync
   # Or use: .\scripts\install.bat

   # Frontend
   cd ..\frontend
   npm install
   ```

2. **Run the Application:**
   
   **⚠️ Para captura de paquetes:** Ejecuta PowerShell como Administrador
   
   ```powershell
   # Abre PowerShell como Administrador (clic derecho → "Ejecutar como administrador")
   cd frontend
   npm run dev:electron
   ```
   
   **Sin captura de paquetes:** Ejecuta normalmente
   
   ```powershell
   cd frontend
   npm run dev:electron
   # El sniffer estará deshabilitado, pero otras funciones funcionarán
   ```
   
   Ver [Guía de Desarrollo Windows](docs/WINDOWS_DEV_GUIDE.md) para más detalles.

3. **Build Portable Executable:**
   See detailed instructions in [Windows Build Guide](docs/WINDOWS_BUILD.md)

   ```powershell
   # Quick build
   cd frontend
   npm run build:win
   ```

## 🧪 Testing

### Automated Tests
Run all unit tests (Backend & Frontend):
```bash
just test-all
```

### Manual Testing
For a step-by-step guide to verifying all features (including MITM, Sniffer, etc.), please read:
👉 **[Guía de Pruebas Manuales](docs/MANUAL_TESTING.md)**

## 🏗️ Architecture
- **Electron IPC:** Communicates with Python backend via `stdin`/`stdout`.
- **JSON Events:** Backend emits structured events (`STATS`, `WINDOW_UPDATE`, `PACKET_CAPTURE`) which the Frontend parses and visualizes.
- **Scapy:** Used for Packet Sniffing and crafting custom packets/tests.
- **Cross-Platform:** Compatible with Linux and Windows (with platform-specific adaptations).

## 🪟 Windows Support

This project fully supports Windows with the following adaptations:

- **Platform Detection:** Automatic OS detection for privilege management and Python paths
- **Npcap Integration:** Automatic detection and installation prompts for packet capture
- **Administrator Privileges:** UAC integration for elevated operations
- **Portable Executable:** Build as standalone `.exe` with embedded Python

For detailed Windows build instructions, see **[Windows Build Guide](docs/WINDOWS_BUILD.md)**.

### Windows-Specific Features

- ✅ Portable `.exe` distribution (no installation required)
- ✅ Embedded Python runtime (users don't need Python installed)
- ✅ Automatic Npcap detection and installation
- ✅ UAC integration for administrator privileges
- ✅ Windows Defender compatible

### Known Limitations on Windows

- **Packet capture requires Npcap** (free for educational use, license needed for commercial distribution)
- **Administrator privileges required** for packet capture:
  - Development: Run PowerShell as Administrator
  - Production (.exe): UAC prompt appears automatically at startup
- **Antivirus software** may flag the executable (false positive, can be signed with code signing certificate)

### Quick Start for Windows Development

**With packet capture:**
```powershell
# Run PowerShell as Administrator
cd frontend
npm run dev:electron
```

**Without packet capture:**
```powershell
# Run normally (sniffer will be disabled)
cd frontend
npm run dev:electron
```

📖 See [Windows Development Guide](docs/WINDOWS_DEV_GUIDE.md) for detailed instructions.