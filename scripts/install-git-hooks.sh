#!/usr/bin/env bash
# Installiert lokale Git-Hooks (gitleaks Pre-Commit) für MasterMind.
# WARUM: verhindert, dass Secrets überhaupt erst in einen Commit gelangen —
# die günstigste Stelle, ein Leak zu stoppen (vor Push, vor CI, vor Prod).
#
# Nutzung (einmalig pro Klon):  bash scripts/install-git-hooks.sh
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK_DIR="$REPO_DIR/.git/hooks"

if [[ ! -d "$HOOK_DIR" ]]; then echo "Kein .git/hooks — im Repo-Root ausführen." >&2; exit 1; fi

cat > "$HOOK_DIR/pre-commit" <<'HOOK'
#!/usr/bin/env bash
# Auto-installiert von scripts/install-git-hooks.sh
set -euo pipefail

if command -v gitleaks >/dev/null 2>&1; then
  echo "🔍 gitleaks: prüfe Staging auf Secrets…"
  if ! gitleaks protect --staged --redact --config .gitleaks.toml; then
    echo "✖ gitleaks hat ein mögliches Secret gefunden — Commit abgebrochen."
    echo "  Prüfe die Meldung. Falsch-Positiv? In .gitleaks.toml allowlisten."
    exit 1
  fi
else
  echo "⚠ gitleaks nicht installiert — Secret-Scan übersprungen."
  echo "  Installieren: https://github.com/gitleaks/gitleaks (empfohlen!)"
fi
HOOK

chmod +x "$HOOK_DIR/pre-commit"
echo "✓ Pre-Commit-Hook installiert ($HOOK_DIR/pre-commit)"
echo "  Voraussetzung: gitleaks lokal installiert (brew install gitleaks / choco install gitleaks)."
