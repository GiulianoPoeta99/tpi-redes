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
- **Python 3.14** (and `uv` installed via `pip install uv`)
- **Node.js 18+**
- **Just** (`curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash`)
- **Libpcap** (for Scapy/Sniffer): `sudo apt install libpcap-dev`

## ⚡ Quick Start

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
