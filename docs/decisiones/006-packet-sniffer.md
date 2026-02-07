# 006 - Integración de Packet Sniffer

## Estado
Aceptado

## Contexto
La captura en tiempo real es clave para visualizar flags TCP, secuencias y flujo durante transferencias.

## Decisión
El sniffer se ejecuta como **subproceso privilegiado separado** del proceso principal de transferencia.

## Diseño adoptado
1.  El backend principal lanza un proceso de sniffer dedicado cuando se activa `--sniff`.
2.  En Linux, la elevación se realiza con `pkexec`.
3.  El sniffer emite eventos JSON por stdout (`PACKET_CAPTURE`, `SNIFFER_ERROR`).
4.  Electron reenvía esos eventos al renderer para visualización en tiempo real.
5.  Si no hay elevación o dependencias, la transferencia continúa y se notifica error de sniffer.

## Justificación
- Aísla privilegios de captura del resto de la aplicación.
- Evita bloquear el flujo Tx/Rx por fallos de sniffing.
- Mejora robustez frente a cancelaciones de autenticación.

## Consecuencias
### Positivas
- Menor acoplamiento entre transferencia y observabilidad.
- Mejor manejo de errores de permisos.

### Negativas
- Depende del stack del host (`pkexec`, `polkit`, `libpcap/npcap`).
- Introduce complejidad extra de procesos y sincronización de salida.
