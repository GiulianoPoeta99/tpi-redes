# 005 - Estrategia de Implementación UDP

## Contexto
El protocolo UDP (User Datagram Protocol) no garantiza entrega, orden ni integridad. La consigna pide soportar transferencias UDP para "comprender sus limitaciones".

## Decisión
Implementar una estrategia **"Best Effort" con Fragmentación Simple**.

### Detalles Técnicos
1.  **Fragmentación (Chunking):**
    *   Los archivos se dividirán en fragmentos pequeños para caber en el MTU (Maximum Transmission Unit) estándar de Ethernet.
    *   **Tamaño de Chunk:** 1024 bytes (Payload) + Headers. Esto es seguro para evitar fragmentación IP a nivel de red (MTU típico 1500).

2.  **Sin Control de Flujo ni Retransmisión:**
    *   **No** implementaremos ACKs (Confirmaciones) ni reintentos.
    *   Si un paquete se pierde, el archivo llegará corrupto o incompleto.
    *   **Objetivo:** Esto es intencional. Queremos que la verificación de hash (SHA-256) falle si hay pérdida de paquetes, demostrando visualmente la falta de fiabilidad de UDP para archivos grandes.

3.  **Protocolo de Aplicación:**
    *   Reutilizaremos el mismo encabezado de 16 bytes definido en `004-protocolo-comunicacion.md` para el primer paquete.
    *   Los paquetes subsiguientes serán pura data (payload).

## Justificación
Esta implementación minimalista cumple con el objetivo pedagógico de contrastar la robustez de TCP contra la velocidad/riesgo de UDP.
