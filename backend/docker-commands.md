# 🐳 Comandos Docker para File Transfer CLI

## Configuración Rápida

### 1. Configuración Automática (Recomendado)
```bash
# Hacer ejecutable el script
chmod +x docker-setup.sh

# Configuración completa automática
./docker-setup.sh setup
```

### 2. Configuración Manual
```bash
# Construir imagen
docker build -t file-transfer-cli .

# Crear archivos de prueba
mkdir -p test_files downloads downloads-udp
echo "Hola Docker!" > test_files/test.txt

# Iniciar servicios
docker-compose up -d
```

## 🚀 Uso Básico

### Ejecutar Pruebas Automáticas
```bash
./docker-setup.sh test
```

### Comandos Manuales

#### Enviar archivo (TCP)
```bash
docker-compose exec sender ft-cli send --target receiver --port 8080 /app/files/test.txt
```

#### Enviar archivo (UDP)
```bash
docker-compose exec sender ft-cli send --target receiver-udp --port 8081 --protocol udp /app/files/test.txt
```

#### Ver transferencias activas
```bash
docker-compose exec sender ft-cli list
```

#### Acceder al shell del container
```bash
./docker-setup.sh shell
# o
docker-compose exec sender /bin/bash
```

## 📊 Monitoreo

### Ver estado de servicios
```bash
./docker-setup.sh status
# o
docker-compose ps
```

### Ver logs
```bash
./docker-setup.sh logs
# o
docker-compose logs -f
```

### Ver archivos recibidos
```bash
# TCP
ls -la downloads/

# UDP
ls -la downloads-udp/
```

## 🌐 Pruebas entre Máquinas

### Máquina A (Receptor)
```bash
# Iniciar solo el receptor
docker run -d -p 8080:8080 -v $(pwd)/downloads:/app/downloads file-transfer-cli ft-cli receive --port 8080 --output /app/downloads
```

### Máquina B (Emisor)
```bash
# Enviar archivo a la IP de la Máquina A
docker run -v $(pwd)/test_files:/app/files file-transfer-cli ft-cli send --target 192.168.1.105 --port 8080 /app/files/archivo.txt
```

## 🔧 Comandos de Gestión

### Detener servicios
```bash
./docker-setup.sh stop
# o
docker-compose stop
```

### Reiniciar servicios
```bash
docker-compose restart
```

### Limpiar todo
```bash
./docker-setup.sh cleanup
# o
docker-compose down
docker rmi file-transfer-cli
```

### Ver ayuda del CLI
```bash
docker run file-transfer-cli ft-cli --help
```

## 📁 Estructura de Archivos

```
backend/
├── Dockerfile              # Imagen del CLI
├── docker-compose.yml      # Servicios (receptor, emisor)
├── docker-setup.sh         # Script de configuración
├── test_files/             # Archivos para enviar
├── downloads/              # Archivos recibidos (TCP)
└── downloads-udp/          # Archivos recibidos (UDP)
```

## 🎯 Casos de Uso Comunes

### Desarrollo y Pruebas
```bash
# Configuración completa
./docker-setup.sh setup

# Ejecutar pruebas
./docker-setup.sh test

# Desarrollo interactivo
./docker-setup.sh shell
```

### Demostración
```bash
# Iniciar servicios
./docker-setup.sh start

# En otra terminal, enviar archivo
docker-compose exec sender ft-cli send --target receiver --port 8080 /app/files/readme.txt

# Ver resultado
ls -la downloads/
```

### Pruebas de Rendimiento
```bash
# Crear archivo grande
dd if=/dev/zero of=test_files/large.dat bs=1M count=10

# Enviar con configuración personalizada
docker-compose exec sender ft-cli send --target receiver --port 8080 --chunk-size 32768 /app/files/large.dat
```

## 🐛 Solución de Problemas

### Container no inicia
```bash
# Ver logs
docker-compose logs receiver

# Verificar puertos
netstat -tulpn | grep 8080
```

### Archivos no se transfieren
```bash
# Verificar conectividad entre containers
docker-compose exec sender ping receiver

# Verificar archivos de origen
docker-compose exec sender ls -la /app/files/
```

### Permisos de archivos
```bash
# Cambiar permisos de directorios
chmod 755 downloads downloads-udp test_files
```

## 📦 Distribución

### Exportar imagen
```bash
docker save file-transfer-cli > file-transfer-cli.tar
```

### Importar imagen en otra máquina
```bash
docker load < file-transfer-cli.tar
```

### Subir a registry (opcional)
```bash
docker tag file-transfer-cli your-registry/file-transfer-cli:latest
docker push your-registry/file-transfer-cli:latest
```