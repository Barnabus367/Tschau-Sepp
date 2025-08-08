#!/usr/bin/env python3
"""Development server starter for local testing"""

import os
import sys

# Set development environment
os.environ['DEBUG'] = 'True'
os.environ['PORT'] = '5001'  # Use different port for development

# Import and run the game server
from game_server import app, socketio

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🎮 Tschau-Sepp Development Server")
    print("="*50)
    print("\n📌 Server läuft auf: http://localhost:5001")
    print("📌 Öffne in 2 Browser-Fenstern zum Testen")
    print("📌 Drücke Ctrl+C zum Beenden\n")
    print("="*50 + "\n")
    
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)