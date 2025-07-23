# Create test directories and files
create-test-files:
    mkdir -p tmp/downloads/tcp tmp/downloads/udp
    # Test fixtures are now static in tests/fixtures/
    # Large test files are created in tmp/ as needed

# Clean download directories only
clean-downloads:
    rm -rf tmp/downloads/tcp/* tmp/downloads/udp/*

# Clean all temporary files
clean-temp:
    rm -rf tmp/*

# Clean lab volume files
clean-lab:
    rm -rf docker/volumes/lab/*

# Clean Cargo build artifacts
clean:
    cargo clean

# Clean everything (build + temp + downloads + lab)
clean-all: clean clean-downloads clean-temp clean-lab

# Update version in Cargo.toml for release
prepare-release version:
    @echo "Preparing backend release {{version}}..."
    sed -i 's/version = ".*"/version = "{{version}}"/' Cargo.toml
    @echo "Backend version updated to {{version}}"