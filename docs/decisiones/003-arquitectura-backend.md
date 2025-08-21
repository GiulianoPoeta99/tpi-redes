# 003 - Arquitectura del Backend

## Contexto
Inicialmente se consideró una arquitectura de tipo DDD (Domain-Driven Design) o Hexagonal. Sin embargo, para un proyecto de **Redes y Transmisión de Datos** donde el foco está en el manejo de sockets, bytes y protocolos, una estructura tan abstracta añade complejidad innecesaria ("Over-engineering").

## Decisión
Se opta por una **Estructura de Paquetes Semántica** y directa.

### Estructura de Carpetas
*   `src/tpi_redes/cli/`: **Punto de Entrada.** Contiene la lógica de la interfaz de línea de comandos (`click`). Es la capa de presentación.
*   `src/tpi_redes/networking/`: **Capa de Transporte.** Contiene la lógica pura de Sockets (TCP/UDP). Aquí viven las clases `TCPServer`, `UDPServer`, etc.
*   `src/tpi_redes/transfer/`: **Capa de Aplicación/Negocio.** Contiene la lógica de transferencia de archivos, integridad (Hashing), y manejo de archivos en disco.

## Justificación
1.  **Claridad:** Un desarrollador (o profesor) puede ir directamente a `networking` para ver cómo se usan los sockets, sin navegar por capas de abstracción (`infrastructure`, `domain`, `adapters`).
2.  **Simplicidad:** Python brilla con estructuras simples. Menos "boilerplate" significa más foco en la lógica real del TP.
3.  **Testing:** Esta estructura facilita el TDD al tener componentes desacoplados pero fáciles de instanciar.

## Estándares de Código
*   **Type Hints:** Uso estricto de tipos (`pyright` en modo strict).
*   **Linting:** `ruff` para asegurar estilo PEP-8 y buenas prácticas.
*   **Testing:** `pytest` con estructura espejo (`tests/` replica `src/`).
