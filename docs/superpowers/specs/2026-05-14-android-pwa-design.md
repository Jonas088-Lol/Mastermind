# Android PWA — Design Spec

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development.

**Goal:** Make MasterMind fully usable as an installed Progressive Web App on Android — all 9 role areas, proper touch targets, safe-area support, and a working install flow.

**Architecture:** Pure PWA enhancement — no React Native, no Capacitor, no app store. The existing Next.js app gets a viewport fix, strengthened manifest, static icons, mobile navigation for the 5 currently-unnavigable sections (admin, sekretariat, rektor, schulträger, plattform), and globally increased touch targets.

**Tech Stack:** Next.js 15 App Router · Tailwind CSS · Existing `BottomNav` + `Sidebar` components · `web-push` (already wired) · VAPID (already wired)

---

## Current State

| Area | Desktop Nav | Mobile Nav | Status |
|------|------------|-----------|--------|
| /app (Schüler) | Sidebar ✅ | BottomNav ✅ | Done |
| /teach (Lehrer) | Sidebar ✅ | BottomNav ✅ | Done |
| /eltern (Eltern) | Sidebar ✅ | BottomNav ✅ | Done |
| /admin | ❌ none | ❌ none | **Fix needed** |
| /sekretariat | Sidebar ✅ | ❌ none | **Fix needed** |
| /rektor | Sidebar ✅ | ❌ none | **Fix needed** |
| /schultraeger | Sidebar ✅ | ❌ none | **Fix needed** |
| /plattform | ❌ none | ❌ none | **Fix needed** |

---

## Changes Required

### 1. Viewport + Manifest

**`src/app/layout.tsx`** — add `viewportFit: "cover"` to the `Viewport` export so the app fills the full screen (including behind notch/punch-hole) when installed.

```ts
export const viewport: Viewport = {
  viewportFit: "cover",          // ← add
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};
```

**`src/app/manifest.ts`** — add `id`, fix icon `src` paths to use the correct Next.js dynamic icon routes:

```ts
id: "/",
icons: [
  { src: "/icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icon?size=192", sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: "/icon?size=512", sizes: "512x512", type: "image/png" },
  { src: "/apple-icon",   sizes: "180x180", type: "image/png" },
],
```

**`public/sw.js`** — fix push notification icon: change `/icon-192.png` → `/icon` (the dynamic Next.js icon route, which is cached by the SW).

---

### 2. Safe-Area CSS

**`src/app/globals.css`** — add rules that kick in only when the app is running in standalone (installed) mode:

```css
/* Safe area — standalone PWA mode */
@media all and (display-mode: standalone) {
  .safe-top    { padding-top: env(safe-area-inset-top); }
  .safe-sides  { padding-left: env(safe-area-inset-left);
                 padding-right: env(safe-area-inset-right); }
}
```

**`src/components/app/AppHeader.tsx`** — add `safe-top` class to the header element so it shifts down correctly on phones with a punch-hole camera when installed as a PWA.

---

### 3. Touch Targets

Minimum Android touch target is 44 × 44 px. Current `md` button size is 40px and `sm` is 32px.

**`src/components/ui/button.tsx`** — increase sizes:
```ts
sm:   "h-9  px-3 text-xs",   // 36px (was 32px)
md:   "h-11 px-5",           // 44px (was 40px) ← primary change
lg:   "h-12 px-6 text-base", // 48px (unchanged)
icon: "h-11 w-11",           // 44px (was 40px)
```

**`src/components/ui/input.tsx`** — increase from `h-10` → `h-11`.

**`src/components/app/BottomNav.tsx`** — increase label font size from `text-[10px]` → `text-[11px]` for readability on Android.

---

### 4. Extend Icon Sets

**`src/components/app/BottomNav.tsx`** — add to ICONS map (import from lucide-react):
```ts
barChart3:     BarChart3,
building2:     Building2,
clipboardList: ClipboardList,
megaphone:     Megaphone,
settings:      Settings,
userCircle:    UserCircle,
trophy:        Trophy,
```

**`src/components/app/Sidebar.tsx`** — add the two admin-specific icons not already present:
```ts
barChart3: BarChart3,
building2: Building2,
```
These are used in the admin sidebar nav items (`/admin/klassen`, `/admin/notenspiegel`).

---

### 5. Admin Layout — Full Mobile Nav

The admin layout currently has no sidebar or bottom nav. Restructure it to match the app/teach/eltern pattern.

**`src/app/admin/layout.tsx`** — change from `flex-col` to `flex-row` (sidebar on left), add Sidebar + BottomNav:

