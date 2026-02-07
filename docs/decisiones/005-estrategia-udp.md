# 005 - Estrategia de Implementación UDP

## Estado
Aceptado

## Contexto
La consigna exige soporte UDP para contrastar su comportamiento frente a TCP.

## Decisión
Se implementa UDP en modo **best effort** con protocolo de aplicación por etapas y sin retransmisión.

## Diseño adoptado
1.  El cliente envía por cada archivo:
    - datagrama de header binario fijo,
    - datagrama de metadata (nombre + hash),
    - stream de datagramas de contenido.
2.  El servidor mantiene estado por sesión (`ip:puerto`) con una máquina simple:
    - `WAITING_METADATA`
    - `RECEIVING_CONTENT`
3.  No hay ACKs, control de congestión ni reintentos a nivel aplicación.
4.  El tamaño de payload es configurable (constante `UDP_PAYLOAD_SIZE`, default actual 4096 bytes).

## Justificación
- Mantiene la implementación entendible para objetivos didácticos.
- Permite observar pérdidas/corrupciones y su impacto en integridad.

## Consecuencias
### Positivas
- Implementación simple y trazable.
- Buen contraste pedagógico con TCP.

### Negativas
- No garantiza entrega ni orden.
- Archivos grandes son más sensibles a pérdida en redes inestables.
