# 010 - Tooling del Frontend

## Contexto
El frontend necesita herramientas para asegurar la calidad del código (Linting), consistencia de estilo (Formatting) y corrección funcional (Testing). El usuario sugirió Prettier, ESLint o Biome.

## Decisión
Utilizar **Biome** para Linting/Formatting y **Vitest** para Testing.

### Detalles
1.  **Biome:**
    *   Reemplaza a ESLint y Prettier en una sola herramienta.
    *   Extremadamente rápido (escrito en Rust).
    *   Configuración cero o mínima para proyectos TypeScript/React modernos.
    *   Comando: `biome check --write .`

2.  **Vitest:**
    *   Runner de tests nativo de Vite.
    *   Compatible con la API de Jest.
    *   Integración perfecta con el entorno de build de Vite (mismo pipeline).

3.  **Justfile:**
    *   Se creará un `Justfile` en la raíz del proyecto para orquestar comandos de backend y frontend.

## Justificación
Biome reduce la fatiga de configuración (no más conflictos entre ESLint y Prettier) y ofrece un rendimiento superior. Vitest es el estándar de facto para proyectos Vite.
