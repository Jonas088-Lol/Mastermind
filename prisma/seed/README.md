<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# Curriculum Seed

## What it seeds

| Record type | Count | Source |
|---|---|---|
| Bundesländer | 16 | German states, by official 2-letter code |
| Landkreise (Bayern) | 96 | 25 kreisfreie Städte + 71 Landkreise (LfStat) |
| Landkreise (other states) | 15 | 1 stub per state, enough for dev/test |
| CurriculumSubjects | 17 | Mathematik, Deutsch, Englisch, Physik, Chemie, Biologie, Geschichte, Geographie, Informatik, Latein, Französisch, Sport, Religion, Kunst, Musik, Wirtschaft, Sozialkunde |
| Curriculum entries (BY Gymnasium) | ~85 | Grades 5–12, each subject with Wochenstunden + isWahlpflicht |
| TreeNodes (hub + tiers) | varies | 1 hub + 6 tiers × 9 main subjects + 4 tiers × 8 short subjects per run |
| TreeQuests per node | 2 | Mixed quest types (EXERCISES, FLASHCARDS, BOSS_FIGHT, PPTX, QUIZ, STREAK, WORKSHEET) |

## Running the seed

```bash
# Development (SQLite)
npx ts-node --project tsconfig.json prisma/seed/curriculum-seed.ts

# Production (PostgreSQL) — run after db push
DATABASE_URL="postgresql://..." npx ts-node --project tsconfig.json prisma/seed/curriculum-seed.ts
```

Or via prisma seed hook (if wired in package.json):
```bash
npx prisma db seed
```

## How subject tiers work

Each `CurriculumSubject` has a fixed set of `TreeNode` tiers defined in `curriculum-seed.ts`:
- **Main subjects** (Mathe, Deutsch, Englisch, Physik, Chemie, Bio, Geschichte, Geo, Informatik): **6 tiers**
- **Short subjects** (Latein, Französisch, Sport, Religion, Kunst, Musik, Wirtschaft, Sozialkunde): **4 tiers**

Each tier has 2 quests. Node progression: `AVAILABLE → IN_PROGRESS → MASTERED` once `questsDone >= questsNeeded` (i.e., 2 quests).

The daily cap is **3 quest completions per day** toward tree progress (`DailyActivity.treeProgressPts`), enforcing ≥ 80 learning days across the full tree.

## Adding a new Bundesland (full curriculum)

1. **Add Landkreise** to `curriculum-seed.ts`:
   ```ts
   { id: "HH-001", name: "Hamburg-Mitte", bundeslandCode: "HH" },
   // ... add all Landkreise for your state
   ```

2. **Add Curriculum entries** for your state + Schulart + grade range:
   ```ts
   // In the Curriculum section, add entries like:
   { bundeslandCode: "HH", schulart: "GYMNASIUM", jahrgangsstufe: 5, subjectKey: "mathematik", wochenstunden: 5 },
   // ... repeat for each grade + subject combination
   ```

3. **Update `SCHULARTEN_BY_BUNDESLAND`** in `src/lib/curriculum.ts` to list available Schularten for the new state.

4. **Re-run the seed** (idempotent — uses `upsert` throughout).

## Idempotency

The seed uses `upsert` for all records. Running it multiple times is safe. TreeNode/TreeQuest creation uses the `slug` as unique key:
- Hub slug: `"hub"`
- Subject tier slugs: `"<subjectKey>-t<tier>"` (e.g., `"mathematik-t1"`)
- Quest slugs: `"<nodeSlug>-q<questIndex>"` (e.g., `"mathematik-t1-q0"`)

## Schema models involved

```
Bundesland ← Landkreis
           ← User (bundeslandCode)
CurriculumSubject ← Curriculum (BY_GYM entries)
                  ← TreeNode (subjectId)
TreeNode ← TreeNodePrereq (prerequisites DAG)
         ← TreeQuest
         ← UserTreeProgress
TreeQuest ← UserTreeQuest
DailyActivity (daily cap enforcement)
```
