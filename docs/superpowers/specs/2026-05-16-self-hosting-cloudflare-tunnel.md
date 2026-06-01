# Self-Hosting via Cloudflare Tunnel

**Datum:** 2026-05-16  
**Status:** Approved

## Ziel

Die Mastermind Next.js-App soll dauerhaft auf dem eigenen PC laufen und über eine Porkbun-Domain öffentlich erreichbar sein — ohne Router-Zugriff, mit automatischem HTTPS.

## Architektur

```
Internet → Cloudflare Edge → cloudflared Tunnel → localhost:3000 (Next.js)
                                                         ↓
                                                   SQLite DB (lokal)
```

## Komponenten

### Cloudflare (DNS + Tunnel)
- Domain von Porkbun: Nameserver auf Cloudflare umstellen
- Cloudflare Tunnel (kostenlos) verbindet die Domain mit `localhost:3000`
- HTTPS automatisch durch Cloudflare, kein manuelles Zertifikat nötig

### Next.js (Production)
- `npm run build` + `npm start` auf Port 3000
- Kein dev-Modus in Produktion

### PM2 (Prozess-Manager)
- Hält Next.js am Laufen wenn Terminal geschlossen wird
- Autostart bei PC-Neustart via `pm2 startup`

### Datenbank
- SQLite bleibt lokal (kein externer DB-Server nötig)
- Fester absoluter Pfad: `/home/jonass/Development/mastermind/prisma/prod.db`
- `DATABASE_URL=file:/home/jonass/Development/mastermind/prisma/prod.db`

### Umgebungsvariablen
- `.env.production.local` mit allen API-Keys (Stripe, Upstash, etc.)

### cloudflared (Tunnel-Daemon)
- Bereits installiert
- Wird als systemd-Service eingerichtet für Autostart

## Umsetzungsschritte

1. Cloudflare-Account + Domain einrichten (Nameserver bei Porkbun umstellen)
2. `.env.production.local` mit allen Keys befüllen
3. Prisma-Migration auf prod.db ausführen
4. App bauen (`npm run build`)
5. PM2 konfigurieren + starten
6. Cloudflare Tunnel erstellen und mit Domain verbinden
7. Autostart für PM2 + cloudflared (systemd)

## Voraussetzungen (bereits erledigt)
- PM2 installiert
- cloudflared installiert
