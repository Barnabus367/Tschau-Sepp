# 🎮 Tschau-Sepp - Schweizer Kartenspiel Online

Ein klassisches Schweizer Kartenspiel (ähnlich wie UNO/Mau-Mau) mit original Jass-Karten, jetzt als Online-Multiplayer-Spiel!

![Python](https://img.shields.io/badge/Python-3.11-blue)
![Flask](https://img.shields.io/badge/Flask-SocketIO-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 Features

- **Online Multiplayer** - Spiele mit Freunden über Raum-Codes
- **Schweizer Jass-Karten** - Authentische Grafiken mit Eichel, Rose, Schelle und Schilten
- **Spezialkarten** - 7 (2 ziehen), 8 (aussetzen), Bube (Farbe wünschen), Rose-Ober (4 ziehen), Ass
- **Mobile-optimiert** - Touch-Gesten und responsive Design
- **Sound-Effekte** - Synthetische Sounds ohne externe Dateien
- **Reconnection** - Automatische Wiederverbindung bei Verbindungsabbruch
- **Chat & Emotes** - Kommuniziere während des Spiels

## 🚀 Quick Start

### Lokal spielen

```bash
# Repository klonen
git clone https://github.com/yourusername/tschau-sepp.git
cd tschau-sepp

# Dependencies installieren
pip install -r requirements.txt

# Server starten
python game_server.py

# Browser öffnen
# http://localhost:5000
```

### Online spielen

🎮 **Live Demo**: [tschau-sepp.railway.app](https://tschau-sepp.railway.app) *(Beispiel-URL)*

## 📖 Spielregeln

### Grundregeln
- Jeder Spieler startet mit 7 Karten
- Karten müssen in Farbe oder Wert zur obersten Karte passen
- Bei nur noch 1 Karte: "Tschau" drücken
- Bei 0 Karten: "Sepp" drücken zum Gewinnen

### Spezialkarten
- **7**: Nächster Spieler zieht 2 Karten
- **8**: Nächster Spieler setzt aus  
- **Bube**: Neue Farbe wünschen
- **Rose-Ober**: Nächster Spieler zieht 4 Karten
- **Ass**: Muss mit gleicher Farbe oder Ass gedeckt werden

## 🛠️ Technologie

- **Backend**: Python Flask + SocketIO
- **Frontend**: JavaScript (Vanilla) + Bootstrap 5
- **Echtzeit**: WebSockets für Multiplayer
- **Sicherheit**: Rate Limiting, Input Sanitization

## 📱 Mobile Support

- Touch-Gesten (Tap, Swipe, Long-Press)
- Landscape-Modus optimiert
- iOS & Android kompatibel

## 🤝 Beitragen

Pull Requests sind willkommen! Für größere Änderungen bitte erst ein Issue öffnen.

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details

## 👥 Credits

Entwickelt mit ❤️ von David & Claude

---

**Viel Spass beim Spielen!** 🎉