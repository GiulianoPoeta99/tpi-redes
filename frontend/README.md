# Frontend - TPI Redes (Electron + React)

Aplicación de escritorio para operar el backend de transferencia (Tx/Rx/MITM) desde una UI.

## Stack
- Electron
- React + TypeScript + Vite
- Tailwind CSS
- Biome + Vitest

## Requisitos
- Node.js `18+`
- npm
- Backend Python preparado en `../backend`

## Instalación
```bash
cd frontend
npm install
```

## Desarrollo
```bash
npm run dev:electron
```

Esto levanta:
- Vite dev server (renderer)
- Electron main process

## Scripts principales
- `npm run build:renderer`: build de React/Vite.
- `npm run compile:electron`: compila `electron/main.ts` y `preload.ts`.
- `npm run lint`: Biome check.
- `npm run test`: Vitest.
- `npm run build:backend:linux`: genera backend standalone con PyInstaller.
- `npm run build:appimage`: build completo AppImage para arquitectura local Linux.

## Integración con backend
La UI no habla HTTP con backend.

Electron ejecuta comandos CLI del backend y consume eventos JSON por stdout/stderr:
- `TRANSFER_UPDATE`
- `SERVER_READY`
- `PACKET_CAPTURE`
- `SNIFFER_ERROR`

## Build AppImage (Linux)
```bash
cd frontend
npm run build:appimage
```

Artefacto:
- `frontend/release/tpi-redes-<version>-<arch>.AppImage`

## Runtime en producción
Al ejecutar AppImage:
- runtime backend: `~/.tpi-redes/backend-runtime`
- archivos recibidos: `~/.tpi-redes/received_files`

## Troubleshooting
- Warning `vaInitialize failed`: suele ser no bloqueante (aceleración de video).
- Sniffer requiere `pkexec` + `polkit` + libpcap.
- Si no detecta peers o no conecta entre PCs, revisar firewall/puertos:
  - recepción: `8080` (default, TCP/UDP según protocolo),
  - discovery: `37020/udp`,
  - MITM: `8081` (default, TCP/UDP).
