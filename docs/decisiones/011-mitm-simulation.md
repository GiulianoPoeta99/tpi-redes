# 011 - Simulación de Man-in-the-Middle (MITM)

## Estado
Aceptado

## Contexto
Se necesitaba una forma controlada de introducir corrupción para validar robustez e integridad del protocolo.

## Decisión
Implementar un proxy MITM con soporte para **TCP y UDP** y tasa configurable de corrupción.

## Estrategia
1.  El cliente se conecta al proxy (`listen-port`).
2.  El proxy reenvía al servidor real (`target-ip:target-port`).
3.  En tránsito aplica corrupción probabilística (`corruption-rate`).
4.  El proxy emite eventos de observabilidad para inspección en UI.

## Justificación
- Permite demostrar integridad y manejo de errores en un entorno reproducible.
- Evita depender de herramientas externas para inyectar fallas.

## Consecuencias
### Positivas
- Escenario práctico para pruebas académicas de transporte.
- Reutilizable tanto en TCP como UDP.

### Negativas
- Requiere configurar correctamente puertos/firewall entre nodos.
- En redes reales, el debugging puede confundirse con problemas de conectividad base.
