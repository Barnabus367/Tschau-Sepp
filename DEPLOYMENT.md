# 🚀 Tschau-Sepp Deployment Guide

## Schnellstart mit Railway (Empfohlen)

### 1. GitHub Repository erstellen
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-USERNAME/tschau-sepp.git
git push -u origin main
```

### 2. Railway Deployment
1. Gehe zu [railway.app](https://railway.app)
2. Klicke "Start a New Project"
3. Wähle "Deploy from GitHub repo"
4. Wähle dein Repository
5. Railway deployed automatisch!

### 3. Domain einrichten
- Railway gibt dir eine `.railway.app` Domain
- Oder verbinde deine eigene Domain in den Settings

## Alternative: Render.com

### 1. Account erstellen
- Registriere auf [render.com](https://render.com)

### 2. Web Service erstellen
```yaml
# render.yaml in deinem Repo
services:
  - type: web
    name: tschau-sepp
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python game_server.py
    envVars:
      - key: PORT
        value: 5000
```

### 3. Deploy
- Verbinde GitHub
- Render deployed bei jedem Push automatisch

## Production Checklist

### Vor dem Deployment:
- [ ] Environment Variables setzen
- [ ] DEBUG auf False setzen
- [ ] SECRET_KEY generieren
- [ ] CORS_ORIGINS auf deine Domain setzen

### Nach dem Deployment:
- [ ] WebSocket-Verbindung testen
- [ ] Multiplayer-Funktionalität prüfen
- [ ] SSL-Zertifikat aktiv?
- [ ] Rate Limiting funktioniert?

## Monitoring

### Logs überwachen
```bash
# Railway
railway logs

# Render
# Über Dashboard

# Eigener VPS
journalctl -u tschau-sepp -f
```

## Kosten-Übersicht

| Provider | Monatliche Kosten | Vorteile |
|----------|------------------|----------|
| Railway | $5-10 | Einfachstes Setup, Redis verfügbar |
| Render | $0-7 | Gratis-Tier verfügbar |
| DigitalOcean | $5+ | Sehr stabil |
| Hetzner VPS | €4+ | Günstig, EU-Server |
| fly.io | $5+ | Global verteilt |

## Skalierung

Wenn das Spiel populär wird:
1. Redis für Session-Storage hinzufügen
2. Load Balancer einrichten
3. Mehrere Worker-Prozesse
4. CDN für statische Assets

## Support

Bei Problemen:
- Check die Logs
- Stelle sicher dass PORT environment variable gesetzt ist
- WebSocket-Support beim Provider prüfen