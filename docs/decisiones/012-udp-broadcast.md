# 012 - Auto-Descubrimiento (UDP Broadcast)

## Contexto
Actualmente, el usuario debe conocer e ingresar manualmente la dirección IP del receptor. Esto es tedioso y propenso a errores en redes locales dinámicas (DHCP).

## Decisión
Implementar un servicio de **Auto-Descubrimiento** basado en **UDP Broadcast**.

### Estrategia
1.  **Protocolo de Descubrimiento:**
    *   **Puerto:** Usaremos un puerto dedicado (ej: 37020) para no interferir con la transferencia de archivos.
    *   **Mensaje de Ping:** `{"type": "PING", "hostname": "MyPC"}` enviado a `255.255.255.255`.
    *   **Mensaje de Pong:** `{"type": "PONG", "hostname": "ReceiverPC", "ip": "192.168.1.X"}` respondido por los nodos activos.

2.  **Backend (Python):**
    *   `DiscoveryService`: Clase que maneja el socket UDP en modo broadcast.
    *   Método `scan()`: Envía el PING y espera respuestas por N segundos.
    *   Método `listen()`: Escucha PINGs y responde con PONG si la app está en modo Receptor.

3.  **Frontend (React):**
    *   Botón "Scan Network" en la vista de Transferencia.
    *   Lista desplegable o modal con los peers encontrados.
    *   Al seleccionar un peer, autocompletar el campo IP.

## Justificación
Mejora significativamente la experiencia de usuario (UX) al eliminar la necesidad de configuración manual de IPs en entornos LAN.
