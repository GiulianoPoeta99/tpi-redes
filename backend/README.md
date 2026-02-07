# Backend - TPI Redes

Backend CLI de transferencia de archivos para el proyecto TPI Redes.

Implementa:
- servidor y cliente TCP/UDP,
- hash SHA-256 para integridad,
- discovery por UDP broadcast,
- proxy MITM con corrupción configurable,
- sniffer opcional con privilegios.

## Requisitos
- Python `>=3.14`
- `uv`
- Linux: `libpcap` para sniffing
- Linux: `pkexec`/`polkit` para elevación de sniffer

## Instalación
```bash
cd backend
uv sync
```

## Uso rápido (CLI)
```bash
cd backend
PYTHONPATH=src uv run python -m tpi_redes.cli.main --help
```

### Iniciar receptor
```bash
PYTHONPATH=src uv run python -m tpi_redes.cli.main \
  start-server --port 8080 --protocol tcp --sniff
```

### Enviar archivo(s)
```bash
PYTHONPATH=src uv run python -m tpi_redes.cli.main \
  send-file ./archivo1.bin ./archivo2.bin --ip 192.168.1.50 --port 8080 --protocol tcp
```

### Iniciar proxy MITM
```bash
PYTHONPATH=src uv run python -m tpi_redes.cli.main \
  start-proxy --listen-port 8081 --target-ip 192.168.1.50 --target-port 8080 \
  --corruption-rate 0.05 --protocol tcp
```

### Escanear peers
```bash
PYTHONPATH=src uv run python -m tpi_redes.cli.main scan-network
```

## Comandos disponibles
- `start-server`
- `send-file`
- `start-proxy`
- `scan-network`
- `list-interfaces`

## Variables de entorno
Definidas en `src/tpi_redes/config.py`:
- `TPI_REDES_HOST` (default `127.0.0.1`)
- `TPI_REDES_PORT` (default `8080`)
- `TPI_REDES_PROXY_PORT` (default `8081`)
- `TPI_REDES_HOME` (default `~/.tpi-redes`)
- `TPI_REDES_SAVE_DIR` (default `~/.tpi-redes/received_files`)

## Eventos JSON de salida
El backend emite eventos para Electron/UI por stdout, por ejemplo:
- `SERVER_READY`
- `TRANSFER_UPDATE`
- `PACKET_CAPTURE`
- `SNIFFER_ERROR`

## Calidad
```bash
just test
just lint
just format
```

## Notas operativas
- En pruebas entre dos hosts, abrir puertos en firewall del receptor/proxy:
  - recepción (`8080` por defecto, TCP/UDP según protocolo),
  - discovery (`37020/udp`),
  - MITM (`8081` por defecto, TCP/UDP según escenario).
- La verificación de integridad en receptor se realiza usando el sidecar `.sha256` generado durante la recepción.
