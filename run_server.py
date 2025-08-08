#!/usr/bin/env python3
"""
Tschau Sepp Multiplayer Server
Run this script to start the game server with WebSocket support
"""

import os
import sys
from game_server import app, socketio

if __name__ == '__main__':
    # Set environment variables if not set
    if 'SECRET_KEY' not in os.environ:
        os.environ['SECRET_KEY'] = 'tschau-sepp-dev-key-2024'
    
    print("=" * 50)
    print("🎮 Tschau Sepp Multiplayer Server")
    print("=" * 50)
    print("Server läuft auf: http://localhost:5000")
    print("Drücke Ctrl+C zum Beenden")
    print("=" * 50)
    
    try:
        # Run with eventlet for WebSocket support
        socketio.run(app, 
                    host='0.0.0.0', 
                    port=5000, 
                    debug=True,
                    use_reloader=True,
                    log_output=True)
    except KeyboardInterrupt:
        print("\n\nServer wird beendet...")
        sys.exit(0)