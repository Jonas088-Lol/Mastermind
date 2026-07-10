# Auto-Deployment (CI/CD)

Bei jedem `git push` auf `master` deployt GitHub automatisch auf den Server —
kein manuelles `git pull` / `docker rebuild` mehr. Auch manuell auslösbar:
GitHub → Tab **Actions** → **Deploy to Server** → **Run workflow**.

**Fail-safe:** Schlägt der Docker-Build fehl, laufen die alten Container weiter.
Die Live-App geht durch einen kaputten Build nie offline.

## Einmalige Einrichtung (4 GitHub-Secrets)

### 1. Deploy-Schlüssel (einmalig erzeugt)
Ein eigener SSH-Schlüssel nur für GitHub → Server (nicht dein persönlicher).
Er wurde bereits erzeugt:
- **Öffentlicher Teil** → muss auf den Server (siehe Schritt 2).
- **Privater Teil** → kommt als GitHub-Secret `DEPLOY_SSH_KEY` (siehe Schritt 3).

### 2. Öffentlichen Schlüssel auf den Server
Auf dem Server einmalig (den öffentlichen Deploy-Key an authorized_keys hängen):
```bash
echo "ÖFFENTLICHER_DEPLOY_KEY" >> ~/.ssh/authorized_keys
```
(Den genauen Key-Text bekommst du beim Erzeugen ausgegeben.)

### 3. Secrets in GitHub eintragen
Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Vier Stück anlegen:

| Name | Wert |
|---|---|
| `DEPLOY_HOST` | Server-IP, z. B. `87.237.53.143` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | kompletter **privater** Deploy-Schlüssel (mehrzeilig, inkl. `-----BEGIN…` / `-----END…`) |
| `DEPLOY_PATH` | Repo-Pfad auf dem Server, z. B. `/root/Mastermind` |

### 4. Git-Auth auf dem Server
Das Deploy-Skript macht `git pull` — dafür muss das Remote auf dem Server mit
Token gesetzt sein (einmalig):
```bash
cd /root/Mastermind
git remote set-url origin https://DEIN_GITHUB_TOKEN@github.com/Jonas088-Lol/Mastermind.git
```

## Fertig
Danach: `git push` → Action läuft → Server aktualisiert sich selbst. Fortschritt
live im **Actions**-Tab. Beim Hetzner-Umzug nur `DEPLOY_HOST` (+ ggf. `DEPLOY_PATH`)
auf den neuen Server ändern.
