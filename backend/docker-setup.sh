#!/bin/bash
# Script para configurar y ejecutar el CLI con Docker

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}🐳 $1${NC}"
    echo "----------------------------------------"
}

# Función para verificar Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado"
        print_info "Instala Docker desde: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose no está disponible"
        print_info "Instala Docker Compose o usa una versión más reciente de Docker"
        exit 1
    fi
    
    print_success "Docker está disponible"
}

# Función para crear archivos de prueba
create_test_files() {
    print_info "Creando archivos de prueba..."
    mkdir -p test_files downloads downloads-udp
    
    # Archivo pequeño
    echo "¡Hola mundo desde Docker!" > test_files/hello.txt
    
    # Archivo con contenido
    cat > test_files/readme.txt << EOF
Este es un archivo de prueba para el CLI de transferencia.
Ejecutándose desde Docker container.
Fecha: $(date)
Protocolo: TCP/UDP
EOF
    
    # Archivo mediano
    dd if=/dev/zero of=test_files/medium.dat bs=1024 count=100 2>/dev/null
    
    # Archivo JSON de ejemplo
    cat > test_files/config.json << EOF
{
  "app": "file-transfer-cli",
  "version": "0.1.0",
  "docker": true,
  "test": {
    "protocols": ["tcp", "udp"],
    "ports": [8080, 8081, 9090]
  }
}
EOF
    
    print_success "Archivos de prueba creados:"
    ls -lh test_files/
}

# Función para construir imagen
build_image() {
    print_header "Construyendo imagen Docker"
    
    if docker build -t file-transfer-cli .; then
        print_success "Imagen construida exitosamente"
    else
        print_error "Error al construir la imagen"
        exit 1
    fi
}

# Función para iniciar servicios
start_services() {
    print_header "Iniciando servicios"
    
    # Usar docker compose o docker-compose según disponibilidad
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    print_info "Iniciando receptores..."
    $COMPOSE_CMD up -d receiver receiver-udp
    
    sleep 3
    
    print_success "Servicios iniciados:"
    $COMPOSE_CMD ps
}

# Función para mostrar estado
show_status() {
    print_header "Estado de los servicios"
    
    if docker compose version &> /dev/null; then
        docker compose ps
    else
        docker-compose ps
    fi
    
    echo ""
    print_info "Puertos expuestos:"
    echo "  - TCP: localhost:8080"
    echo "  - UDP: localhost:8081"
    echo "  - Extra: localhost:9090"
}

# Función para ejecutar comando en container
run_command() {
    local cmd="$1"
    print_info "Ejecutando: $cmd"
    
    if docker compose version &> /dev/null; then
        docker compose exec sender $cmd
    else
        docker-compose exec sender $cmd
    fi
}

# Función para pruebas rápidas
run_quick_tests() {
    print_header "Ejecutando pruebas rápidas"
    
    # Asegurar que los servicios estén corriendo
    start_services
    sleep 2
    
    # Prueba TCP
    print_info "Prueba 1: TCP - archivo pequeño"
    run_command "ft-cli send --target receiver --port 8080 /app/files/hello.txt"
    
    sleep 1
    
    # Prueba UDP
    print_info "Prueba 2: UDP - archivo JSON"
    run_command "ft-cli send --target receiver-udp --port 8081 --protocol udp /app/files/config.json"
    
    sleep 1
    
    # Verificar archivos recibidos
    print_info "Archivos recibidos (TCP):"
    ls -la downloads/ 2>/dev/null || echo "No hay archivos"
    
    print_info "Archivos recibidos (UDP):"
    ls -la downloads-udp/ 2>/dev/null || echo "No hay archivos"
    
    print_success "Pruebas completadas"
}

# Función para limpiar
cleanup() {
    print_header "Limpiando recursos"
    
    if docker compose version &> /dev/null; then
        docker compose down
    else
        docker-compose down
    fi
    
    print_info "¿Eliminar archivos de prueba? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf test_files downloads downloads-udp
        print_success "Archivos eliminados"
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Script de configuración Docker para File Transfer CLI"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos:"
    echo "  setup     - Configuración completa (build + start)"
    echo "  build     - Solo construir imagen"
    echo "  start     - Solo iniciar servicios"
    echo "  test      - Ejecutar pruebas rápidas"
    echo "  status    - Mostrar estado de servicios"
    echo "  shell     - Abrir shell en container sender"
    echo "  logs      - Mostrar logs de servicios"
    echo "  stop      - Detener servicios"
    echo "  cleanup   - Limpiar todo"
    echo "  help      - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 setup              # Configuración completa"
    echo "  $0 test               # Ejecutar pruebas"
    echo "  $0 shell              # Acceder al container"
}

# Función principal
main() {
    local command="${1:-setup}"
    
    case "$command" in
        "setup")
            check_docker
            create_test_files
            build_image
            start_services
            show_status
            print_success "¡Configuración completa! Usa '$0 test' para ejecutar pruebas"
            ;;
        "build")
            check_docker
            build_image
            ;;
        "start")
            check_docker
            start_services
            show_status
            ;;
        "test")
            check_docker
            run_quick_tests
            ;;
        "status")
            show_status
            ;;
        "shell")
            print_info "Abriendo shell en container sender..."
            if docker compose version &> /dev/null; then
                docker compose exec sender /bin/bash
            else
                docker-compose exec sender /bin/bash
            fi
            ;;
        "logs")
            if docker compose version &> /dev/null; then
                docker compose logs -f
            else
                docker-compose logs -f
            fi
            ;;
        "stop")
            if docker compose version &> /dev/null; then
                docker compose stop
            else
                docker-compose stop
            fi
            print_success "Servicios detenidos"
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Comando desconocido: $command"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"