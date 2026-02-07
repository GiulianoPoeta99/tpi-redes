# 003 - Arquitectura del Backend

## Estado
Aceptado

## Contexto
El foco del proyecto es transporte y protocolos. Se prioriza una estructura explícita y fácil de auditar por sobre capas arquitectónicas pesadas.

## Decisión
Se usa una estructura de paquetes semántica orientada a responsabilidades de red:

- `src/tpi_redes/cli/`: entrada Click y orquestación de comandos.
- `src/tpi_redes/transport/`: implementación de TCP/UDP cliente-servidor.
- `src/tpi_redes/services/`: servicios auxiliares de red (discovery, proxy MITM).
- `src/tpi_redes/observability/`: sniffing y emisión de eventos de paquetes.
- `src/tpi_redes/core/`: primitivas comunes (base server, protocolo binario).
- `src/tpi_redes/transfer/`: integridad/hash de archivos.
- `src/tpi_redes/config.py`: configuración centralizada por constantes/env vars.

## Consecuencias
### Positivas
- Navegación directa para revisar sockets/protocolos.
- Menor sobreingeniería para un TP de redes.
- Facilita pruebas unitarias por módulo.

### Negativas
- No hay capas de abstracción para múltiples backends de transporte más allá de TCP/UDP.
- Cambios transversales (ej. formato de evento) impactan en varios módulos.
