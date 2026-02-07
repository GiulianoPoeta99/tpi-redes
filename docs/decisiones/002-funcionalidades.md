# 002 - Funcionalidades del Proyecto

## Estado
Aceptado (con notas de alcance)

## Contexto
La consigna define un núcleo obligatorio (Tx/Rx + integridad) y funciones opcionales de valor agregado.

## Decisión
Se implementa el núcleo obligatorio y se incorporan extras orientadas a análisis de red, UX y observabilidad.

## Cumplimiento de Consigna

### Requerimientos obligatorios
| Requerimiento | Estado | Observación |
| --- | --- | --- |
| Elegir modo Tx/Rx | Implementado | UI separada por modo. |
| Ingresar IP remota (Tx) | Implementado | Campo manual + escaneo de peers. |
| Seleccionar archivo local (Tx) | Implementado | Soporta múltiple selección y cola. |
| Elegir TCP/UDP | Implementado | En Tx y Rx. |
| Receptor escucha en puerto configurable | Implementado | Puerto editable en UI/CLI. |
| Enviar archivo + checksum | Implementado | Hash SHA-256 se envía junto al archivo. |
| Verificación de integridad en receptor | Parcial | Se guarda `.sha256` y la verificación se hace desde el explorador de archivos recibido. |
| Deshabilitar controles no aplicables en Rx | Implementado | Al cambiar de modo, la UI muestra controles específicos. |
| Logs de actividad | Implementado | Logs y eventos JSON en dashboard/sniffer. |

### Funcionalidades extra
| Funcionalidad | Estado |
| --- | --- |
| Transferencia múltiple (batch) | Implementado |
| Progreso de transferencia | Implementado |
| Historial persistente | Implementado |
| Explorador de archivos recibidos + verificación manual | Implementado |
| Sniffer en tiempo real | Implementado |
| MITM proxy con corrupción | Implementado |
| Descubrimiento de peers por UDP broadcast | Implementado |

## Consecuencias
### Positivas
- Se cubren los objetivos académicos principales (TCP/UDP, integridad, operación Tx/Rx).
- El proyecto suma extras relevantes para análisis y demostración.

### Negativas
- La verificación de integridad en receptor no está acoplada automáticamente al cierre de recepción; hoy es una acción explícita desde UI.
