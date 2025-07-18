# 🐳 File Transfer CLI - Docker Edition

Ejecuta el CLI de transferencia de archivos en cualquier máquina con Docker, sin necesidad de instalar Rust ni dependencias.

## ⚡ Inicio Rápido (30 segundos)

```bash
# 1. Clonar y entrar al directorio
cd backend

# 2. Configuración automática
chmod +x docker-setup.sh
./docker-setup.sh setup

# 3. Ejecutar pruebas
./docker-setup.sh test
```

¡Listo! El CLI está funcionando en Docker.

## 🎯 ¿Qué Incluye?

- **CLI completo** compilado y listo para usar
- **Servicios automáticos** (receptor TCP y UDP)
- **Archivos de prueba** generados automáticamente
- **Scripts de gestión** para facilitar el uso
- **Documentación completa** con ejemplos

## 📋 Requisitos

- Docker (cualquier versión reciente)
- Docker Compose (incluido en Docker Desktop)

## 🚀 Comandos Principales

### Configuración
```bash
./docker-setup.sh setup    # Configuración completa
./docker-setup.sh build    # Solo construir imagen
./docker-setup.sh start    # Solo iniciar servicios
```

### Pruebas
```bash
./docker-setup.sh test     # Pruebas automáticas
./docker-setup.sh status   # Ver estado
./docker-setup.sh logs     # Ver logs
```

### Uso Interactivo
```bash
./docker-setup.sh shell    # Acceder al container
```

### Limpieza
```bash
./docker-setup.sh stop     # Detener servicios
./docker-setup.sh cleanup  # Limpiar todo
```

## 🌐 Uso en Red

### Máquina A (Receptor)
```bash
docker run -d -p 8080:8080 -v $(pwd)/downloads:/app/downloads file-transfer-cli ft-cli receive --port 8080 --output /app/downloads
```

### Máquina B (Emisor)
```bash
# Reemplazar 192.168.1.105 con la IP real de la Máquina A
docker run -v $(pwd)/files:/app/files file-transfer-cli ft-cli send --target 192.168.1.105 --port 8080 /app/files/archivo.txt
```

## 📁 Estructura

```
backend/
├── Dockerfile              # Imagen optimizada del CLI
├── docker-compose.yml      # Servicios (TCP/UDP)
├── docker-setup.sh         # Script de gestión
├── docker-commands.md      # Comandos detallados
├── test_files/             # Archivos para enviar
├── downloads/              # Archivos recibidos (TCP)
└── downloads-udp/          # Archivos recibidos (UDP)
```

## 🎪 Demostración

```bash
# Terminal 1: Ver logs en tiempo real
./docker-setup.sh logs

# Terminal 2: Enviar archivos
./docker-setup.sh shell
ft-cli send --target receiver --port 8080 /app/files/readme.txt
ft-cli list
exit

# Terminal 3: Ver archivos recibidos
ls -la downloads/
```

## 🔧 Personalización

### Puertos Personalizados
```bash
# Editar docker-compose.yml para cambiar puertos
# Ejemplo: cambiar 8080:8080 por 9090:8080
```

### Archivos Propios
```bash
# Copiar tus archivos a test_files/
cp /ruta/a/tu/archivo.txt test_files/

# Usar en el container
docker-compose exec sender ft-cli send --target receiver --port 8080 /app/files/archivo.txt
```

## 📊 Ventajas de la Versión Docker

- ✅ **Sin instalación** de Rust o dependencias
- ✅ **Portabilidad** completa entre sistemas
- ✅ **Aislamiento** del sistema host
- ✅ **Configuración** automática
- ✅ **Pruebas** integradas
- ✅ **Fácil distribución** a otros equipos

## 🆘 Ayuda

```bash
./docker-setup.sh help              # Ayuda del script
docker run file-transfer-cli --help # Ayuda del CLI
```

## 📖 Documentación Completa

- `docker-commands.md` - Todos los comandos Docker
- `docs/testing_guide_es.md` - Guía completa de pruebas
- `QUICK_START.md` - Inicio rápido sin Docker

¡Perfecto para demos, pruebas y distribución! 🎉