# 012 - Auto-Descubrimiento (UDP Broadcast)

## Estado
Aceptado

## Contexto
Configurar IP manualmente es propenso a errores en LAN con DHCP.

## Decisión
Se implementa discovery por UDP broadcast (`PING`/`PONG`) sobre puerto dedicado `37020/udp`.

## Protocolo
- `scan()`: envía `PING` a `255.255.255.255:37020` y espera respuestas.
- `listen()`: en modo receptor/proxy escucha `PING` y responde `PONG` con `hostname` y `port`.

## Justificación
- Mejora UX en redes locales.
- Reduce errores de tipeo de IP/puerto.

## Consecuencias
### Positivas
- Descubrimiento rápido en LANs sin configuración manual.

### Negativas
- Depende de política de red/firewall.
- Puede fallar en WiFi con client isolation o broadcast restringido.
- Debe mantenerse abierto `37020/udp` en host receptor para máxima compatibilidad.
