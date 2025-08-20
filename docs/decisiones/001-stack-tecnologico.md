# 001 - Stack Tecnológico

## Resumen
Para cumplir con el requisito de una aplicación de escritorio que soporte sockets crudos (UDP/TCP) y al mismo tiempo ofrecer una interfaz moderna, se ha seleccionado una arquitectura híbrida.

## Tecnologías Seleccionadas

### 1. Frontend (Interfaz de Usuario)
*   **Framework:** **React** (utilizando **Vite** como bundler).
*   **Estilos:** **TailwindCSS**.
*   **Justificación:** Permite crear una interfaz rica, dinámica y "premium" como se solicita, con fácil manejo de estado para los modos Transmisor/Receptor.

### 2. Desktop Wrapper
*   **Tecnología:** **Electron**.
*   **Justificación:**
    *   Convierte la aplicación web en una aplicación de escritorio nativa (Linux/Windows/Mac).
    *   Permite la ejecución de procesos secundarios (el backend de Python).
    *   Resuelve la limitación de los navegadores que no permiten acceso directo a sockets UDP/TCP crudos.

### 3. Backend (CLI Tool)
*   **Concepto:** El backend será una herramienta de línea de comandos (CLI) robusta e independiente.
*   **Lenguaje:** **Python 3**.
*   **Librerías Clave:**
    *   `argparse` / `click`: Para el manejo de argumentos y banderas (ej: `--mode rx --port 8080`).
    *   `socket`, `hashlib`: Core de red y seguridad.
*   **Modos de Operación:**
    1.  **Headless / Manual:** Se puede ejecutar directamente en una terminal sin interfaz gráfica.
    2.  **Interactivo (JSON-RPC style):** Un modo especial para que Electron lo controle enviando comandos por `stdin`.

## Arquitectura: CLI + GUI Wrapper
1.  **Filosofía:** "La lógica de negocio vive en la terminal, la belleza vive en Electron".
2.  **Independencia:** Esto permite probar, depurar y usar la herramienta de transferencia en servidores sin entorno gráfico (headless), cumpliendo con creces los requisitos de redes.
3.  **Integración:**
    *   Electron actúa como un **Wrapper Gráfico**.
    *   Construye los comandos y los ejecuta (ej: `python main.py send --file data.txt --ip 192.168.1.5`).
    *   Para procesos largos (escuchar, packet sniffing), mantiene el proceso vivo y parsea su salida estándar.

## Diagrama Conceptual
```mermaid
graph TD
    User[Usuario] --> UI[Electron + React UI]
    UI -- HTTP Requests --> Python[Python Backend (Flask)]
    Python -- Sockets (TCP/UDP) --> Network[Red / Otro Nodo]
    Python -- Stdout/Logs --> UI
```
