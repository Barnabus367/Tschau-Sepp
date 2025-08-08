# Tschau Sepp - Online Multiplayer

## 🎮 Über das Spiel
Tschau Sepp ist die schweizerische Variante von Mau-Mau/UNO, gespielt mit traditionellen Schweizer Jass-Karten. Jetzt mit Online-Multiplayer-Unterstützung!

## 🚀 Installation & Start

### Voraussetzungen
- Python 3.11 oder höher
- pip (Python Package Manager)

### Installation

1. **Dependencies installieren:**
```bash
pip install -r requirements.txt
```

2. **Server starten:**
```bash
python run_server.py
```

oder direkt:
```bash
python game_server.py
```

3. **Browser öffnen:**
Navigiere zu `http://localhost:5000`

## 🎯 Spielanleitung

### Raum erstellen & beitreten
1. Gib deinen Spielernamen ein
2. **Neuen Raum erstellen:** Klicke auf "Neuen Raum erstellen"
3. **Raum beitreten:** Gib den 6-stelligen Raum-Code ein und klicke "Beitreten"
4. Teile den Raum-Code mit deinem Freund
5. Sobald 2 Spieler im Raum sind, kann das Spiel gestartet werden

### Spielregeln
- **Ziel:** Alle Karten ablegen und "Tschau" (1 Karte) bzw. "Sepp" (0 Karten) rufen
- **Karten legen:** Gleiche Farbe oder gleicher Wert wie die oberste Karte
- **Spezialkarten:**
  - **7:** Nächster Spieler zieht 2 Karten
  - **8:** Nächster Spieler setzt aus
  - **Bube (U):** Neue Farbe wählen
  - **Ober Rose:** Nächster Spieler zieht 4 Karten
  - **Ass:** Muss mit gleicher Farbe oder Ass gedeckt werden

## 🔧 Technische Details

### Architektur
- **Backend:** Flask mit Flask-SocketIO für WebSocket-Kommunikation
- **Frontend:** Vanilla JavaScript mit Socket.IO Client
- **Spiellogik:** Server-autoritativ (verhindert Cheating)
- **State Management:** In-Memory (kann auf Redis erweitert werden)

### Projektstruktur
```
/
├── game_server.py       # WebSocket Server
├── game_logic.py        # Spiellogik
├── run_server.py        # Startup-Script
├── requirements.txt     # Python Dependencies
├── static/
│   ├── js/
│   │   ├── multiplayer.js      # WebSocket Client
│   │   └── game-multiplayer.js # Game UI mit Multiplayer
│   ├── css/             # Styles
│   └── images/          # Kartenbilder
└── templates/
    └── index.html       # Haupt-HTML mit Lobby
```

### Features
- ✅ Online Multiplayer (2 Spieler)
- ✅ Raum-System mit Codes
- ✅ Server-seitige Spiellogik
- ✅ Echtzeit-Synchronisation
- ✅ Automatische Reconnection
- ✅ Responsive Design
- ✅ Schweizer Jass-Karten

### Geplante Erweiterungen
- [ ] KI-Gegner für Einzelspieler
- [ ] Mehr als 2 Spieler
- [ ] Turniere & Ranglisten
- [ ] Chat-Funktion
- [ ] Sound-Effekte
- [ ] Persistente Spielstände

## 🐛 Fehlerbehebung

### Server startet nicht
- Stelle sicher, dass Port 5000 frei ist
- Prüfe, ob alle Dependencies installiert sind: `pip install -r requirements.txt`

### Verbindungsprobleme
- Firewall-Einstellungen prüfen
- Browser-Console auf Fehler überprüfen (F12)
- Server-Logs im Terminal beachten

### Spiel reagiert nicht
- Seite neu laden (F5)
- Browser-Cache leeren
- Anderen Browser versuchen

## 📝 Entwicklung

### Lokales Testing
Für Tests mit 2 Spielern:
1. Server starten
2. Zwei Browser-Fenster/Tabs öffnen
3. In beiden zu `localhost:5000` navigieren
4. Raum erstellen und beitreten

### Debug-Modus
Der Server läuft standardmäßig im Debug-Modus. Für Produktion:
```python
socketio.run(app, debug=False)
```

## 📄 Lizenz
Dieses Projekt wurde als Lernprojekt entwickelt.

## 🤝 Beitragen
Pull Requests sind willkommen! Für größere Änderungen bitte erst ein Issue erstellen.