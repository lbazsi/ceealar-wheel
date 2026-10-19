"""Run with python -m unittest discover -s tests."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest
from urllib.request import urlopen

STATIC = Path(__file__).resolve().parents[1] / 'ceealar_wheel' / 'static'


class AppTests(unittest.TestCase):
    def test_topic_menu(self):
        topics = json.loads((STATIC / 'topics.json').read_text())
        self.assertEqual(len(topics), 200)
        self.assertEqual(len({t['id'] for t in topics}), 200)
        self.assertEqual(len({t['title'] for t in topics}), 200)
        self.assertEqual(sum(t['kind'] == 'knowledge' for t in topics), 140)
        self.assertEqual(sum(t['kind'] == 'chaos' for t in topics), 60)
        self.assertTrue(all(t['title'] and t['category'] for t in topics))

    def test_served_assets(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(STATIC)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for asset, content_type in [('', 'text/html'), ('app.js', 'javascript'), ('style.css', 'text/css'), ('topics.json', 'application/json'), ('ceealar-logo.png', 'image/png')]:
                with self.subTest(asset=asset), urlopen(f'http://127.0.0.1:{server.server_port}/{asset}') as response:
                    self.assertEqual(response.status, 200)
                    self.assertIn(content_type, response.headers['Content-Type'])
                    self.assertTrue(response.read())
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == '__main__':
    unittest.main()
