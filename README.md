# TPI Redes - App de Transferencia de Archivos

Aplicación de escritorio orientada a práctica de Redes y Transmisión de Datos.

Permite transferir archivos entre dos nodos con TCP/UDP, observar tráfico en tiempo real y simular escenarios MITM.

## Funcionalidades
- Modo **Transmisor (Tx)** y **Receptor (Rx)**.
- Transferencia por **TCP** y **UDP**.
- Hash **SHA-256** incluido en el protocolo de transferencia.
- Sniffer con inspección de paquetes en UI.
- Discovery de peers por UDP broadcast.
- Proxy MITM con corrupción configurable (TCP/UDP).
- Envío batch de múltiples archivos.
- Historial persistente y panel de métricas.

## Estructura del repositorio
- `backend/`: CLI Python con sockets, servicios de red y observabilidad.
- `frontend/`: Electron + React (UI desktop).
- `docs/`: consigna, informe final y ADRs (`docs/decisiones`).

## Requisitos
- Python `>=3.14` + `uv`
- Node.js `18+`
- Linux (para build AppImage)
- `libpcap` para sniffing

## Instalación
```bash
just install
```

## Desarrollo
```bash
just run
```

## Comandos útiles
- `just run-backend --help`
- `just test-all`
- `just lint-all`
- `just format-all`

## AppImage (Linux)
Build para arquitectura local:

```bash
just build-appimage
```

Artefacto generado en:

```bash
frontend/release/
```

Ejecución:

```bash
chmod +x frontend/release/*.AppImage
./frontend/release/*.AppImage
```

## Firewall Ports (Two Linux PCs)
Si Tx y Rx corren en hosts distintos, abrir puertos en el receptor/proxy:

- **Puerto de recepción (configurable, default `8080`)**
  - **TCP** para transferencia TCP.
  - **UDP** para transferencia UDP.
- **Discovery (`37020/udp`)** para escaneo de peers.
- **Puerto MITM (configurable, default `8081`)**
  - abrir según protocolo usado por proxy.

`ufw`:

```bash
sudo ufw allow 8080/tcp
sudo ufw allow 8080/udp
sudo ufw allow 37020/udp
sudo ufw allow 8081/tcp
sudo ufw allow 8081/udp
```

`firewalld`:

```bash
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --add-port=8080/udp --permanent
sudo firewall-cmd --add-port=37020/udp --permanent
sudo firewall-cmd --add-port=8081/tcp --permanent
sudo firewall-cmd --add-port=8081/udp --permanent
sudo firewall-cmd --reload
```

## Notas de operación
- Archivos recibidos: `~/.tpi-redes/received_files`.
- Runtime backend empaquetado: `~/.tpi-redes/backend-runtime`.
- Sniffer requiere soporte del host (`pkexec`, `polkit`, libpcap).

## Documentación
- Consigna: `docs/consigna/consigna.txt`
- Informe final: `docs/INFORME_FINAL.md`
- Decisiones técnicas (ADR): `docs/decisiones/`
