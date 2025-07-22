# File Transfer CLI - Backend

Un CLI robusto para transferencia de archivos punto a punto usando TCP y UDP con capa de confiabilidad personalizada.

## 🚀 Inicio Rápido

### Compilación
```bash
# Compilar en modo release
just build

# O usando cargo directamente
cargo build --release --bin file-transfer-cli
```

### Prueba Rápida Local
```bash
# Terminal 1: Receptor
just run-receiver 8080

# Terminal 2: Emisor (crear archivo de prueba primero)
echo "¡Hola mundo!" > test.txt
just run-sender test.txt 127.0.0.1:8080
```

## 📋 Comandos Disponibles

### Desarrollo
```bash
just dev                    # Mostrar ayuda del CLI
just run-receiver [puerto]  # Iniciar receptor
just run-sender <archivo> <destino>  # Enviar archivo
```

### Compilación y Testing
```bash
just build                  # Compilar release
just build-debug           # Compilar debug
just test-all              # Ejecutar todos los tests
just test-real             # Pruebas reales de transferencia
just test-udp              # Pruebas específicas UDP
just test-performance      # Tests de rendimiento
```

### Docker
```bash
just docker-setup          # Configuración completa Docker
just docker-test           # Pruebas con Docker
just docker-up             # Iniciar servicios Docker
just docker-down           # Detener servicios Docker
just docker-logs           # Ver logs de containers
```

### Utilidades
```bash
just create-test-files     # Crear archivos de prueba
just clean-all             # Limpiar todo
just docs                  # Generar documentación
```

## 🌐 Uso del CLI

### Comandos Básicos

#### Enviar Archivo
```bash
# TCP (por defecto)
./target/release/file-transfer-cli send --target 192.168.1.100 --port 8080 archivo.txt

# UDP
./target/release/file-transfer-cli send --target 192.168.1.100 --port 8080 --protocol udp archivo.txt
```

#### Recibir Archivos
```bash
# TCP
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/

# UDP
./target/release/file-transfer-cli receive --port 8080 --protocol udp --output ./downloads/
```

### Opciones Avanzadas

#### Configuración Personalizada
```bash
./target/release/file-transfer-cli send \
  --target 192.168.1.100 \
  --port 8080 \
  --chunk-size 16384 \
  --timeout 60 \
  archivo.txt
```

#### Logging Detallado
```bash
# Verbose
./target/release/file-transfer-cli --verbose send --target 192.168.1.100 archivo.txt

# Debug
./target/release/file-transfer-cli --debug send --target 192.168.1.100 archivo.txt
```

#### Gestión de Transferencias
```bash
# Ver transferencias activas
./target/release/file-transfer-cli list

# Cancelar transferencia
./target/release/file-transfer-cli cancel <transfer-id>
```

## 🐳 Docker

### Configuración Rápida
```bash
# Configuración automática completa
just docker-setup

# Ejecutar pruebas
just docker-test
```

### Uso Manual
```bash
# Construir imagen
just docker-build

# Iniciar servicios (receptor TCP en 8080, UDP en 8081)
just docker-up

# Enviar archivo usando Docker
docker compose exec sender ft-cli send --target receiver --port 8080 /app/files/hello.txt

# Ver archivos recibidos
ls -la docker/volumes/tcp/
ls -la docker/volumes/udp/
```

### Estructura Docker
```
backend/
├── compose.yaml         # Docker Compose (raíz del backend)
├── .dockerignore       # Docker ignore (raíz del backend)
└── docker/
    ├── Dockerfile      # Imagen del CLI
    └── volumes/        # Volúmenes generados
        ├── tcp/        # Descargas TCP
        └── udp/        # Descargas UDP
```

## 🧪 Testing

### Tests Automatizados
```bash
# Tests unitarios e integración
just test-all

# Tests reales con transferencias
just test-real

# Tests de rendimiento
just test-performance
```

### Tests Manuales

#### Encontrar tu IP
```bash
# Linux/macOS
ip addr show | grep "inet " | grep -v 127.0.0.1

# Resultado ejemplo: 192.168.1.105
```

#### Prueba entre Máquinas

**Máquina A (Receptor):**
```bash
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/
```

**Máquina B (Emisor):**
```bash
./target/release/file-transfer-cli send --target 192.168.1.105 --port 8080 archivo.txt
```

