# 013 - Inspección de Flujo (Estilo Wireshark)

## Contexto
Actualmente, el "Packet Sniffer" muestra logs de texto plano en una consola simulada. Para un análisis más profundo, es útil tener una vista estructurada similar a Wireshark.

## Decisión
Implementar una **Tabla de Inspección de Paquetes** en el Frontend.

### Estrategia
1.  **Backend (Python):**
    *   El `PacketSniffer` ya emite logs. Necesitamos que emita eventos JSON estructurados para cada paquete capturado.
    *   Campos: `timestamp`, `src_ip`, `dst_ip`, `protocol`, `length`, `flags`, `seq`, `ack`, `payload_preview`.

2.  **Frontend (React):**
    *   Nuevo componente `PacketTable`.
    *   Columnas: `No.`, `Time`, `Source`, `Destination`, `Protocol`, `Length`, `Info`.
    *   **Color Coding:**
        *   SYN/SYN-ACK: Verde (Handshake).
        *   FIN/FIN-ACK: Rojo (Teardown).
        *   RST: Amarillo/Naranja (Error).
        *   Data: Azul/Gris.

3.  **Integración:**
    *   Reemplazar o complementar el `SnifferLog` actual con esta tabla.
    *   Podemos mantener el log de texto como una vista "Raw" y la tabla como "Structured".

## Justificación
Facilita enormemente la depuración y la comprensión del flujo TCP (Control de Flujo, Retransmisiones) y UDP.
