"use client";

import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import {
  X,
  Plus,
  Users,
  MessageCircle,
  Compass,
  ArrowLeft,
  Lock,
  Send,
  Crown,
  ChevronRight,
  Minus,
  Maximize2,
  Search,
  Pencil,
  Trash2,
  Check,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createSpaceModal,
  joinSpaceModal,
  createChannelModal,
  sendChannelMessageModal,
  sendDmModal,
  editMessageModal,
  deleteMessageModal,
} from "@/app/app/masterspace/modal-actions";

// ── Types ─────────────────────────────────────────────────────────────────

type SpaceChannel = { id: string; name: string; position: number };

type SpaceSummary = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  channels: SpaceChannel[];
  _count: { members: number };
};

type PublicSpace = {
  id: string;
  name: string;
  emoji: string;
  _count: { members: number };
};

type DmConversation = { id: string; partner: { id: string; name: string } };

type OverviewData = {
  hasMasterSpace: boolean;
  mySpaces: SpaceSummary[];
  publicSpaces: PublicSpace[];
  dmConversations: DmConversation[];
  myId: string;
};

type SpaceMember = { userId: string; role: string; user: { id: string; name: string } };

type SpaceDetail = {
  id: string;
  name: string;
  emoji: string;
  channels: SpaceChannel[];
  members: SpaceMember[];
};

type SpaceData = {
  space: SpaceDetail;
  myRole: "owner" | "admin" | "member";
  myId: string;
};

type Message = {
  id: string;
  content: string;
  authorId: string;
  author: { id?: string; name: string };
  sentAt: string;
  editedAt?: string | null;
};

type View = "home" | "channel" | "dm";

// ── Helpers ───────────────────────────────────────────────────────────────

const PLAN_EMOJI = ["🏠", "🎮", "📚", "🎵", "🎨", "⚽", "🔬", "🌍", "💡", "🚀"];

function getDayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return "Heute";
  if (d.getTime() === yesterday.getTime()) return "Gestern";
  return date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
}

function Avatar({
  name,
  isMe,
  size = "md",
}: {
  name: string;
  isMe: boolean;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "size-5 text-[9px]" : "size-8 text-xs";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        cls,
        isMe ? "bg-brand/15 text-brand" : "bg-muted text-muted-fg"
      )}
    >
      {(isMe ? "D" : name[0] ?? "?").toUpperCase()}
    </div>
  );
}

// ── Minimized floating widget ─────────────────────────────────────────────

