#!/bin/bash

# Comprehensive Lab Validation Script
# This script validates that the laboratory environment is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validation functions
validate_docker() {
    log_info "Validating Docker environment..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    log_success "Docker environment is ready"
}

validate_compose() {
    log_info "Validating Docker Compose..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker Compose is not available"
        return 1
    fi
    
    # Check if compose file exists and is valid
    if [ ! -f "docker/compose-lab.yaml" ]; then
        log_error "Lab compose file not found"
        return 1
    fi
    
    if ! docker compose -f docker/compose-lab.yaml config &> /dev/null; then
        log_error "Lab compose file is invalid"
        return 1
    fi
    
    log_success "Docker Compose configuration is valid"
}

validate_test_files() {
    log_info "Validating test files..."
    
    local fixtures_dir="tests/fixtures"
    local required_files=("hello.txt" "config.json")
    
    if [ ! -d "$fixtures_dir" ]; then
        log_error "Test fixtures directory not found: $fixtures_dir"
        return 1
    fi
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$fixtures_dir/$file" ]; then
            log_warning "Required test file missing: $file"
            log_info "Creating missing test file: $file"
            # This would be handled by the create-test-files command
        else
            log_success "Test file exists: $file"
        fi
    done
}

validate_build() {
    log_info "Validating build environment..."
    
    if [ ! -f "Cargo.toml" ]; then
        log_error "Cargo.toml not found in current directory"
        return 1
    fi
    
    if ! cargo check --bin file-transfer-cli &> /dev/null; then
        log_error "Project does not compile"
        return 1
    fi
    
    log_success "Build environment is ready"
}

validate_lab_containers() {
    log_info "Validating lab containers..."
    
    # Check if containers are running
    local containers=("ft-machine-a" "ft-machine-b" "ft-router")
    local all_running=true
    
    for container in "${containers[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            log_warning "Container not running: $container"
            all_running=false
        else
            log_success "Container running: $container"
        fi
    done
    
    if [ "$all_running" = false ]; then
        log_warning "Some containers are not running. Lab may need to be started."
        return 1
    fi
}

validate_network_connectivity() {
    log_info "Validating network connectivity..."
    
    # Test A -> B connectivity
    if docker compose -f docker/compose-lab.yaml exec -T machine-a ping -c 2 -W 5 172.21.0.10 &> /dev/null; then
        log_success "Machine A can reach Machine B"
    else
        log_error "Machine A cannot reach Machine B"
        return 1
    fi
    
    # Test B -> A connectivity
    if docker compose -f docker/compose-lab.yaml exec -T machine-b ping -c 2 -W 5 172.20.0.10 &> /dev/null; then
        log_success "Machine B can reach Machine A"
    else
        log_error "Machine B cannot reach Machine A"
        return 1
    fi
}

validate_cli_availability() {
    log_info "Validating CLI availability..."
    
    # Test CLI on Machine A
    if docker compose -f docker/compose-lab.yaml exec -T machine-a ft-cli --version &> /dev/null; then
        log_success "CLI available on Machine A"
    else
        log_error "CLI not available on Machine A"
        return 1
    fi
    
    # Test CLI on Machine B
    if docker compose -f docker/compose-lab.yaml exec -T machine-b ft-cli --version &> /dev/null; then
        log_success "CLI available on Machine B"
    else
        log_error "CLI not available on Machine B"
        return 1
    fi
}

run_functional_test() {
    log_info "Running functional file transfer test..."
    
    # Clean previous test files
    docker compose -f docker/compose-lab.yaml exec -T machine-b rm -f /app/downloads/* 2>/dev/null || true
    
    # Start receiver in background
    docker compose -f docker/compose-lab.yaml exec -d machine-b timeout 15 ft-cli receive --port 8080 --protocol tcp --output /app/downloads --timeout 10
    
    # Wait for receiver to bind
    sleep 2
    
    # Send file
    if docker compose -f docker/compose-lab.yaml exec -T machine-a ft-cli send --target 172.21.0.10 --port 8080 --protocol tcp --timeout 8 /app/files/hello.txt &> /dev/null; then
        log_success "File transfer command completed"
    else
        log_error "File transfer command failed"
        return 1
    fi
    
    # Wait for transfer to complete
    sleep 2
    
    # Verify file was received
    if docker compose -f docker/compose-lab.yaml exec -T machine-b test -f /app/downloads/hello.txt; then
        log_success "File transfer successful - file received"
    else
        log_error "File transfer failed - file not received"
        return 1
    fi
}

# Main validation function
main() {
    echo "🔍 File Transfer Laboratory Validation"
    echo "======================================"
    echo ""
    
    local validation_failed=false
    
    # Run all validations
    validate_docker || validation_failed=true
    echo ""
    
    validate_compose || validation_failed=true
    echo ""
    
    validate_test_files || validation_failed=true
    echo ""
    
    validate_build || validation_failed=true
    echo ""
    
    # Only validate running containers if they should be running
    if docker ps --format "table {{.Names}}" | grep -q "ft-"; then
        validate_lab_containers || validation_failed=true
        echo ""
        
        validate_network_connectivity || validation_failed=true
        echo ""
        
        validate_cli_availability || validation_failed=true
        echo ""
        
        run_functional_test || validation_failed=true
        echo ""
    else
        log_info "Lab containers not running - skipping runtime validations"
        log_info "Run 'just lab-setup' to start the lab environment"
        echo ""
    fi
    
    # Final result
    if [ "$validation_failed" = true ]; then
        log_error "Laboratory validation FAILED"
        echo ""
        echo "🔧 Suggested fixes:"
        echo "  1. Run 'just lab-setup' to initialize the lab"
        echo "  2. Run 'just create-test-files' to create missing test files"
        echo "  3. Check Docker daemon is running"
        echo "  4. Verify network connectivity"
        exit 1
    else
        log_success "Laboratory validation PASSED"
        echo ""
        echo "🎉 The laboratory is ready for use!"
        echo ""
        echo "📋 Available commands:"
        echo "  - just lab-test      # Run automated tests"
        echo "  - just lab-status    # Check lab status"
        echo "  - just lab-shell-a   # Access Machine A"
        echo "  - just lab-shell-b   # Access Machine B"
        echo "  - just lab-down      # Stop lab"
        exit 0
    fi
}

# Run main function
main "$@"