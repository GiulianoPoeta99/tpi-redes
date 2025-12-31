# 16. Mejoras de UX en Configuración de Red

Fecha: 2025-12-31

## Estado

Aceptado

## Contexto

La interfaz de usuario presentaba algunas fricciones y comportamientos inconsistentes en las vistas de configuración de red (Transmitter y MITM):
1.  **Valores por defecto invasivos**: En el modo MITM, el campo "Target IP" venía pre-cargado con `127.0.0.1`, lo cual podía sugerir que *siempre* se debía atacar a localhost o inducir a errores si el usuario olvidaba cambiarlo.
2.  **Placeholders inconsistentes**: Diferentes componentes usaban distintos estilos o valores para indicar qué input se esperaba.
3.  **Componente `IpInput` rígido**: No permitía definir placeholders personalizados por segmento.

## Decisión

1.  **Eliminar Default en Target IP**: En `MitmView`, el estado inicial de `targetIp` se cambió a una cadena vacía `''`.
2.  **Estandarizar Placeholders**: Se definió `127.0.0.1` (`DEFAULT_HOST`) como el placeholder visual estándar para inputs de IP que están vacíos.
3.  **IpInput Dinámico**: Se refactorizó el componente `IpInput.tsx` para aceptar una prop `placeholder`. Este componente ahora divide la cadena del placeholder (e.g., "127.0.0.1") y muestra cada octeto como "hint" en los 4 campos de texto correspondientes cuando están vacíos.

## Consecuencias

### Positivas
*   **Claridad**: El usuario sabe explícitamente cuándo un campo está vacío y necesita atención, vs. cuándo tiene un valor válido por defecto.
*   **Consistencia**: Todas las pantallas de configuración de red ahora se comportan igual visualmente.
*   **Prevención de Errores**: Reduce la probabilidad de iniciar un ataque MITM hacia el target equivocado por defecto.

### Negativas
*   El usuario debe escribir explícitamente la IP (o seleccionarla del escaneo) la primera vez, lo cual es un paso extra intencional ("safety friction").
