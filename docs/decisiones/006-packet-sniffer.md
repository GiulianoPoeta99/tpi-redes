# 006 - Integración de Packet Sniffer

## Contexto
Una de las funcionalidades "Extra" más importantes es la capacidad de inspeccionar el tráfico en tiempo real, similar a Wireshark, para entender qué está pasando "por los cables".

## Decisión
Utilizar `scapy.sendrecv.AsyncSniffer` para captura no bloqueante.

### Detalles Técnicos
1.  **Librería:** `scapy` es el estándar de facto en Python para manipulación de paquetes.
2.  **Ejecución:** El sniffer correrá en un hilo separado (background) para no congelar la CLI ni la transferencia de archivos.
3.  **Filtros:** Se aplicarán filtros BPF (Berkeley Packet Filter) estrictos (ej: `tcp port 8080 or udp port 8080`) para evitar "ruido" de otras aplicaciones.
4.  **Parsing:** Se extraerán campos clave de las capas IP, TCP y UDP:
    *   IP Src/Dst
    *   TCP Flags (SYN, ACK, FIN, PSH)
    *   Seq/Ack Numbers
    *   Payload Hexdump (primeros N bytes)

## Justificación
Permite visualizar el "Handshake" TCP y el flujo de datos UDP en tiempo real, cumpliendo con el objetivo educativo de visualizar conceptos de redes.