#### Casos de Prueba
```bash
# Archivo pequeño
echo "Test pequeño" > small.txt
just run-sender small.txt 127.0.0.1:8080

# Archivo mediano (100KB)
dd if=/dev/zero of=medium.txt bs=1024 count=100
just run-sender medium.txt 127.0.0.1:8080

# Archivo grande (10MB) para performance
dd if=/dev/zero of=large.txt bs=1024 count=10240
just run-sender large.txt 127.0.0.1:8080
```

## 🔧 Solución de Problemas

### Errores Comunes

#### "Connection refused"
- Verificar que el receptor esté corriendo
- Verificar IP y puerto correctos
- Revisar firewall

```bash
# Verificar puerto disponible
netstat -tulpn | grep 8080

# Permitir puerto en firewall (Linux)
sudo ufw allow 8080
```

#### "File does not exist"
```bash
# Verificar archivo
ls -la archivo.txt

# Usar ruta absoluta
./target/release/file-transfer-cli send --target IP /ruta/completa/archivo.txt
```

#### "Permission denied"
```bash
# Crear directorio con permisos
mkdir -p downloads
chmod 755 downloads
```

### Debugging
```bash
# Logs detallados
./target/release/file-transfer-cli --debug send --target IP archivo.txt

# Monitorear conexiones
netstat -an | grep 8080

# Ver transferencias activas
./target/release/file-transfer-cli list
```

## 🏗️ Arquitectura

### Protocolos Soportados

#### TCP
- Protocolo confiable por defecto
- Recuperación automática de errores
- Mejor para redes estables
- Menor overhead para archivos grandes

#### UDP con Confiabilidad Personalizada
- Implementación de confiabilidad propia
- Control de flujo con ventana deslizante
- Mejor para redes no confiables
- Mayor control sobre retransmisión

### Estructura del Código
```
src/
├── main.rs              # Punto de entrada del CLI
├── lib.rs               # Biblioteca principal
├── config/              # Configuración
├── sockets/             # Implementaciones TCP/UDP
├── transfer/            # Lógica de transferencia
├── crypto/              # Funciones criptográficas
└── utils/               # Utilidades
```

## 📊 Rendimiento

### Configuraciones Recomendadas

#### Red Local Rápida
```bash
--protocol tcp --chunk-size 65536 --timeout 300
```

#### Red No Confiable
```bash
--protocol udp --chunk-size 4096 --timeout 60
```

#### Transferencia Local
```bash
--protocol tcp --chunk-size 32768
```

## 🔒 Seguridad

- Validación de integridad de archivos
- Timeouts configurables
- Manejo seguro de errores
- Sin almacenamiento de credenciales

## 📦 Distribución

### Compilación para Distribución
```bash
# Compilar optimizado
cargo build --release --bin file-transfer-cli

# El binario estará en: target/release/file-transfer-cli
```

### Docker para Distribución
```bash
# Construir imagen
just docker-build

# Exportar imagen
docker save file-transfer-cli > file-transfer-cli.tar

# Importar en otra máquina
docker load < file-transfer-cli.tar
```

## 🤝 Desarrollo

### Requisitos
- Rust 1.70+
- Just (task runner)
- Docker (opcional)

### Workflow de Desarrollo
```bash
# Setup inicial
just check

# Desarrollo continuo
cargo watch -x check -x test -x run

# Antes de commit
just lint
just format
just test-all
```

### Estructura de Tests
```
tests/
├── integration_tests.rs      # Tests de integración
├── cli_integration_tests.rs  # Tests del CLI
├── test_error_handling.rs    # Tests de manejo de errores
└── test_types.rs            # Tests de tipos
```

## 📚 Documentación Adicional

Para más información, consulta la documentación en la carpeta `docs/` del proyecto:

- Guía de testing detallada
- Ejemplos de uso avanzado
- Configuración de Docker
- Solución de problemas específicos

## 🎯 Casos de Uso

### Desarrollo y Testing
```bash
just docker-setup  # Entorno completo
just docker-test   # Pruebas automáticas
```

### Transferencias en Producción
```bash
# Receptor como servicio
./target/release/file-transfer-cli receive --port 8080 --output /data/incoming/

# Emisor con retry automático
./target/release/file-transfer-cli send --target server.example.com --timeout 300 archivo.txt
```

### Automatización
```bash
#!/bin/bash
# Script de backup automático
for file in /backup/*.tar.gz; do
    ./target/release/file-transfer-cli send --target backup-server --port 8080 "$file"
done
```

¡El CLI está listo para transferir archivos de manera confiable y eficiente! 🚀