```tsx
const adminNavItems: NavItem[] = [
  { href: "/admin",              label: "Dashboard",  icon: "home",         exact: true },
  { href: "/admin/nutzer",       label: "Nutzer",     icon: "users" },
  { href: "/admin/klassen",      label: "Klassen",    icon: "building2" },
  { href: "/admin/faecher",      label: "Fächer",     icon: "bookOpen" },
  { href: "/admin/stundenplan",  label: "Stundenplan",icon: "calendar" },
  { href: "/admin/notenspiegel", label: "Noten",      icon: "barChart3" },
  { href: "/admin/abgaben",      label: "Abgaben",    icon: "clipboardEdit" },
  { href: "/admin/branding",     label: "Branding",   icon: "settings" },
  { href: "/admin/sicherheit",   label: "Sicherheit", icon: "shield" },
  { href: "/admin/lizenz",       label: "Lizenz",     icon: "award" },
  { href: "/admin/integrationen",label: "Integrationen", icon: "layers" },
  { href: "/admin/audit",        label: "Audit-Log",  icon: "lineChart" },
];

const adminBottomItems: BottomNavItem[] = [
  { href: "/admin",         label: "Start",   icon: "home",      exact: true },
  { href: "/admin/nutzer",  label: "Nutzer",  icon: "users" },
  { href: "/admin/klassen", label: "Klassen", icon: "building2" },
  { href: "/admin/notenspiegel", label: "Noten", icon: "barChart3" },
  { href: "/admin/sicherheit",   label: "Mehr",  icon: "settings" },
];
```

Main element gets `pb-24 lg:pb-10`.

---

### 6. Sekretariat Layout — Add BottomNav

**`src/app/sekretariat/layout.tsx`** — the desktop sidebar (`SekretariatNav`) already exists and is `hidden lg:flex`. Add BottomNav below `<main>` and `pb-24 lg:pb-10` to main:

```tsx
const sekretariatBottomItems: BottomNavItem[] = [
  { href: "/sekretariat",            label: "Start",      icon: "home",          exact: true },
  { href: "/sekretariat/klassen",    label: "Klassen",    icon: "building2" },
  { href: "/sekretariat/schueler",   label: "Schüler",    icon: "users" },
  { href: "/sekretariat/fehlzeiten", label: "Fehlzeiten", icon: "clipboardList" },
];
```

---

### 7. Rektor Layout — Add BottomNav

**`src/app/rektor/layout.tsx`** — same pattern:

```tsx
const rektorBottomItems: BottomNavItem[] = [
  { href: "/rektor",              label: "Start",       icon: "home",      exact: true },
  { href: "/rektor/statistiken",  label: "Statistiken", icon: "barChart3" },
  { href: "/rektor/personal",     label: "Personal",    icon: "users" },
  { href: "/rektor/broadcast",    label: "Broadcast",   icon: "megaphone" },
];
```

---

### 8. Schulträger Layout — Add BottomNav

**`src/app/schultraeger/layout.tsx`** — same pattern:

```tsx
const schultraegerBottomItems: BottomNavItem[] = [
  { href: "/schultraeger",             label: "Start",       icon: "home",      exact: true },
  { href: "/schultraeger/schulen",     label: "Schulen",     icon: "building2" },
  { href: "/schultraeger/statistiken", label: "Statistiken", icon: "barChart3" },
];
```

---

### 9. Plattform Layout — Add Sidebar + BottomNav

The plattform (super-admin) layout also has no nav at all. Add both:

```tsx
const plattformNavItems: NavItem[] = [
  { href: "/plattform",          label: "Übersicht",   icon: "home",      exact: true },
  { href: "/schultraeger/schulen", label: "Schulen",   icon: "building2" },
  { href: "/plattform/statistiken", label: "Statistiken", icon: "barChart3" },
  { href: "/plattform/support",  label: "Support",     icon: "messageSquare" },
  { href: "/plattform/flags",    label: "Flags",       icon: "shield" },
  { href: "/plattform/audit",    label: "Audit",       icon: "lineChart" },
  { href: "/plattform/kb",       label: "KB",          icon: "bookOpen" },
];

const plattformBottomItems: BottomNavItem[] = [
  { href: "/plattform",          label: "Start",   icon: "home",         exact: true },
  { href: "/schultraeger/schulen", label: "Schulen", icon: "building2" },
  { href: "/plattform/statistiken", label: "Stats", icon: "barChart3" },
  { href: "/plattform/support",  label: "Support", icon: "messageSquare" },
  { href: "/plattform/audit",    label: "Audit",   icon: "lineChart" },
];
```

---

## File Change Summary

| File | Type of Change |
|------|---------------|
| `src/app/layout.tsx` | Add `viewportFit: "cover"` |
| `src/app/manifest.ts` | Add `id`, fix icon srcs |
| `public/sw.js` | Fix push icon path |
| `src/app/globals.css` | Add safe-area utility classes |
| `src/components/app/AppHeader.tsx` | Add `safe-top` class |
| `src/components/ui/button.tsx` | Increase touch targets |
| `src/components/ui/input.tsx` | Increase height to `h-11` |
| `src/components/app/BottomNav.tsx` | Add icons, increase label font |
| `src/app/admin/layout.tsx` | Full restructure + Sidebar + BottomNav |
| `src/app/sekretariat/layout.tsx` | Add BottomNav + `pb-24` |
| `src/app/rektor/layout.tsx` | Add BottomNav + `pb-24` |
| `src/app/schultraeger/layout.tsx` | Add BottomNav + `pb-24` |
| `src/app/plattform/layout.tsx` | Add Sidebar + BottomNav |

**Total: 13 files. No new dependencies. No DB changes. Build must stay at 0 errors.**
