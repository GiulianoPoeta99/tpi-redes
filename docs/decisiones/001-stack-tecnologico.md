# 001 - Stack Tecnológico

## Estado
Aceptado

## Contexto
La aplicación necesita:
- Interfaz de escritorio para operar como Tx/Rx.
- Acceso a sockets TCP/UDP y captura de paquetes.
- Integración entre UI y lógica de red sin acoplarse a un framework web.

## Decisión
Se adopta una arquitectura **Electron + React (frontend)** y **Python CLI (backend)**.

### Frontend
- React + TypeScript + Vite.
- Tailwind CSS para UI.
- Electron como runtime desktop y puente con el sistema operativo.

### Backend
- Python + Click para CLI.
- Sockets nativos (`socket`) para TCP/UDP.
- Scapy para sniffing e inspección de tráfico.

### Integración
- Electron ejecuta el backend como proceso hijo (`child_process`).
- Comunicación principal por `stdout/stderr` con eventos JSON.
- IPC interno de Electron para distribuir eventos al renderer.

## Consecuencias
### Positivas
- Separación clara entre UI y lógica de red.
- Backend reutilizable en modo CLI sin UI.
- Empaquetado desktop sin reescribir la lógica de transporte.

### Negativas
- Hay que mantener contratos de eventos JSON entre procesos.
- El debugging cruza tres capas (renderer, main de Electron, backend Python).

## Notas
No se usa Flask ni comunicación HTTP entre frontend y backend; la integración es local por procesos e IPC.
