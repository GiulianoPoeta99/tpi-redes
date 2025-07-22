// Configuration validation utilities

/// Basic IP address validation - also allows hostnames for Docker/network environments
pub fn is_valid_ip_address(ip: &str) -> bool {
    use std::net::IpAddr;
    
    // Allow IP addresses
    if ip.parse::<IpAddr>().is_ok() {
        return true;
    }
    
    // Allow localhost
    if ip == "localhost" {
        return true;
    }
    
    // Allow valid hostnames (basic validation)
    // Hostnames can contain letters, numbers, hyphens, and dots
    if ip.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '.') && !ip.is_empty() {
        return true;
    }
    
    false
}