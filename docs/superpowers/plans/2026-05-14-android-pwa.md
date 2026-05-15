# Android PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every area of the MasterMind Next.js app fully usable as an installed PWA on Android — proper viewport, safe-area support, 44px touch targets, and mobile bottom-navigation for the five currently navigation-free sections (admin, sekretariat, rektor, schulträger, plattform).

**Architecture:** Pure PWA enhancement on the existing Next.js 15 App Router codebase. No new dependencies. The existing `BottomNav` and `Sidebar` components (already used in /app, /teach, /eltern) are extended with new icon entries and reused in the five missing sections. Touch targets are increased globally via the shared `button.tsx` and `input.tsx` UI components.

**Tech Stack:** Next.js 15 App Router · Tailwind CSS · lucide-react · existing `BottomNav` + `Sidebar` components

---

## File Map

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Add `viewportFit: "cover"` to Viewport export |
| `src/app/manifest.ts` | Add `id: "/"`, fix duplicate icon src |
| `public/sw.js` | Fix push notification icon path |
| `src/app/globals.css` | Add safe-area utility classes for standalone mode |
| `src/components/app/AppHeader.tsx` | Add `safe-top` class to header element |
| `src/components/ui/button.tsx` | Increase sm/md/icon sizes to meet 44px minimum |
| `src/components/ui/input.tsx` | Increase height from h-10 to h-11 |
| `src/components/app/BottomNav.tsx` | Add 7 new icons, increase label font to 11px |
| `src/components/app/Sidebar.tsx` | Add `barChart3` and `building2` icons |
| `src/app/admin/layout.tsx` | Full restructure: add Sidebar + BottomNav |
| `src/app/sekretariat/layout.tsx` | Add BottomNav + pb-24 to main |
| `src/app/rektor/layout.tsx` | Add BottomNav + pb-24 to main |
| `src/app/schultraeger/layout.tsx` | Add BottomNav + pb-24 to main |
| `src/app/plattform/layout.tsx` | Add Sidebar + BottomNav |

---

### Task 1: PWA Foundation — viewport, manifest, SW icon fix

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/manifest.ts`
- Modify: `public/sw.js`

- [ ] **Step 1: Add viewportFit to layout.tsx**

Open `src/app/layout.tsx`. The `viewport` export currently reads:

```ts
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};
```

Replace with:

```ts
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};
```

- [ ] **Step 2: Fix manifest.ts**

Open `src/app/manifest.ts`. Replace the entire file with:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MasterMind — Eine Plattform für Schule",
    short_name: "MasterMind",
    description:
      "Lernen, Verwaltung und KI in einer Plattform. DSGVO-konform aus Deutschland.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1117",
    theme_color: "#0d1117",
    lang: "de-DE",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Aufgaben",
        short_name: "Aufgaben",
        description: "Offene Aufgaben ansehen",
        url: "/app/aufgaben",
      },
      {
        name: "Karteikarten",
        short_name: "Karten",
        description: "Heute fällige Karten lernen",
        url: "/app/karteikarten",
      },
      {
        name: "Stundenplan",
        short_name: "Plan",
        description: "Wochenstundenplan ansehen",
        url: "/app/plan",
      },
      {
        name: "KI-Tutor",
        short_name: "Tutor",
        description: "Frage stellen",
        url: "/app/tutor",
      },
    ],
  };
}
```

- [ ] **Step 3: Fix SW push notification icon**

Open `public/sw.js`. Find the `push` event handler — it contains a line like:

```js
icon: '/icon-192.png',
```

Change it to:

```js
icon: '/icon',
```

(The `/icon` dynamic route is already precached by the SW and works for notification icons.)

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/manifest.ts public/sw.js
git commit -m "pwa: add viewportFit=cover, fix manifest id and SW icon path"
```

---

### Task 2: Safe-Area CSS + AppHeader standalone padding

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/app/AppHeader.tsx`

- [ ] **Step 1: Add safe-area utilities to globals.css**

Open `src/app/globals.css`. Append after the last line (after the `@media (prefers-reduced-motion)` block at line 198):

```css

/* ── Safe area — PWA standalone mode ────────────────────────── */
@supports (padding-top: env(safe-area-inset-top)) {
  @media all and (display-mode: standalone) {
    .safe-top {
      padding-top: env(safe-area-inset-top);
    }
    .safe-sides {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }
}
```

- [ ] **Step 2: Apply safe-top to AppHeader**

Open `src/components/app/AppHeader.tsx`. The header element currently is:

