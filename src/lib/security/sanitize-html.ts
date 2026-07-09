/**
 * Strikter Allowlist-HTML-Sanitizer für nicht vertrauenswürdiges HTML
 * (v.a. eingehende E-Mails, die im Postfach gerendert werden).
 *
 * Ansatz: Deny-by-default. Wir entfernen zuerst alle strukturell gefährlichen
 * Konstrukte (script/style/iframe/… inkl. Inhalt, Kommentare, CDATA), dann
 * behalten wir nur eine kleine Allowlist an Tags und Attributen und säubern
 * URLs auf sichere Schemata. Alles nicht Erlaubte wird verworfen.
 *
 * Bewusst KEINE externe Dependency (kein DOMPurify): Läuft serverseitig ohne
 * DOM, keine zusätzliche Angriffsfläche, und die Allowlist ist für den
 * Mail-Kontext eng genug. Grenzen: Dies ist ein Regex-basierter Sanitizer.
 * Er ist streng (Allowlist), aber für hochkomplexe verschachtelte Payloads
 * kein Ersatz für einen echten HTML-Parser. Der reine Text-Body bleibt als
 * sicherer Fallback erhalten.
 */

const ALLOWED_TAGS = new Set([
  "a", "b", "strong", "i", "em", "u", "s", "p", "br", "hr",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tr", "td", "th",
  "span", "div",
]);

// Pro Tag erlaubte Attribute
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
};

const SAFE_URL = /^(https?:|mailto:|tel:)/i;

function stripDangerousBlocks(html: string): string {
  return html
    // Elemente mit Inhalt komplett entfernen
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/<object\b[\s\S]*?<\/object\s*>/gi, "")
    .replace(/<embed\b[\s\S]*?<\/embed\s*>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, "")
    .replace(/<template\b[\s\S]*?<\/template\s*>/gi, "")
    // Selbstschließende / leere gefährliche Tags
    .replace(/<(script|style|iframe|object|embed|link|meta|base|form|input|button|svg|math)\b[^>]*\/?>/gi, "")
    // HTML-Kommentare (können bedingte IE-Kommentare / Payloads verstecken)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, "");
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeAttrs(tag: string, attrString: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed || !attrString.trim()) return "";

  const out: string[] = [];
  // name="value" | name='value' | name=value
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrString)) !== null) {
    const name = m[1].toLowerCase();
    const value = (m[3] ?? m[4] ?? m[5] ?? "").trim();

    // Event-Handler und style niemals durchlassen
    if (name.startsWith("on") || name === "style") continue;
    if (!allowed.has(name)) continue;

    if (name === "href") {
      // Whitespace/Steuerzeichen entfernen (umgeht z.B. "java\tscript:")
      // eslint-disable-next-line no-control-regex
      const cleaned = value.replace(/[\x00-\x20]+/g, "");
      if (!SAFE_URL.test(cleaned)) continue;
      out.push(`href="${escapeAttr(cleaned)}"`);
    } else {
      out.push(`${name}="${escapeAttr(value)}"`);
    }
  }
  return out.length ? " " + out.join(" ") : "";
}

/**
 * Säubert nicht vertrauenswürdiges HTML auf eine enge Allowlist.
 * Links erhalten zusätzlich rel="noopener noreferrer nofollow" + target="_blank".
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";

  let html = stripDangerousBlocks(dirty);

  // Alle Tags durchgehen; nur Allowlist behalten
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";

    const isClosing = full.startsWith("</");
    if (isClosing) return `</${tag}>`;

    if (tag === "a") {
      const safeAttrs = sanitizeAttrs(tag, attrs);
      return `<a${safeAttrs} rel="noopener noreferrer nofollow" target="_blank">`;
    }
    // Andere erlaubte Tags: ohne Attribute rendern (Allowlist hat für sie keine)
    return `<${tag}>`;
  });

  // Übrig gebliebene rohe "<" (unvollständige Tags) neutralisieren
  html = html.replace(/<(?![a-zA-Z/])/g, "&lt;");

  return html;
}
