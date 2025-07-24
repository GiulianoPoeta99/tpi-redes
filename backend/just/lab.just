# Setup lab with two isolated networks (simulates internet)
lab-setup: create-test-files docker-build
    mkdir -p docker/volumes/lab/machine-a docker/volumes/lab/machine-b
    cd docker && USER_ID=$(id -u) GROUP_ID=$(id -g) docker compose -f compose-lab.yaml up -d
    @echo "Lab environment ready!"
    @echo "Machine A: 172.20.0.10 (network-a)"
    @echo "Machine B: 172.21.0.10 (network-b)"
    @echo "Use 'just lab-shell-a' and 'just lab-shell-b' to access machines"

# Stop lab environment and cleanup
lab-down:
    cd docker && docker compose -f compose-lab.yaml down

# Open shell in Machine A (192.168.1.10)
lab-shell-a:
    cd docker && docker compose -f compose-lab.yaml exec machine-a /bin/bash

# Open shell in Machine B (192.168.2.10)
lab-shell-b:
    cd docker && docker compose -f compose-lab.yaml exec machine-b /bin/bash

# Test file transfer between isolated networks
lab-test: lab-setup
    @echo "Testing file transfer between isolated networks..."
    sleep 3
    # Start receiver on machine B
    cd docker && docker compose -f compose-lab.yaml exec -d machine-b ft-cli receive --port 8080 --output /app/downloads
    sleep 2
    # Send file from machine A to machine B
    cd docker && docker compose -f compose-lab.yaml exec machine-a ft-cli send --target 172.21.0.10 --port 8080 /app/files/hello.txt
    sleep 2
    # Check if file was received
    @echo "Checking received files on Machine B:"
    cd docker && docker compose -f compose-lab.yaml exec machine-b ls -la /app/downloads/
    @echo "Lab test complete!"

# Follow logs from all lab containers
lab-logs:
    cd docker && docker compose -f compose-lab.yaml logs -f

# Show lab status and network connectivity
lab-status:
    @echo "Lab Environment Status:"
    cd docker && docker compose -f compose-lab.yaml ps
    @echo ""
    @echo "Network connectivity test:"
    cd docker && docker compose -f compose-lab.yaml exec machine-a ping -c 2 172.21.0.10 || echo "Networks are isolated as expected"