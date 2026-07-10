"""Run the FastAPI app on an available local port."""

import socket

import uvicorn

from config import API_HOST, API_PORT


def _is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def _find_available_port(host: str, preferred_port: int, attempts: int = 50) -> int:
    for port in range(preferred_port, preferred_port + attempts):
        if _is_port_available(host, port):
            return port
    raise RuntimeError(
        f"No available TCP port found from {preferred_port} to "
        f"{preferred_port + attempts - 1}."
    )


if __name__ == "__main__":
    port = _find_available_port(API_HOST, API_PORT)
    if port != API_PORT:
        print(f"Port {API_PORT} is busy. Starting API on {API_HOST}:{port} instead.")
    else:
        print(f"Starting API on {API_HOST}:{port}.")
    uvicorn.run("api:app", host=API_HOST, port=port, reload=True)
