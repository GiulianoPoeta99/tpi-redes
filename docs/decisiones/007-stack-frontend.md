# 007 - Stack Frontend

## Contexto
El proyecto requiere una interfaz gráfica de usuario (GUI) moderna y "premium" para controlar la transferencia de archivos y visualizar conceptos de redes en tiempo real.

## Decisión
Utilizar **Electron + React + Tailwind CSS**.

### Detalles Técnicos
1.  **Electron:**
    *   Permite empaquetar la aplicación como un ejecutable de escritorio nativo (Linux/Windows/Mac).
    *   Facilita la comunicación con el backend de Python mediante `child_process` (stdio).
2.  **React (Vite):**
    *   Librería estándar para interfaces dinámicas.
    *   Vite ofrece un entorno de desarrollo ultra-rápido.
3.  **Tailwind CSS:**
    *   Framework "utility-first" que permite diseñar interfaces modernas y responsivas rápidamente.
    *   Facilita la implementación de temas oscuros y estéticas "premium" sin escribir CSS desde cero.

## Justificación
Esta combinación ofrece la flexibilidad de la web (HTML/CSS/JS) con la potencia del escritorio, ideal para visualizar gráficos en tiempo real (Sliding Window) y gestionar procesos de sistema (CLI Python).
