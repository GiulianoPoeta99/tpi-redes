import socket
import json
import time
import threading
import logging

logger = logging.getLogger("tpi-redes")

DISCOVERY_PORT = 37020
BROADCAST_IP = "255.255.255.255"

class DiscoveryService:
    def __init__(self, hostname: str = None):
        self.hostname = hostname or socket.gethostname()
        self.running = False

    def scan(self, timeout: int = 2) -> list[dict]:
        """Sends a broadcast PING and returns a list of discovered peers."""
        discovered_peers = []
        
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            s.settimeout(timeout)
            
            message = json.dumps({"type": "PING", "hostname": self.hostname}).encode('utf-8')
            try:
                s.sendto(message, (BROADCAST_IP, DISCOVERY_PORT))
                logger.info("Sent Discovery PING...")
                
                start_time = time.time()
                while time.time() - start_time < timeout:
                    try:
                        data, addr = s.recvfrom(1024)
                        response = json.loads(data.decode('utf-8'))
                        
                        if response.get("type") == "PONG":
                            peer = {
                                "hostname": response.get("hostname"),
                                "ip": addr[0], # Use the IP from the packet source
                                "port": response.get("port", 8080) # Default or specified port
                            }
                            # Avoid duplicates
                            if not any(p['ip'] == peer['ip'] for p in discovered_peers):
                                discovered_peers.append(peer)
                                logger.info(f"Discovered peer: {peer['hostname']} ({peer['ip']})")
                    except socket.timeout:
                        break
                    except Exception:
                        continue
                        
            except Exception as e:
                logger.error(f"Discovery scan error: {e}")
                
        return discovered_peers

    def listen(self, port: int):
        """Listens for PING messages and responds with PONG."""
        self.running = True
        
        def _listen_loop():
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                # On Linux/Mac, SO_REUSEPORT might be needed if multiple apps listen on same port
                try:
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
                except AttributeError:
                    pass
                
                s.bind(("", DISCOVERY_PORT))
                logger.info(f"Discovery Service listening on UDP {DISCOVERY_PORT}")
                
                while self.running:
                    try:
                        data, addr = s.recvfrom(1024)
                        message = json.loads(data.decode('utf-8'))
                        
                        if message.get("type") == "PING":
                            logger.info(f"Received PING from {message.get('hostname')} ({addr[0]})")
                            
                            response = {
                                "type": "PONG",
                                "hostname": self.hostname,
                                "port": port
                            }
                            s.sendto(json.dumps(response).encode('utf-8'), addr)
                            
                    except Exception as e:
                        if self.running:
                            logger.error(f"Discovery listen error: {e}")

        threading.Thread(target=_listen_loop, daemon=True).start()

    def stop(self):
        self.running = False
