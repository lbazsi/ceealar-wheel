"""A tiny, dependency-free host for CEEALAR lightning talks."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).parent / "static"))
    try:
        server = ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as error:
        parser.exit(1, f"Could not start noodles: {error}. Try noodles --port 8001\n")
    local_url = f"http://localhost:{server.server_port}"
    codespace = os.environ.get("CODESPACE_NAME")
    domain = os.environ.get("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
    url = f"https://{codespace}-{server.server_port}.{domain}" if codespace else local_url
    print(f"\n  CEEALAR / noodles\n  200 topics. One very good bad idea.\n\n  {url}\n  Local: {local_url}\n\n  Ctrl+C to close.\n", flush=True)
    if not args.no_browser and not codespace:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nSee you at the next talk.")
    finally:
        server.server_close()
