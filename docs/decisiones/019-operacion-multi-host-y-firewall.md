# 019 - Operación Multi-Host y Reglas de Firewall

## Estado
Aceptado

## Contexto
Las pruebas entre dos PCs reales mostraron fallos de conexión por políticas de firewall y restricciones de red local.

## Decisión
Documentar como requisito operativo abrir explícitamente puertos de servicio según modo:
- Puerto de recepción configurable (default `8080`, TCP/UDP según protocolo).
- Discovery `37020/udp`.
- Puerto MITM configurable (default `8081`, TCP/UDP según escenario).

## Justificación
- Evita falsos diagnósticos de "fallo de app" cuando el bloqueo es de red.
- Hace repetibles las pruebas entre hosts en LAN/WiFi.

## Consecuencias
### Positivas
- Diagnóstico más rápido.
- Menos fricción en demostraciones.

### Negativas
- Requiere privilegios de sistema para ajustar firewall.
- Discovery puede seguir limitado por AP/client isolation en algunos routers.