function MinimizedWidget({
  label,
  emoji,
  messages,
  myId,
  quickInput,
  onQuickInput,
  onSend,
  onExpand,
  onClose,
  hasContext,
}: {
  label: string;
  emoji: string;
  messages: Message[];
  myId: string;
  quickInput: string;
  onQuickInput: (v: string) => void;
  onSend: () => void;
  onExpand: () => void;
  onClose: () => void;
  hasContext: boolean;
}) {
  const lastMsgs = messages.slice(-4);

  return (
    <div className="fixed bottom-20 right-3 z-200 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:bottom-5 sm:right-5">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-bg px-3 py-2.5">
        <span className="text-base leading-none">{emoji}</span>
        <p className="flex-1 truncate text-xs font-semibold">{label}</p>
        <button
          onClick={onExpand}
          title="Maximieren"
          className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-muted hover:text-fg"
        >
          <Maximize2 className="size-3.5" />
        </button>
        <button
          onClick={onClose}
          title="Schließen"
          className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-muted hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Message preview */}
      {lastMsgs.length > 0 && (
        <div className="max-h-32 space-y-1.5 overflow-y-auto px-3 py-2.5">
          {lastMsgs.map((msg) => {
            const isMe = msg.authorId === myId;
            return (
              <p key={msg.id} className="text-xs leading-relaxed">
                <span className={cn("font-semibold", isMe ? "text-brand" : "text-fg")}>
                  {isMe ? "Du" : msg.author.name}:
                </span>{" "}
                <span className="text-muted-fg">
                  {msg.content.length > 70
                    ? msg.content.slice(0, 70) + "…"
                    : msg.content}
                </span>
              </p>
            );
          })}
        </div>
      )}

      {/* Quick input */}
      {hasContext && (
        <div className="border-t border-border px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
            <input
              value={quickInput}
              onChange={(e) => onQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
              placeholder="Schnellnachricht…"
              className="flex-1 bg-transparent text-xs focus:outline-none"
            />
            <button
              onClick={onSend}
              disabled={!quickInput.trim()}
              className="text-brand transition-opacity disabled:opacity-30"
            >
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Home view ─────────────────────────────────────────────────────────────

function HomeView({
  overview,
  creating,
  onCreateSpace,
  onJoinSpace,
  onSelectSpace,
}: {
  overview: OverviewData | null;
  creating: boolean;
  onCreateSpace: (e: React.FormEvent<HTMLFormElement>) => void;
  onJoinSpace: (spaceId: string) => void;
  onSelectSpace: (space: SpaceSummary) => void;
}) {
  if (!overview) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!overview.hasMasterSpace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-brand/10">
          <Compass className="size-8 text-brand" />
        </div>
        <div>
          <h2 className="text-xl font-bold">MasterSpace</h2>
          <p className="mt-1 text-sm text-muted-fg">
            Spaces, Kanäle & Direktnachrichten — nur ab Pro.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/8 px-4 py-2.5">
          <Lock className="size-4 text-warning" />
          <p className="text-sm font-medium text-warning">Ab dem Pro-Abo verfügbar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7">
      {overview.mySpaces.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
            Meine Spaces
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {overview.mySpaces.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSpace(s)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-brand/30 hover:shadow-sm"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                  {s.emoji}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  {s.description && (
                    <p className="truncate text-xs text-muted-fg">{s.description}</p>
                  )}
                  <p className="text-xs text-muted-fg">
                    {s._count.members}{" "}
                    {s._count.members === 1 ? "Mitglied" : "Mitglieder"} ·{" "}
                    {s.channels.length} Kanäle
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {overview.publicSpaces.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
            Spaces entdecken
          </p>
          <div className="flex flex-col gap-2">
            {overview.publicSpaces.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
                  {s.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-fg">{s._count.members} Mitglieder</p>
                </div>
                <button
                  onClick={() => onJoinSpace(s.id)}
                  className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Beitreten
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
          Neuen Space erstellen
        </p>
        <form
          onSubmit={onCreateSpace}
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5"
        >
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-fg">Icon</p>
            <div className="flex flex-wrap gap-1.5">
              {PLAN_EMOJI.map((e, i) => (
                <label key={e} className="cursor-pointer">
                  <input
                    type="radio"
                    name="emoji"
                    value={e}
                    defaultChecked={i === 0}
                    className="sr-only peer"
                  />
                  <span className="flex size-9 items-center justify-center rounded-xl border border-border text-base transition-all peer-checked:border-brand peer-checked:bg-brand/10 hover:bg-muted">
                    {e}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name *</label>
            <input
              name="name"
              type="text"
              required
              maxLength={50}
              placeholder="z.B. Klasse 10a"
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Beschreibung</label>
            <input
              name="description"
              type="text"
              maxLength={200}
              placeholder="Worum geht es?"
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="size-4" />
              {creating ? "Erstelle…" : "Space erstellen"}
            </button>
          </div>
        </form>
      </section>

      {overview.mySpaces.length === 0 && overview.publicSpaces.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center text-muted-fg">
          <Compass className="size-10" strokeWidth={1.5} />
          <p className="text-sm">Noch keine Spaces — erstelle den ersten!</p>
        </div>
      )}
    </div>
  );
}

// ── Message list with day separators + edit/delete ────────────────────────

function MessageList({
  messages,
  myId,
  emptyIcon,
  emptyText,
  endRef,
  searchQuery,
  onEdit,
  onDelete,
}: {
  messages: Message[];
  myId: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
  endRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  onEdit: (msg: Message) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = searchQuery
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  if (filtered.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-fg">
        {emptyIcon}
        <p className="text-sm">{searchQuery ? "Keine Treffer" : emptyText}</p>
      </div>
    );
  }

  let lastDayLabel = "";

  return (
    <div className="flex flex-col">
      {filtered.map((msg, i) => {
        const prev = filtered[i - 1];
        const msgDate = new Date(msg.sentAt);
        const dayLabel = getDayLabel(msgDate);
        const showDay = dayLabel !== lastDayLabel;
        if (showDay) lastDayLabel = dayLabel;

        const showHeader =
          showDay ||
          !prev ||
          prev.authorId !== msg.authorId ||
          msgDate.getTime() - new Date(prev.sentAt).getTime() > 5 * 60 * 1000;

        const isMe = msg.authorId === myId;
        const authorName = isMe ? "Du" : (msg.author?.name ?? "?");
        const time = msgDate.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Fragment key={msg.id}>
            {showDay && (
              <div className="my-3 flex items-center gap-3 px-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                  {dayLabel}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            <div
              className="group relative flex gap-2.5 px-4 py-0.5 hover:bg-muted/30"
              onMouseEnter={() => setHovered(msg.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {showHeader ? (
                <Avatar name={msg.author.name} isMe={isMe} />
              ) : (
                <div className="w-8 shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                {showHeader && (
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isMe ? "text-brand" : "text-fg"
                      )}
                    >
                      {authorName}
                    </span>
                    <span className="text-[10px] text-muted-fg">{time}</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                {msg.editedAt && (
                  <span className="text-[10px] text-muted-fg">(bearbeitet)</span>
                )}
              </div>

              {/* Hover actions (own messages only) */}
              {hovered === msg.id && isMe && (
                <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-1 rounded-lg border border-border bg-surface px-1.5 py-1 shadow-md">
                  <button
                    onClick={() => onEdit(msg)}
                    title="Bearbeiten"
                    className="rounded p-1 text-muted-fg hover:bg-muted hover:text-fg"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(msg.id)}
                    title="Löschen"
                    className="rounded p-1 text-muted-fg hover:bg-danger hover:text-white"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </Fragment>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// ── Message input ─────────────────────────────────────────────────────────

function MessageInput({
  value,
  onChange,
  onSend,
  placeholder,
  textareaRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="shrink-0 border-t border-border p-3">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 transition-colors focus-within:border-brand/50">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none bg-transparent py-1 text-sm focus:outline-none"
          style={{ maxHeight: "100px" }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim()}
          className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-opacity disabled:opacity-30 hover:opacity-90"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────

export function MasterSpaceModal() {
  // ── Open / minimize state ─────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [quickInput, setQuickInput] = useState("");

  // ── Data ──────────────────────────────────────────────────────────
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState("");

  // ── Navigation ────────────────────────────────────────────────────
  const [selSpaceId, setSelSpaceId] = useState<string | null>(null);
  const [selChannelId, setSelChannelId] = useState<string | null>(null);
  const [selDmId, setSelDmId] = useState<string | null>(null);
  const [selDmName, setSelDmName] = useState("");
  const [view, setView] = useState<View>("home");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Input / UI state ──────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(true);
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState<string | null>(null); // spaceId
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // ── Edit state ────────────────────────────────────────────────────
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────

  const fetchOverview = useCallback(async () => {
    const res = await fetch("/api/masterspace").catch(() => null);
    if (!res?.ok) return;
    const data: OverviewData = await res.json();
    setOverview(data);
    setMyId((p) => p || data.myId);
  }, []);

  const fetchSpaceDetail = useCallback(async (spaceId: string) => {
    const res = await fetch(`/api/masterspace/${spaceId}`).catch(() => null);
    if (!res?.ok) return;
    const data: SpaceData = await res.json();
    setSpaceData(data);
    setMyId((p) => p || data.myId);
  }, []);

  const fetchChannelMessages = useCallback(
    async (spaceId: string, channelId: string) => {
      const res = await fetch(
        `/api/masterspace/${spaceId}/${channelId}/messages`
      ).catch(() => null);
      if (!res?.ok) return;
      const data: { messages: Message[]; myId: string } = await res.json();
      setMessages(data.messages ?? []);
      setMyId((p) => p || data.myId);
    },
    []
  );

  const fetchDmMessages = useCallback(async (partnerId: string) => {
    const res = await fetch(
      `/api/masterspace/dm/${partnerId}/messages`
    ).catch(() => null);
    if (!res?.ok) return;
    const data: { messages: Message[]; myId: string } = await res.json();
    setMessages(data.messages ?? []);
    setMyId((p) => p || data.myId);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────

  useEffect(() => {
    const open = () => {
      setIsOpen(true);
      setIsMinimized(false);
      fetchOverview();
    };
    window.addEventListener("ms:open", open);
    return () => window.removeEventListener("ms:open", open);
  }, [fetchOverview]);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingMsg) { setEditingMsg(null); return; }
        if (showSearch) { setShowSearch(false); setSearchQuery(""); return; }
        setIsMinimized(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isMinimized, editingMsg, showSearch]);

  useEffect(() => {
    document.body.style.overflow = isOpen && !isMinimized ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages.length, isMinimized]);

  useEffect(() => {
    if (editingMsg) editRef.current?.focus();
  }, [editingMsg]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!isOpen) return;
    if (view === "channel" && selSpaceId && selChannelId) {
      pollRef.current = setInterval(
        () => fetchChannelMessages(selSpaceId, selChannelId),
        3000
      );
    } else if (view === "dm" && selDmId) {
      pollRef.current = setInterval(() => fetchDmMessages(selDmId), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen, view, selSpaceId, selChannelId, selDmId, fetchChannelMessages, fetchDmMessages]);

  // ── Navigation ────────────────────────────────────────────────────

  function toggleExpand(spaceId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(spaceId) ? next.delete(spaceId) : next.add(spaceId);
      return next;
    });
  }

  function goHome() {
    setSelSpaceId(null);
    setSelChannelId(null);
    setSelDmId(null);
    setView("home");
    setMobileSidebar(true);
    setSpaceData(null);
    setMessages([]);
    setSearchQuery("");
    setShowSearch(false);
    fetchOverview();
  }

  function goToChannel(spaceId: string, channelId: string) {
    setSelSpaceId(spaceId);
    setSelChannelId(channelId);
    setView("channel");
    setMessages([]);
    setMobileSidebar(false);
    setSearchQuery("");
    setShowSearch(false);
    setEditingMsg(null);
    setExpandedIds((prev) => new Set([...prev, spaceId]));
    fetchChannelMessages(spaceId, channelId);
    if (selSpaceId !== spaceId) fetchSpaceDetail(spaceId);
  }

  function selectSpace(space: SpaceSummary) {
    setSelSpaceId(space.id);
    setSpaceData(null);
    fetchSpaceDetail(space.id);
    setExpandedIds((prev) => new Set([...prev, space.id]));
    const first = space.channels[0];
    if (first) {
      goToChannel(space.id, first.id);
    } else {
      setView("home");
      setMobileSidebar(true);
    }
  }

  function goToDm(partnerId: string, partnerName: string) {
    setSelDmId(partnerId);
    setSelDmName(partnerName);
    setView("dm");
    setMessages([]);
    setMobileSidebar(false);
    setSearchQuery("");
    setShowSearch(false);
    setEditingMsg(null);
    fetchDmMessages(partnerId);
  }

  // ── Messaging ─────────────────────────────────────────────────────

  function sendMessage() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    textareaRef.current?.focus();
    if (view === "channel" && selSpaceId && selChannelId) {
      sendChannelMessageModal(selChannelId, content).then(() =>
        fetchChannelMessages(selSpaceId, selChannelId)
      );
    } else if (view === "dm" && selDmId) {
      sendDmModal(selDmId, content).then(() => fetchDmMessages(selDmId));
    }
  }

  function sendQuick() {
    const content = quickInput.trim();
    if (!content) return;
    setQuickInput("");
    if (view === "channel" && selSpaceId && selChannelId) {
      sendChannelMessageModal(selChannelId, content).then(() =>
        fetchChannelMessages(selSpaceId, selChannelId)
      );
    } else if (view === "dm" && selDmId) {
      sendDmModal(selDmId, content).then(() => fetchDmMessages(selDmId));
    }
  }

  async function submitEdit() {
    if (!editingMsg || !editInput.trim()) return;
    await editMessageModal(editingMsg.id, editInput);
    setEditingMsg(null);
    if (selSpaceId && selChannelId) fetchChannelMessages(selSpaceId, selChannelId);
  }

  async function handleDelete(msgId: string) {
    await deleteMessageModal(msgId);
    if (selSpaceId && selChannelId) fetchChannelMessages(selSpaceId, selChannelId);
  }

  // ── Create space ──────────────────────────────────────────────────

  async function handleCreateSpace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await createSpaceModal(new FormData(e.currentTarget));
      if (result) {
        await fetchOverview();
        await fetchSpaceDetail(result.spaceId);
        goToChannel(result.spaceId, result.channelId);
      }
    } finally {
      setCreating(false);
    }
  }

  // ── Computed ──────────────────────────────────────────────────────

  const space = spaceData?.space;
  const isAdmin = spaceData?.myRole === "owner" || spaceData?.myRole === "admin";
  const channelName = space?.channels.find((c) => c.id === selChannelId)?.name;
  const memberAvatars = space?.members.slice(0, 5) ?? [];

  const widgetLabel =
    view === "channel" && space && channelName
      ? `${space.name} · #${channelName}`
      : view === "dm" && selDmName
      ? selDmName
      : "MasterSpace";
  const widgetEmoji =
    view === "channel" && space ? space.emoji : view === "dm" ? "💬" : "◈";

  // ── Minimized widget ──────────────────────────────────────────────

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <MinimizedWidget
        label={widgetLabel}
        emoji={widgetEmoji}
        messages={messages}
        myId={myId}
        quickInput={quickInput}
        onQuickInput={setQuickInput}
        onSend={sendQuick}
        onExpand={() => setIsMinimized(false)}
        onClose={() => { setIsOpen(false); setIsMinimized(false); }}
        hasContext={view !== "home"}
      />
    );
  }

  // ── Full modal ────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-200 flex items-end justify-center sm:items-center sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="MasterSpace"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={() => setIsMinimized(true)}
      />

      {/* Panel */}
      <div className="relative flex h-[93dvh] w-full max-h-210 max-w-280 flex-col overflow-hidden rounded-t-2xl border border-border bg-bg shadow-2xl sm:h-[88dvh] sm:rounded-2xl">

        {/* ── Top header bar ─────────────────────────────────────── */}
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-brand" strokeWidth={2} />
            <span className="text-sm font-bold tracking-tight">MasterSpace</span>
          </div>

          {view === "channel" && space && channelName && (
            <div className="flex items-center gap-1 text-xs text-muted-fg">
              <span className="mx-1 opacity-40">·</span>
              <span>{space.emoji} {space.name}</span>
              <ChevronRight className="size-3 opacity-50" />
              <span className="font-medium text-fg">#{channelName}</span>
            </div>
          )}
          {view === "dm" && selDmName && (
            <div className="flex items-center gap-1 text-xs text-muted-fg">
              <span className="mx-1 opacity-40">·</span>
              <span className="font-medium text-fg">{selDmName}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={() => setIsMinimized(true)}
              title="Minimieren"
              className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-muted hover:text-fg"
            >
              <Minus className="size-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              title="Schließen"
              className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-muted hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ── Body row ───────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1">

          {/* ── Left sidebar (tree nav) ─────────────────────────── */}
          <div
            className={cn(
              "flex w-60 shrink-0 flex-col border-r border-border bg-surface",
              !mobileSidebar && "hidden sm:flex"
            )}
          >
            {/* Sidebar scroll area */}
            <div className="flex-1 overflow-y-auto py-2">

              {/* Home button */}
              <button
                onClick={goHome}
                className={cn(
                  "mx-2 mb-1 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  view === "home"
                    ? "bg-brand/10 text-brand"
                    : "text-muted-fg hover:bg-muted hover:text-fg"
                )}
              >
                <Compass className="size-4 shrink-0" strokeWidth={1.75} />
                <span>Übersicht</span>
              </button>

              {/* My Spaces tree */}
              {overview?.mySpaces && overview.mySpaces.length > 0 && (
                <div className="mb-2">
                  <p className="px-5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
                    Spaces
                  </p>
                  {overview.mySpaces.map((s) => {
                    const expanded = expandedIds.has(s.id);
                    const isActiveSpace = selSpaceId === s.id;
                    return (
                      <div key={s.id}>
                        {/* Space row */}
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleExpand(s.id)}
                            className="ml-2 flex h-8 w-5 items-center justify-center rounded text-muted-fg hover:text-fg"
                          >
                            <ChevronRight
                              className={cn(
                                "size-3.5 transition-transform duration-150",
                                expanded && "rotate-90"
                              )}
                            />
                          </button>
                          <button
                            onClick={() => selectSpace(s)}
                            className={cn(
                              "flex flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-all mr-2",
                              isActiveSpace && view !== "dm"
                                ? "font-semibold text-fg"
                                : "text-muted-fg hover:bg-muted hover:text-fg"
                            )}
                          >
                            <span className="text-base leading-none">{s.emoji}</span>
                            <span className="flex-1 truncate">{s.name}</span>
                            <span className="text-[10px] text-muted-fg">
                              {s._count.members}
                            </span>
                          </button>
                        </div>

                        {/* Channels (when expanded) */}
                        {expanded && (
                          <div className="ml-9 mb-1 border-l border-border pl-2">
                            {s.channels.map((ch) => {
                              const active =
                                selChannelId === ch.id &&
                                selSpaceId === s.id &&
                                view === "channel";
                              return (
                                <button
                                  key={ch.id}
                                  onClick={() => goToChannel(s.id, ch.id)}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all",
                                    active
                                      ? "bg-brand/10 font-semibold text-brand"
                                      : "text-muted-fg hover:bg-muted hover:text-fg"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "size-1.5 shrink-0 rounded-full transition-colors",
                                      active ? "bg-brand" : "bg-muted-fg/30"
                                    )}
                                  />
                                  <span className="truncate">{ch.name}</span>
                                </button>
                              );
                            })}

                            {/* Add channel (admin only) */}
                            {isAdmin && selSpaceId === s.id && (
                              <>
                                {showNewChannel === s.id ? (
                                  <form
                                    className="mr-1 mt-1"
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      const fd = new FormData(e.currentTarget);
                                      fd.set("spaceId", s.id);
                                      const result = await createChannelModal(fd);
                                      if (result) {
                                        setShowNewChannel(null);
                                        setNewChannelName("");
                                        await fetchSpaceDetail(s.id);
                                        // refresh overview channels too
                                        await fetchOverview();
                                        goToChannel(s.id, result.channelId);
                                      }
                                    }}
                                  >
                                    <input
                                      name="name"
                                      value={newChannelName}
                                      onChange={(e) => setNewChannelName(e.target.value)}
                                      placeholder="kanal-name"
                                      autoFocus
                                      className="w-full rounded-lg border border-border bg-bg px-2.5 py-1 text-xs focus:border-brand focus:outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === "Escape") setShowNewChannel(null);
                                      }}
                                    />
                                  </form>
                                ) : (
                                  <button
                                    onClick={() => setShowNewChannel(s.id)}
                                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-muted-fg hover:text-fg"
                                  >
                                    <Plus className="size-3" />
                                    Kanal hinzufügen
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DMs */}
              {overview?.dmConversations && overview.dmConversations.length > 0 && (
                <div>
                  <p className="px-5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
                    Direktnachrichten
                  </p>
                  {overview.dmConversations.map((dm) => {
                    const active = selDmId === dm.partner.id && view === "dm";
                    return (
                      <button
                        key={dm.id}
                        onClick={() => goToDm(dm.partner.id, dm.partner.name)}
                        className={cn(
                          "mx-2 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm transition-all",
                          active
                            ? "bg-brand/10 font-semibold text-brand"
                            : "text-muted-fg hover:bg-muted hover:text-fg"
                        )}
                      >
                        <Avatar name={dm.partner.name} isMe={false} size="sm" />
                        <span className="truncate">{dm.partner.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar footer */}
            <div className="shrink-0 border-t border-border px-3 py-2">
              <button
                onClick={goHome}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-muted-fg transition-colors hover:bg-muted hover:text-fg"
              >
                <Plus className="size-3.5" />
                Space erstellen
              </button>
            </div>
          </div>

          {/* ── Main content area ───────────────────────────────── */}
          <div
            className={cn(
              "flex flex-1 min-w-0 flex-col overflow-hidden bg-bg",
              mobileSidebar && "hidden sm:flex"
            )}
          >
            {view === "home" ? (
              <HomeView
                overview={overview}
                creating={creating}
                onCreateSpace={handleCreateSpace}
                onJoinSpace={async (spaceId) => {
                  const result = await joinSpaceModal(spaceId);
                  if (result) {
                    await fetchOverview();
                    await fetchSpaceDetail(result.spaceId);
                    goToChannel(result.spaceId, result.channelId);
                  }
                }}
                onSelectSpace={selectSpace}
              />
            ) : view === "channel" ? (
              <>
                {/* Channel header */}
                <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
                  <button
                    onClick={() => setMobileSidebar(true)}
                    className="mr-1 rounded-lg p-1 text-muted-fg hover:bg-muted sm:hidden"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <div
                    className={cn(
                      "size-2 rounded-full",
                      "bg-brand/40"
                    )}
                  />
                  <p className="flex-1 truncate text-sm font-semibold">{channelName}</p>

                  {/* Member avatars */}
                  {memberAvatars.length > 0 && (
                    <div className="hidden items-center lg:flex">
                      <div className="flex -space-x-1.5">
                        {memberAvatars.map((m) => (
                          <div
                            key={m.userId}
                            title={m.user.name}
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full border-2 border-bg text-[9px] font-bold",
                              m.userId === myId
                                ? "bg-brand/15 text-brand"
                                : "bg-muted text-muted-fg"
                            )}
                          >
                            {m.user.name[0]?.toUpperCase()}
                          </div>
                        ))}
                      </div>
                      {space && space.members.length > 5 && (
                        <span className="ml-2 text-xs text-muted-fg">
                          +{space.members.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Search toggle */}
                  <button
                    onClick={() => {
                      setShowSearch((v) => !v);
                      setSearchQuery("");
                    }}
                    title="Nachrichten suchen"
                    className={cn(
                      "rounded-lg p-1.5 transition-colors hover:bg-muted",
                      showSearch ? "text-brand" : "text-muted-fg hover:text-fg"
                    )}
                  >
                    <Search className="size-4" />
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1 text-muted-fg hover:bg-muted hover:text-fg sm:hidden"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Search bar */}
                {showSearch && (
                  <div className="shrink-0 border-b border-border bg-surface px-4 py-2">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-1.5">
                      <Search className="size-3.5 shrink-0 text-muted-fg" />
                      <input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`In #${channelName} suchen…`}
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="text-muted-fg hover:text-fg"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-3">
                  <MessageList
                    messages={messages}
                    myId={myId}
                    emptyIcon={
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-brand/10">
                        <Hash className="size-6 text-brand" strokeWidth={1.5} />
                      </div>
                    }
                    emptyText={`Schreib die erste Nachricht in #${channelName}`}
                    endRef={messagesEndRef}
                    searchQuery={searchQuery}
                    onEdit={(msg) => {
                      setEditingMsg(msg);
                      setEditInput(msg.content);
                    }}
                    onDelete={handleDelete}
                  />
                </div>

                {/* Edit bar */}
                {editingMsg && (
                  <div className="shrink-0 border-t border-warning/30 bg-warning/5 px-4 py-2">
                    <p className="mb-1.5 text-xs font-semibold text-warning">
                      Nachricht bearbeiten
                    </p>
                    <div className="flex gap-2">
                      <input
                        ref={editRef}
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitEdit();
                          if (e.key === "Escape") setEditingMsg(null);
                        }}
                        className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm focus:border-brand focus:outline-none"
                      />
                      <button
                        onClick={submitEdit}
                        className="flex size-9 items-center justify-center rounded-xl bg-brand text-white hover:opacity-90"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        onClick={() => setEditingMsg(null)}
                        className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-fg hover:bg-muted"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                {!editingMsg && (
                  <MessageInput
                    value={input}
                    onChange={setInput}
                    onSend={sendMessage}
                    placeholder={`Nachricht in #${channelName}`}
                    textareaRef={textareaRef}
                  />
                )}
              </>
            ) : (
              <>
                {/* DM header */}
                <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-4">
                  <button
                    onClick={() => setMobileSidebar(true)}
                    className="mr-1 rounded-lg p-1 text-muted-fg hover:bg-muted sm:hidden"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <Avatar name={selDmName} isMe={false} size="sm" />
                  <p className="flex-1 truncate text-sm font-semibold">{selDmName}</p>
                  <span className="text-xs text-muted-fg">Direktnachricht</span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1 text-muted-fg hover:bg-muted sm:hidden"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3">
                  <MessageList
                    messages={messages}
                    myId={myId}
                    emptyIcon={
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-brand/10">
                        <MessageCircle className="size-6 text-brand" strokeWidth={1.5} />
                      </div>
                    }
                    emptyText={`Starte eine Unterhaltung mit ${selDmName}`}
                    endRef={messagesEndRef}
                    searchQuery=""
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>

                <MessageInput
                  value={input}
                  onChange={setInput}
                  onSend={sendMessage}
                  placeholder={`Nachricht an ${selDmName}`}
                  textareaRef={textareaRef}
                />
              </>
            )}
          </div>

          {/* ── Right members panel (xl+) ────────────────────────── */}
          {view === "channel" && space && (
            <div className="hidden w-44 shrink-0 flex-col border-l border-border bg-surface xl:flex">
              <div className="flex h-12 items-center gap-2 border-b border-border px-3">
                <Users className="size-4 text-muted-fg" />
                <p className="text-sm font-semibold">Mitglieder</p>
                <span className="ml-auto text-xs text-muted-fg">{space.members.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {space.members.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() =>
                      m.userId !== myId && goToDm(m.userId, m.user.name)
                    }
                    disabled={m.userId === myId}
                    title={m.userId !== myId ? `DM an ${m.user.name}` : undefined}
                    className={cn(
                      "mx-2 flex w-[calc(100%-16px)] items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors",
                      m.userId !== myId && "hover:bg-muted"
                    )}
                  >
                    <Avatar name={m.user.name} isMe={m.userId === myId} size="sm" />
                    <span className="truncate text-xs font-medium">
                      {m.userId === myId ? "Du" : m.user.name}
                    </span>
                    {m.role === "owner" && (
                      <Crown className="ml-auto size-3 shrink-0 text-warning" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
