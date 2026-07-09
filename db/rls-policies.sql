-- ============================================================================
-- Row-Level Security (RLS) — Defense-in-Depth für MasterMind
-- ============================================================================
--
-- ⚠ WICHTIG — bitte vor dem Ausrollen lesen:
--
-- Dies ist eine SKIZZE / ein Muster, KEINE fertige Produktions-Migration.
-- RLS ist hier eine ZUSÄTZLICHE Verteidigungslinie unter der bereits
-- vorhandenen App-Autorisierung (getSession + schoolId/Owner-Checks) — nicht
-- ihr Ersatz.
--
-- Voraussetzung, damit RLS greift: Die App muss pro Request den aktuellen
-- Nutzer- und Schulkontext an die DB-Session übergeben. Prisma tut das NICHT
-- automatisch. Der Kontext wird über GUC-Variablen gesetzt, z.B.:
--
--   SELECT set_config('app.user_id',   $1, true);   -- true = nur diese Tx
--   SELECT set_config('app.school_id', $2, true);
--   SELECT set_config('app.role',      $3, true);
--
-- Das erfordert, jede App-Query in eine Transaktion zu wrappen, die zuerst
-- diese Werte setzt (Prisma: $transaction mit vorangestelltem $executeRaw,
-- oder eine Client-Extension). Solange dieser Mechanismus NICHT implementiert
-- ist, würde ein Aktivieren der Policies unten die App aussperren.
--
-- Empfohlene Reihenfolge:
--   1. Kontext-Injektion in der App bauen (Prisma-Extension).
--   2. Policies auf EINER unkritischen Tabelle testen.
--   3. Schrittweise auf sensible Tabellen ausweiten.
--
-- Die Rolle mm_app darf RLS NICHT umgehen dürfen (kein BYPASSRLS, kein Owner).
-- ============================================================================

\set ON_ERROR_STOP on

-- ── Hilfsfunktionen: Kontext aus GUC lesen ─────────────────────────────────
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.user_id', true) $$;

CREATE OR REPLACE FUNCTION app_current_school_id() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.school_id', true) $$;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.role', true) $$;

-- ── Beispiel 1: User sieht/ändert nur die eigene Zeile ─────────────────────
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_self_select ON "User";
CREATE POLICY user_self_select ON "User"
  FOR SELECT
  USING (
    id = app_current_user_id()
    -- Lehrkräfte/Admins der gleichen Schule dürfen Schüler ihrer Schule sehen
    OR ("schoolId" = app_current_school_id()
        AND app_current_role() IN ('teacher','admin','secretary','rector','vice_rector'))
  );

DROP POLICY IF EXISTS user_self_update ON "User";
CREATE POLICY user_self_update ON "User"
  FOR UPDATE
  USING (id = app_current_user_id())
  WITH CHECK (id = app_current_user_id());

-- ── Beispiel 2: Noten — Schüler sieht nur eigene, Lehrer nur eigene Schule ──
ALTER TABLE "Grade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grade" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grade_access ON "Grade";
CREATE POLICY grade_access ON "Grade"
  FOR SELECT
  USING (
    "studentId" = app_current_user_id()                 -- eigene Noten
    OR "teacherId" = app_current_user_id()              -- selbst vergeben
  );

-- Nur Lehrkräfte dürfen Noten schreiben (zusätzlich zur App-Prüfung)
DROP POLICY IF EXISTS grade_write ON "Grade";
CREATE POLICY grade_write ON "Grade"
  FOR INSERT
  WITH CHECK (
    "teacherId" = app_current_user_id()
    AND app_current_role() IN ('teacher','admin')
  );

-- ── Beispiel 3: Nachrichten — nur Teilnehmer ───────────────────────────────
ALTER TABLE "MessageParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageParticipant" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mp_self ON "MessageParticipant";
CREATE POLICY mp_self ON "MessageParticipant"
  FOR ALL
  USING ("userId" = app_current_user_id())
  WITH CHECK ("userId" = app_current_user_id());

-- ── Weitere Kandidaten (analog): Absence, Submission, DirectMessage,
--    ClassbookIncident, TeacherMeetingNote, ActivitySession, DriveFile.
--    Jeweils USING/WITH CHECK an studentId/userId/schoolId koppeln.
-- ============================================================================
