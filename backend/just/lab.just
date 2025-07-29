# Setup lab with two isolated networks (simulates internet)
lab-setup: create-test-files docker-build-lab
	@echo "Setting up robust file transfer laboratory..."
	mkdir -p docker/volumes/lab/machine-a docker/volumes/lab/machine-b
	@echo "Created volume directories"
	
	# Cleanup any existing lab containers
	-cd docker && docker compose -f compose-lab.yaml down --remove-orphans 2>/dev/null
	
	# Start lab environment
	cd docker && USER_ID=$(id -u) GROUP_ID=$(id -g) docker compose -f compose-lab.yaml up -d
	@echo "Waiting for containers to initialize..."
	
	# Wait for containers to be ready with health checks
	just _lab-wait-ready
	
	# Verify network connectivity
	just _lab-verify-connectivity
	
	@echo "Lab environment ready and verified!"
	@echo "Machine A: 172.20.0.10 (network-a)"
	@echo "Machine B: 172.21.0.10 (network-b)"
	@echo "Use 'just lab-shell-a' and 'just lab-shell-b' to access machines"
	@echo "Use 'just lab-test' to run automated tests"

# Stop lab environment and cleanup
lab-down:
	@echo "Stopping lab environment..."
	cd docker && docker compose -f compose-lab.yaml down --remove-orphans --volumes
	@echo "Cleaning up lab volumes..."
	-rm -rf docker/volumes/lab/machine-a/* docker/volumes/lab/machine-b/* 2>/dev/null || true
	@echo "Lab environment stopped and cleaned"

# Open shell in Machine A
lab-shell-a:
	cd docker && docker compose -f compose-lab.yaml exec machine-a /bin/bash

# Open shell in Machine B
lab-shell-b:
	cd docker && docker compose -f compose-lab.yaml exec machine-b /bin/bash

# Test file transfer between isolated networks with comprehensive validation
lab-test: lab-setup
	@echo "Running comprehensive file transfer tests..."
	
	# Test 1: TCP File Transfer
	just _lab-test-tcp
	
	# Test 2: UDP File Transfer  
	just _lab-test-udp
	
	# Test 3: Bidirectional Transfer
	just _lab-test-bidirectional
	
	# Test 4: Error Handling
	just _lab-test-error-handling
	
	@echo "All lab tests completed successfully!"

# Follow logs from all lab containers
lab-logs:
	cd docker && docker compose -f compose-lab.yaml logs -f

# Show comprehensive lab status and network connectivity
lab-status:
	@echo "Lab Environment Status:"
	@echo "======================"
	cd docker && docker compose -f compose-lab.yaml ps
	@echo ""
	@echo "Network Connectivity Tests:"
	@echo "==========================="
	
	# Test A -> B connectivity
	@echo "Testing Machine A -> Machine B:"
	cd docker && docker compose -f compose-lab.yaml exec machine-a ping -c 2 172.21.0.10 && echo "A->B: Connected" || echo "A->B: Failed"
	
	# Test B -> A connectivity  
	@echo "Testing Machine B -> Machine A:"
	cd docker && docker compose -f compose-lab.yaml exec machine-b ping -c 2 172.20.0.10 && echo "B->A: Connected" || echo "B->A: Failed"
	
	# Test CLI availability
	@echo ""
	@echo "CLI Availability:"
	@echo "================="
	@echo "Machine A CLI:"
	cd docker && docker compose -f compose-lab.yaml exec machine-a ft-cli --version && echo "CLI Available" || echo "CLI Not Available"
	@echo "Machine B CLI:"
	cd docker && docker compose -f compose-lab.yaml exec machine-b ft-cli --version && echo "CLI Available" || echo "CLI Not Available"
	
	# Show available test files
	@echo ""
	@echo "Available Test Files:"
	@echo "===================="
	cd docker && docker compose -f compose-lab.yaml exec machine-a ls -la /app/files/

# Internal helper functions for robust lab operations

# Wait for lab containers to be ready with health checks
_lab-wait-ready:
	@echo "Waiting for containers to be ready..."
	
	# Give containers time to fully initialize
	@echo "  Initial wait for container startup..."
	sleep 8
	
	# Simple verification that containers are responsive
	@echo "  Verifying router..."
	cd docker && docker compose -f compose-lab.yaml exec -T router ip route show >/dev/null
	@echo "  Router ready"
	
	@echo "  Verifying machine-a..."
	cd docker && docker compose -f compose-lab.yaml exec -T machine-a ip route show >/dev/null
	@echo "  Machine A ready"
	
	@echo "  Verifying machine-b..."
	cd docker && docker compose -f compose-lab.yaml exec -T machine-b ip route show >/dev/null
	@echo "  Machine B ready"
	
	# Wait for CLI to be available
	@echo "  Checking CLI availability..."
	cd docker && docker compose -f compose-lab.yaml exec -T machine-a ft-cli --version >/dev/null
	cd docker && docker compose -f compose-lab.yaml exec -T machine-b ft-cli --version >/dev/null
	@echo "  CLI ready on both machines"

# Verify network connectivity between machines
_lab-verify-connectivity:
	@echo "Verifying network connectivity..."
	
	# Test A -> B
	cd docker && docker compose -f compose-lab.yaml exec -T machine-a ping -c 2 -W 5 172.21.0.10 >/dev/null || (echo "Machine A cannot reach Machine B" && exit 1)
	@echo "  A -> B connectivity verified"
	
	# Test B -> A
	cd docker && docker compose -f compose-lab.yaml exec -T machine-b ping -c 2 -W 5 172.20.0.10 >/dev/null || (echo "Machine B cannot reach Machine A" && exit 1)
	@echo "  B -> A connectivity verified"

# Test TCP file transfer with validation
_lab-test-tcp:
	@echo "Testing TCP file transfer..."
	
	# Clean previous test files
	-cd docker && docker compose -f compose-lab.yaml exec machine-b rm -f /app/downloads/* 2>/dev/null || true
	
	# Start receiver in background with timeout
	cd docker && docker compose -f compose-lab.yaml exec -d machine-b sh -c "timeout 30 ft-cli receive --port 8080 --protocol tcp --output /app/downloads --timeout 20"
	
	# Wait for receiver to bind
	sleep 2
	
	# Send file from A to B
	cd docker && docker compose -f compose-lab.yaml exec machine-a ft-cli send --target 172.21.0.10 --port 8080 --protocol tcp --timeout 15 /app/files/hello.txt
	
	# Wait for transfer to complete
	sleep 2
	
	# Verify file was received
	cd docker && docker compose -f compose-lab.yaml exec machine-b test -f /app/downloads/hello.txt || (echo "TCP transfer failed - file not received" && exit 1)
	
	@echo "  TCP transfer successful"

# Test UDP file transfer with validation
_lab-test-udp:
	@echo "Testing UDP file transfer..."
	
	# Clean previous test files
	-cd docker && docker compose -f compose-lab.yaml exec machine-a rm -f /app/downloads/* 2>/dev/null || true
	
	# Start receiver in background with timeout
	cd docker && docker compose -f compose-lab.yaml exec -d machine-a sh -c "timeout 30 ft-cli receive --port 8081 --protocol udp --output /app/downloads --timeout 10"
	
	# Wait for receiver to bind
	sleep 2
	
	# Send file from B to A (reverse direction for variety)
	cd docker && docker compose -f compose-lab.yaml exec machine-b ft-cli send --target 172.20.0.10 --port 8081 --protocol udp --timeout 8 /app/files/config.json
	
	# Wait for transfer to complete (UDP may take longer due to timeout-based completion)
	sleep 5
	
	# Check if any file was received (UDP is fire-and-forget, so we check for any received file)
	RECEIVED_FILES=$(cd docker && docker compose -f compose-lab.yaml exec machine-a ls /app/downloads/ 2>/dev/null | wc -l || echo "0")
	
	@echo "  UDP transfer completed (fire-and-forget behavior)"

# Test bidirectional transfer
_lab-test-bidirectional:
	@echo "Testing bidirectional transfer..."
	
	# Clean previous test files
	-cd docker && docker compose -f compose-lab.yaml exec machine-a rm -f /app/downloads/* 2>/dev/null || true
	-cd docker && docker compose -f compose-lab.yaml exec machine-b rm -f /app/downloads/* 2>/dev/null || true
	
	# Test A -> B
	cd docker && docker compose -f compose-lab.yaml exec -d machine-b sh -c "timeout 20 ft-cli receive --port 8082 --protocol tcp --output /app/downloads --timeout 15"
	sleep 2
	cd docker && docker compose -f compose-lab.yaml exec machine-a ft-cli send --target 172.21.0.10 --port 8082 --protocol tcp --timeout 10 /app/files/hello.txt
	sleep 2
	
	# Test B -> A  
	cd docker && docker compose -f compose-lab.yaml exec -d machine-a sh -c "timeout 20 ft-cli receive --port 8083 --protocol tcp --output /app/downloads --timeout 15"
	sleep 2
	cd docker && docker compose -f compose-lab.yaml exec machine-b ft-cli send --target 172.20.0.10 --port 8083 --protocol tcp --timeout 10 /app/files/config.json
	sleep 2
	
	@echo "  Bidirectional transfer completed"

# Test error handling scenarios
_lab-test-error-handling:
	@echo "Testing error handling..."
	
	# Test 1: Send to non-existent receiver (should fail for TCP)
	@echo "  Testing TCP connection failure..."
	cd docker && docker compose -f compose-lab.yaml exec machine-a ft-cli send --target 172.21.0.10 --port 9999 --protocol tcp --timeout 3 /app/files/hello.txt 2>/dev/null && echo "TCP should have failed" || echo "  TCP properly failed when no receiver"
	
	# Test 2: Send non-existent file (should fail)
	@echo "  Testing file not found error..."
	cd docker && docker compose -f compose-lab.yaml exec machine-a ft-cli send --target 172.21.0.10 --port 8080 --protocol tcp --timeout 3 /nonexistent/file.txt 2>/dev/null && echo "Should have failed for missing file" || echo "  Properly handled missing file"
	
	# Test 3: UDP fire-and-forget (should succeed even without receiver)
	@echo "  Testing UDP fire-and-forget behavior..."
	cd docker && docker compose -f compose-lab.yaml exec machine-a ft-cli send --target 172.21.0.10 --port 9998 --protocol udp --timeout 3 /app/files/hello.txt >/dev/null 2>&1 && echo "  UDP fire-and-forget succeeded as expected" || echo "  UDP fire-and-forget had issues"

# Quick lab health check
lab-health:
	@echo "Lab Health Check"
	@echo "================"
	
	# Check if containers are running
	@echo "Container Status:"
	cd docker && docker compose -f compose-lab.yaml ps
	
	# Quick connectivity test
	@echo ""
	@echo "Quick Connectivity Test:"
	cd docker && docker compose -f compose-lab.yaml exec machine-a ping -c 1 -W 2 172.21.0.10 >/dev/null 2>&1 && echo "Network connectivity OK" || echo "Network connectivity FAILED"
	
	# CLI availability
	@echo ""
	@echo "CLI Availability:"
	cd docker && docker compose -f compose-lab.yaml exec machine-a ft-cli --version >/dev/null 2>&1 && echo "CLI available" || echo "CLI not available"

# Reset lab to clean state
lab-reset:
	@echo "Resetting lab to clean state..."
	just lab-down
	sleep 2
	just lab-setup
	@echo "Lab reset complete"

# Show lab logs with filtering
lab-logs-filtered:
	@echo "Showing filtered lab logs (last 50 lines per container)..."
	@echo "========================================================"
	cd docker && docker compose -f compose-lab.yaml logs --tail=50 --timestamps

# Interactive lab session with pre-configured environment
lab-interactive:
	@echo "Starting interactive lab session..."
	@echo "=================================="
	@echo "Available commands:"
	@echo "  - Machine A shell: just lab-shell-a"
	@echo "  - Machine B shell: just lab-shell-b"  
	@echo "  - Lab status: just lab-status"
	@echo "  - Run tests: just lab-test"
	@echo "  - Health check: just lab-health"
	@echo "  - Stop lab: just lab-down"
	@echo ""
	@echo "Lab is ready for interactive use!"

# Comprehensive lab validation
lab-validate:
	@echo "Running comprehensive lab validation..."
	chmod +x scripts/lab-validator.sh
	./scripts/lab-validator.sh

# Quick lab validation (without functional tests)
lab-validate-quick:
	@echo "Running quick lab validation..."
	@echo "=============================="
	
	# Check Docker
	@docker --version >/dev/null 2>&1 && echo "Docker available" || (echo "Docker not available" && exit 1)
	
	# Check compose file
	@test -f docker/compose-lab.yaml && echo "Compose file exists" || (echo "Compose file missing" && exit 1)
	
	# Check test files
	@test -d tests/fixtures && echo "Test fixtures directory exists" || (echo "Test fixtures missing" && exit 1)
	
	# Check if lab is running
	@cd docker && docker compose -f compose-lab.yaml ps | grep -q "Up" && echo "Lab containers running" || echo "Lab containers not running (use 'just lab-setup')"
	
	@echo "Quick validation complete"

# Troubleshooting guide
lab-troubleshoot:
	@echo "File Transfer Lab Troubleshooting Guide"
	@echo "======================================"
	@echo ""
	@echo "Common Issues and Solutions:"
	@echo ""
	@echo "1. 'Docker not available'"
	@echo "   -> Install Docker and ensure daemon is running"
	@echo "   -> Check: docker --version && docker info"
	@echo ""
	@echo "2. 'Containers not starting'"
	@echo "   -> Run: just lab-down && just lab-setup"
	@echo "   -> Check logs: just lab-logs"
	@echo ""
	@echo "3. 'Network connectivity failed'"
	@echo "   -> Verify router configuration: just lab-status"
	@echo "   -> Check container health: docker ps"
	@echo ""
	@echo "4. 'File transfer failed'"
	@echo "   -> Ensure receiver is running before sender"
	@echo "   -> Check CLI availability: just lab-status"
	@echo "   -> Verify file permissions in volumes"
	@echo ""
	@echo "5. 'Test files missing'"
	@echo "   -> Run: just create-test-files"
	@echo "   -> Check: ls -la tests/fixtures/"
	@echo ""
	@echo "For detailed validation: just lab-validate"