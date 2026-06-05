// Removes all padding from the app shell for the full-bleed notebook editor.
// The PageEditor handles its own layout (sidebar + A4 page).
export default function HeftEditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