```tsx
<header className="flex h-16 items-center gap-4 border-b border-border bg-bg/85 px-6 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
```

Change to:

```tsx
<header className="safe-top flex h-16 items-center gap-4 border-b border-border bg-bg/85 px-6 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/components/app/AppHeader.tsx
git commit -m "pwa: add safe-area CSS utilities and apply to AppHeader"
```

---

### Task 3: Touch targets — button and input

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/input.tsx`

- [ ] **Step 1: Increase button touch targets**

Open `src/components/ui/button.tsx`. The `size` variants currently read:

```ts
size: {
  sm:   "h-8 px-3 text-xs",
  md:   "h-10 px-5",
  lg:   "h-12 px-6 text-base",
  icon: "h-10 w-10",
},
```

Change to:

```ts
size: {
  sm:   "h-9 px-3 text-xs",
  md:   "h-11 px-5",
  lg:   "h-12 px-6 text-base",
  icon: "h-11 w-11",
},
```

(44px = `h-11` in Tailwind's default 4px scale.)

- [ ] **Step 2: Increase input height**

Open `src/components/ui/input.tsx`. The className string contains `"h-10 w-full border …"`. Change `h-10` to `h-11`:

```tsx
className={cn(
  "h-11 w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors",
  "placeholder:text-muted-fg",
  "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
  "disabled:cursor-not-allowed disabled:opacity-50",
  className
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/input.tsx
git commit -m "pwa: increase touch targets to 44px (h-11) for Android"
```

---

### Task 4: Extend BottomNav and Sidebar icon sets

**Files:**
- Modify: `src/components/app/BottomNav.tsx`
- Modify: `src/components/app/Sidebar.tsx`

- [ ] **Step 1: Add icons to BottomNav**

Open `src/components/app/BottomNav.tsx`.

**a) Update the import** from lucide-react. The current import is:

```ts
import {
  Award,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  ClipboardEdit,
  Home,
  Layers,
  LineChart,
  MessageSquare,
  Shield,
  Sparkles,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
```

Replace with:

```ts
import {
  Award,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardEdit,
  ClipboardList,
  Home,
  Layers,
  LineChart,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
```

**b) Update the ICONS map.** The current map is:

```ts
const ICONS = {
  home: Home,
  bookOpen: BookOpen,
  brain: Brain,
  calendar: Calendar,
  checkSquare: CheckSquare,
  layers: Layers,
  award: Award,
  sparkles: Sparkles,
  users: Users,
  clipboardEdit: ClipboardEdit,
  lineChart: LineChart,
  messageSquare: MessageSquare,
  shield: Shield,
  swords: Swords,
} satisfies Record<string, LucideIcon>;
```

Replace with:

```ts
const ICONS = {
  award: Award,
  barChart3: BarChart3,
  bookOpen: BookOpen,
  brain: Brain,
  building2: Building2,
  calendar: Calendar,
  checkSquare: CheckSquare,
  clipboardEdit: ClipboardEdit,
  clipboardList: ClipboardList,
  home: Home,
  layers: Layers,
  lineChart: LineChart,
  megaphone: Megaphone,
  messageSquare: MessageSquare,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  swords: Swords,
  trophy: Trophy,
  userCircle: UserCircle,
  users: Users,
} satisfies Record<string, LucideIcon>;
```

**c) Increase BottomNav label font size.** Find the className on the `<Link>` inside the `<li>`:

```tsx
className={cn(
  "relative flex flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
```

Change `text-[10px]` → `text-[11px]`:

```tsx
className={cn(
  "relative flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
```

- [ ] **Step 2: Add icons to Sidebar**

Open `src/components/app/Sidebar.tsx`.

**a) Update the import** to add `BarChart3` and `Building2`:

```ts
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  Brain,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardEdit,
  Home,
  Layers,
  LineChart,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
```

**b) Update the ICONS map** to add the two new entries:

```ts
const ICONS = {
  award: Award,
  barChart3: BarChart3,
  bookMarked: BookMarked,
  bookOpen: BookOpen,
  brain: Brain,
  building2: Building2,
  calendar: Calendar,
  checkSquare: CheckSquare,
  clipboardEdit: ClipboardEdit,
  home: Home,
  layers: Layers,
  lineChart: LineChart,
  messageSquare: MessageSquare,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  swords: Swords,
  trophy: Trophy,
  userCircle: UserCircle,
  users: Users,
} satisfies Record<string, LucideIcon>;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/BottomNav.tsx src/components/app/Sidebar.tsx
git commit -m "pwa: extend BottomNav and Sidebar icon sets for admin/sekretariat/rektor/schultraeger"
```

---

### Task 5: Admin layout — full mobile nav

**Files:**
- Modify: `src/app/admin/layout.tsx`

The admin layout currently has no sidebar or bottom nav — just `AppHeader` and a `<main>` in a vertical flex column. Restructure it to match the `/app` layout pattern exactly.

- [ ] **Step 1: Rewrite admin/layout.tsx**

Replace the entire contents of `src/app/admin/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { Sidebar, type NavItem } from "@/components/app/Sidebar";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { AppHeader } from "@/components/app/AppHeader";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import {
  ROLE_HOME,
  displayUser,
  effectiveRole,
  getSession,
  isImpersonating,
  isSuper,
} from "@/lib/session";
import { fetchNotifications } from "@/lib/notifications";

const adminNavItems: NavItem[] = [
  { href: "/admin",               label: "Dashboard",    icon: "home",         exact: true },
  { href: "/admin/nutzer",        label: "Nutzer",       icon: "users" },
  { href: "/admin/klassen",       label: "Klassen",      icon: "building2" },
  { href: "/admin/faecher",       label: "Fächer",       icon: "bookOpen" },
  { href: "/admin/stundenplan",   label: "Stundenplan",  icon: "calendar" },
  { href: "/admin/notenspiegel",  label: "Noten",        icon: "barChart3" },
  { href: "/admin/abgaben",       label: "Abgaben",      icon: "clipboardEdit" },
  { href: "/admin/branding",      label: "Branding",     icon: "sparkles" },
  { href: "/admin/sicherheit",    label: "Sicherheit",   icon: "shield" },
  { href: "/admin/lizenz",        label: "Lizenz",       icon: "award" },
  { href: "/admin/integrationen", label: "Integrationen",icon: "layers" },
  { href: "/admin/audit",         label: "Audit-Log",    icon: "lineChart" },
];

const adminBottomItems: BottomNavItem[] = [
  { href: "/admin",              label: "Start",    icon: "home",      exact: true },
  { href: "/admin/nutzer",       label: "Nutzer",   icon: "users" },
  { href: "/admin/klassen",      label: "Klassen",  icon: "building2" },
  { href: "/admin/notenspiegel", label: "Noten",    icon: "barChart3" },
  { href: "/admin/sicherheit",   label: "Mehr",     icon: "settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "admin") redirect(ROLE_HOME[effective]);

  const { notifications, unreadCount } = await fetchNotifications(session.userId);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={adminNavItems} rootHref="/admin" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar
              effective={effective}
              isImpersonating={isImpersonating(session)}
            />
          )}
          <AppHeader
            user={displayUser(session)}
            searchPlaceholder="Suchen — Nutzer, Klassen, Lizenzen, Audit-Logs …"
            unreadCount={unreadCount}
            notifications={notifications}
          />
        </div>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={adminBottomItems} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "pwa: add Sidebar + BottomNav to admin layout"
```

---

### Task 6: Sekretariat + Rektor layouts — add BottomNav

**Files:**
- Modify: `src/app/sekretariat/layout.tsx`
- Modify: `src/app/rektor/layout.tsx`

Both layouts already have a desktop sidebar (`hidden lg:flex`). They just need a `BottomNav` added below `<main>` and `pb-24 lg:pb-10` on the main element.

- [ ] **Step 1: Update sekretariat/layout.tsx**

Replace the entire contents of `src/app/sekretariat/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { SekretariatNav } from "./SekretariatNav";

const sekretariatBottomItems: BottomNavItem[] = [
  { href: "/sekretariat",            label: "Start",      icon: "home",          exact: true },
  { href: "/sekretariat/klassen",    label: "Klassen",    icon: "building2" },
  { href: "/sekretariat/schueler",   label: "Schüler",    icon: "users" },
  { href: "/sekretariat/fehlzeiten", label: "Fehlzeiten", icon: "clipboardList" },
];

export default async function SekretariatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (
    role !== "secretary" &&
    role !== "rector" &&
    role !== "vice_rector" &&
    role !== "admin" &&
    role !== "super"
  ) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <SekretariatNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Sekretariat</p>
        </header>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={sekretariatBottomItems} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update rektor/layout.tsx**

Replace the entire contents of `src/app/rektor/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { RektorNav } from "./RektorNav";

const rektorBottomItems: BottomNavItem[] = [
  { href: "/rektor",             label: "Start",       icon: "home",      exact: true },
  { href: "/rektor/statistiken", label: "Statistiken", icon: "barChart3" },
  { href: "/rektor/personal",    label: "Personal",    icon: "users" },
  { href: "/rektor/broadcast",   label: "Broadcast",   icon: "megaphone" },
];

export default async function RektorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (
    role !== "rector" &&
    role !== "vice_rector" &&
    role !== "admin" &&
    role !== "super"
  ) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <RektorNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Schulleitung</p>
        </header>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={rektorBottomItems} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/sekretariat/layout.tsx src/app/rektor/layout.tsx
git commit -m "pwa: add BottomNav to sekretariat and rektor layouts"
```

---

### Task 7: Schulträger + Plattform layouts — add Sidebar + BottomNav

**Files:**
- Modify: `src/app/schultraeger/layout.tsx`
- Modify: `src/app/plattform/layout.tsx`

- [ ] **Step 1: Update schultraeger/layout.tsx**

Replace the entire contents of `src/app/schultraeger/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { SchultraegerNav } from "./SchultraegerNav";

const schultraegerBottomItems: BottomNavItem[] = [
  { href: "/schultraeger",             label: "Start",       icon: "home",      exact: true },
  { href: "/schultraeger/schulen",     label: "Schulen",     icon: "building2" },
  { href: "/schultraeger/statistiken", label: "Statistiken", icon: "barChart3" },
];

export default async function SchultraegerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "school_company" && role !== "super") redirect("/login");

  return (
    <div className="flex min-h-screen bg-surface">
      <SchultraegerNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Schulträger-Portal</p>
        </header>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={schultraegerBottomItems} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update plattform/layout.tsx**

Replace the entire contents of `src/app/plattform/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { Sidebar, type NavItem } from "@/components/app/Sidebar";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { AppHeader } from "@/components/app/AppHeader";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import {
  ROLE_HOME,
  displayUser,
  effectiveRole,
  getSession,
  isImpersonating,
  isSuper,
} from "@/lib/session";

const plattformNavItems: NavItem[] = [
  { href: "/plattform",              label: "Übersicht",   icon: "home",         exact: true },
  { href: "/schultraeger/schulen",   label: "Schulen",     icon: "building2" },
  { href: "/plattform/statistiken",  label: "Statistiken", icon: "barChart3" },
  { href: "/plattform/support",      label: "Support",     icon: "messageSquare" },
  { href: "/plattform/flags",        label: "Flags",       icon: "shield" },
  { href: "/plattform/audit",        label: "Audit-Log",   icon: "lineChart" },
  { href: "/plattform/kb",           label: "Wissensbasis",icon: "bookOpen" },
];

const plattformBottomItems: BottomNavItem[] = [
  { href: "/plattform",             label: "Start",   icon: "home",         exact: true },
  { href: "/schultraeger/schulen",  label: "Schulen", icon: "building2" },
  { href: "/plattform/statistiken", label: "Stats",   icon: "barChart3" },
  { href: "/plattform/support",     label: "Support", icon: "messageSquare" },
  { href: "/plattform/audit",       label: "Audit",   icon: "lineChart" },
];

export default async function PlattformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "super") redirect(ROLE_HOME[effective]);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={plattformNavItems} rootHref="/plattform" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar
              effective={effective}
              isImpersonating={isImpersonating(session)}
            />
          )}
          <AppHeader
            user={displayUser(session)}
            searchPlaceholder="Suchen — Schulen, Tickets, Audit-Logs, Flags …"
            unreadCount={3}
          />
        </div>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={plattformBottomItems} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/schultraeger/layout.tsx src/app/plattform/layout.tsx
git commit -m "pwa: add Sidebar + BottomNav to schultraeger and plattform layouts"
```

---

### Task 8: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Run full production build**

```bash
npx next build
```

Expected output ends with something like:
```
✓ Compiled successfully
✓ Generating static pages (120/120)
```

Zero errors, zero type errors.

- [ ] **Step 2: Smoke-test the install flow in Chrome Android (or Chrome DevTools)**

In Chrome desktop:
1. Open DevTools → Application → Manifest
2. Confirm `id`, `name`, `display: standalone`, icons are listed correctly
3. Open Application → Service Workers — confirm SW is registered and active
4. Application → Install → "Add to Home Screen" should be available

- [ ] **Step 3: Final commit if any fixup needed**

```bash
git add -p   # stage only intentional changes
git commit -m "pwa: final fixups after build verification"
```
