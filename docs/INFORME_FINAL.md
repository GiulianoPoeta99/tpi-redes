# Informe Final - TPI Redes

## 1. Objetivo
Este proyecto implementa una aplicación de transferencia de archivos entre dos nodos IP, con soporte TCP/UDP, integridad por hash y una interfaz de escritorio para operación en modo transmisor (Tx) y receptor (Rx).

La solución fue diseñada con foco didáctico en Capa 4 (Transporte), observabilidad y pruebas en red real entre dos máquinas.

## 2. Arquitectura Implementada

### 2.1 Componentes
- **Frontend Desktop:** Electron + React + TypeScript.
- **Backend:** CLI en Python (Click) con sockets nativos.
- **Observabilidad:** Scapy para sniffing y eventos JSON.

### 2.2 Comunicación entre Frontend y Backend
- Electron ejecuta el backend como proceso hijo.
- La integración se realiza por `stdout/stderr` + eventos JSON.
- El renderer consume eventos por IPC interno de Electron.

### 2.3 Estructura técnica
- `backend/src/tpi_redes/transport`: TCP/UDP cliente-servidor.
- `backend/src/tpi_redes/services`: discovery y proxy MITM.
- `backend/src/tpi_redes/observability`: sniffer y packet logging.
- `frontend/src/features`: vistas Tx/Rx/MITM, dashboard, modales y hooks.

## 3. Cumplimiento de la Consigna

### 3.1 Requerimientos obligatorios
| Requerimiento | Estado | Nota |
| --- | --- | --- |
| Ingresar IP remota | Cumplido | Entrada manual + escaneo de peers. |
| Seleccionar archivo local | Cumplido | Selector y drag & drop. |
| Elegir TCP/UDP | Cumplido | Disponible en Tx y Rx. |
| Definir modo Tx/Rx | Cumplido | Vistas separadas por modo. |
| Receptor escucha en puerto configurable | Cumplido | Puerto editable en UI/CLI. |
| Enviar archivo + checksum | Cumplido | Hash SHA-256 se envía en metadata. |
| Receptor valida integridad | Parcial | Se guarda `.sha256` y se verifica desde el explorador de recibidos. |
| Logs de actividad | Cumplido | Logs y eventos en dashboard/sniffer. |

### 3.2 Funciones opcionales
| Función opcional | Estado |
| --- | --- |
| Múltiples archivos | Cumplido |
| Barra/progreso de envío | Cumplido |
| Logs y observabilidad | Cumplido |
| Discovery por broadcast | Cumplido |
| MITM con corrupción | Cumplido |
| Historial persistente | Cumplido |

## 4. Funcionalidades Relevantes

### 4.1 Transferencia TCP/UDP
- **TCP:** envío secuencial con protocolo binario (header + metadata + contenido).
- **UDP:** modo best-effort con sesiones por emisor y sin retransmisión a nivel aplicación.

### 4.2 Integridad
- El emisor calcula SHA-256 previo al envío.
- El receptor almacena hash recibido en sidecar `.sha256`.
- La comparación de integridad se ejecuta desde la UI de archivos recibidos.

### 4.3 Sniffer
- Se lanza como proceso privilegiado separado cuando se activa `--sniff`.
- Emite eventos `PACKET_CAPTURE` y errores estructurados (`SNIFFER_ERROR`).

### 4.4 MITM
- Proxy configurable con corrupción probabilística para TCP/UDP.
- Permite validar robustez frente a alteración de payload.

### 4.5 Discovery
- Escaneo por `PING/PONG` en `37020/udp`.
- Puede verse afectado por firewall y políticas de broadcast del router/AP.

## 5. Estado de Documentación de Decisiones
Las decisiones de arquitectura y evolución están registradas en `docs/decisiones` (001 a 019), incluyendo:
- stack e integración,
- arquitectura backend,
- protocolo y estrategia UDP,
- sniffer privilegiado,
- MITM/discovery,
- configuración centralizada,
- distribución AppImage,
- rutas runtime en HOME,
- requisitos de puertos/firewall.

## 6. Operación en Dos PCs (Red Real)
Para pruebas entre hosts, el firewall del receptor/proxy debe permitir:
- puerto de recepción (default `8080`, TCP/UDP según protocolo),
- `37020/udp` para discovery,
- puerto MITM (default `8081`, TCP/UDP según modo).

Sin esto, pueden aparecer timeouts aunque la aplicación esté funcionando correctamente.

## 7. Conclusión
El proyecto cumple los objetivos principales de la consigna y agrega capacidades avanzadas de análisis y pruebas de red. El estado actual es apto para demostración académica end-to-end en Linux con AppImage.

Como mejora pendiente, la validación de integridad puede automatizarse completamente en el receptor al finalizar cada transferencia.
