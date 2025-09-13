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
- **Auto-Discovery:** UDP Broadcast to automatically find peers on the local network.

## 🛠️ Tech Stack
- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Electron.
- **Backend:** Python, Scapy (Networking), Click (CLI).
- **Tooling:** Just (Task Runner), Biome (Lint/Format), Vitest (Testing), UV (Python Pkg Manager).

## 📦 Prerequisites
- **Python 3.10+** (and `uv` installed via `pip install uv`)
- **Node.js 18+**
- **Just** (`curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash`)
- **Libpcap** (for Scapy/Sniffer): `sudo apt install libpcap-dev`

## ⚡ Quick Start

1. **Install Dependencies:**
   ```bash
   just install
   ```
   This will set up the Python virtual environment and install Node modules.

2. **Run the Application:**
   ```bash
   just run
   ```
   This will start the Backend (CLI) and Frontend (Electron) in development mode.

## 📖 Usage Guide

### 1. File Transfer
- **Receiver:** Go to "Transfer" tab, select Protocol/Port, and click **Start Server**.
- **Sender:** Go to "Transfer" tab (Client Mode), enter IP/Port, select File, and click **Send File**.
- **Auto-Discovery:** Click the **Scan Network** icon to find local peers automatically.

### 2. Network Analysis
- **Sniffer:** Enable "Packet Sniffer" in the Transfer view. Go to "Packet Sniffer" tab to see logs or Table View.
- **Statistics:** Real-time throughput and RTT are displayed during transfers.
- **Sliding Window:** Visualizes the TCP window state in the Transfer view side panel.

### 3. MITM Simulation
- Go to "MITM Attack" tab.
- configure Listen Port (e.g., 8081) and Target (Server IP:8080).
- Set **Corruption Rate** (e.g., 1%).
- Start sending files to the **Proxy Port** (8081) instead of the Server.
- Observe Integrity Errors on the Server.

## 🧪 Testing
Run all tests (Backend & Frontend):
```bash
just test-all
```

## 🏗️ Architecture
- **Electron IPC:** Communicates with Python backend via `stdin`/`stdout`.
- **JSON Events:** Backend emits structured events (`STATS`, `WINDOW_UPDATE`, `PACKET_CAPTURE`) which the Frontend parses and visualizes.
- **Scapy:** Used for Packet Sniffing and crafting custom packets/tests.
