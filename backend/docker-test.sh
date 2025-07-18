#!/bin/bash
# Script simple para probar Docker

echo "🐳 Probando configuración Docker..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

echo "✅ Docker disponible"

# Crear archivos de prueba
mkdir -p test_files downloads downloads-udp
echo "¡Hola desde Docker!" > test_files/hello.txt
echo "Archivo de prueba creado ✅"

# Construir imagen
echo "🔨 Construyendo imagen..."
if docker build -t file-transfer-cli . > /dev/null 2>&1; then
    echo "✅ Imagen construida"
else
    echo "❌ Error al construir imagen"
    exit 1
fi

# Probar comando básico
echo "🧪 Probando CLI..."
if docker run --rm file-transfer-cli ft-cli --help | grep -q "socket-based"; then
    echo "✅ CLI funciona correctamente"
else
    echo "❌ CLI no funciona"
    exit 1
fi

echo "🎉 ¡Docker configurado correctamente!"
echo ""
echo "Próximos pasos:"
echo "1. chmod +x docker-setup.sh"
echo "2. ./docker-setup.sh setup"
echo "3. ./docker-setup.sh test"