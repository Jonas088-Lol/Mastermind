-- ============================================================================
-- Least-Privilege-DB-Rollen für MasterMind (PostgreSQL)
-- ============================================================================
--
-- Ausgangslage: Die App verbindet sich aktuell als Owner-/Superuser
-- (POSTGRES_USER). Das ist bequem, aber verstößt gegen Least Privilege:
-- ein App-Bug oder eine Injection hätte volle DDL-/DROP-Rechte.
--
-- Ziel: drei getrennte Rollen.
--   1. mm_migrate  — DDL (Schema-Änderungen, `prisma db push`/`migrate`)
--   2. mm_app      — nur DML (SELECT/INSERT/UPDATE/DELETE), kein DROP/ALTER
--   3. mm_readonly — nur SELECT (Analytics/BI, read-only Reporting)
--
-- Anwendung (als Superuser gegen die Ziel-DB):
--   psql "$SUPERUSER_URL" -v app_pw="'...'" -v migrate_pw="'...'" -v ro_pw="'...'" -f db/roles.sql
--
-- Danach in der App DATABASE_URL auf mm_app umstellen und für Migrationen
-- eine separate MIGRATE_DATABASE_URL (mm_migrate) verwenden.
--
-- ⚠ Passwörter NICHT hier eintragen — via psql -v Variablen übergeben.
-- ============================================================================

\set ON_ERROR_STOP on

-- ── Rollen anlegen (idempotent) ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mm_migrate') THEN
    CREATE ROLE mm_migrate LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mm_app') THEN
    CREATE ROLE mm_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mm_readonly') THEN
    CREATE ROLE mm_readonly LOGIN;
  END IF;
END
$$;

-- Passwörter setzen (aus psql -v Variablen)
ALTER ROLE mm_migrate  WITH PASSWORD :migrate_pw;
ALTER ROLE mm_app      WITH PASSWORD :app_pw;
ALTER ROLE mm_readonly WITH PASSWORD :ro_pw;

-- Keine Superuser-/Createrole-/Createdb-Rechte
ALTER ROLE mm_migrate  NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER ROLE mm_app      NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER ROLE mm_readonly NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- ── Datenbank-/Schema-Zugriff ──────────────────────────────────────────────
-- (Datenbank heißt i.d.R. "mastermind"; Schema "public")
GRANT CONNECT ON DATABASE mastermind TO mm_migrate, mm_app, mm_readonly;
GRANT USAGE  ON SCHEMA public         TO mm_app, mm_readonly;

-- mm_migrate: volle Schema-Hoheit (DDL). Prisma braucht CREATE im Schema.
GRANT USAGE, CREATE ON SCHEMA public TO mm_migrate;
ALTER ROLE mm_migrate SET search_path = public;

-- ── mm_app: nur DML auf bestehende Tabellen ────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO mm_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES  IN SCHEMA public TO mm_app;

-- ── mm_readonly: nur SELECT ────────────────────────────────────────────────
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mm_readonly;

-- ── Default-Privilegien für künftige Tabellen ──────────────────────────────
-- Objekte, die mm_migrate künftig anlegt, sollen automatisch die richtigen
-- Rechte an mm_app / mm_readonly vergeben.
ALTER DEFAULT PRIVILEGES FOR ROLE mm_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE mm_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO mm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE mm_migrate IN SCHEMA public
  GRANT SELECT ON TABLES TO mm_readonly;

-- Falls das aktuelle Schema noch vom alten Owner (POSTGRES_USER) stammt:
-- Damit ALTER DEFAULT PRIVILEGES auch für dessen künftige Objekte greift,
-- diesen Block mit dem echten Owner-Namen ausführen (hier :owner):
-- ALTER DEFAULT PRIVILEGES FOR ROLE :owner IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mm_app;

-- ── Absicherung: mm_app darf kein Schema verändern ─────────────────────────
REVOKE CREATE ON SCHEMA public FROM mm_app, mm_readonly;

-- ── Audit-Log wirklich append-only machen ──────────────────────────────────
-- Der Audit-Trail (AuditLog) darf nur INSERTs annehmen. UPDATE/DELETE werden
-- auf DB-Ebene blockiert (Trigger), damit auch ein kompromittierter App-User
-- Einträge nicht nachträglich fälschen oder löschen kann.
CREATE OR REPLACE FUNCTION deny_audit_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog ist append-only: % nicht erlaubt', TG_OP;
END
$$;

DROP TRIGGER IF EXISTS audit_no_update ON "AuditLog";
DROP TRIGGER IF EXISTS audit_no_delete ON "AuditLog";
CREATE TRIGGER audit_no_update BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
CREATE TRIGGER audit_no_delete BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();

-- Zusätzlich: mm_app erhält für AuditLog nur INSERT + SELECT (kein UPDATE/DELETE).
REVOKE UPDATE, DELETE ON "AuditLog" FROM mm_app;

-- Hinweis: Retention (Löschen ALTER Audit-Einträge nach Ablauf) muss dann über
-- eine privilegierte Wartungsrolle laufen, die den Trigger temporär umgeht —
-- bewusst NICHT dem App-User erlaubt.
