"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Hash,
  Plus,
  Users,
  MessageCircle,
  Compass,
  ArrowLeft,
  Lock,
  Send,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createSpaceModal,
  joinSpaceModal,
  createChannelModal,
  sendChannelMessageModal,
  sendDmModal,
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

type DmConversation = {
  id: string;
  partner: { id: string; name: string };
};

type OverviewData = {
  hasMasterSpace: boolean;
  mySpaces: SpaceSummary[];
  publicSpaces: PublicSpace[];
  dmConversations: DmConversation[];
  myId: string;
};

type SpaceMember = {
  userId: string;
  role: string;
  user: { id: string; name: string };
};

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
};

type View = "home" | "channel" | "dm";

// ── Constants ─────────────────────────────────────────────────────────────

const PLAN_EMOJI = ["🏠", "🎮", "📚", "🎵", "🎨", "⚽", "🔬", "🌍", "💡", "🚀"];

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
            Dein eigener Discord — Server, Kanäle, Privatchats.
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">MasterSpace</h2>
        <p className="mt-1 text-sm text-muted-fg">
          Spaces, Kanäle & Direktnachrichten
        </p>
      </div>

      {/* My spaces */}
      {overview.mySpaces.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
            Meine Spaces
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {overview.mySpaces.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSpace(s)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-brand/40 hover:bg-surface"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                  {s.emoji}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-fg">
                    {s._count.members}{" "}
                    {s._count.members === 1 ? "Mitglied" : "Mitglieder"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Discover */}
      {overview.publicSpaces.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
            Entdecken
          </h3>
          <div className="flex flex-col gap-2">
            {overview.publicSpaces.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
                  {s.emoji}
                </div>
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

      {/* Create space */}
      <section>
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
          Space erstellen
        </h3>
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
                  <span className="flex size-9 items-center justify-center rounded-lg border border-border text-base transition-colors peer-checked:border-brand peer-checked:bg-brand/10 hover:bg-muted">
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
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Beschreibung</label>
            <input
              name="description"
              type="text"
              maxLength={200}
              placeholder="Worum geht es in diesem Space?"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="size-4" />
              {creating ? "Erstelle…" : "Space erstellen"}
            </button>
          </div>
        </form>
      </section>

      {overview.mySpaces.length === 0 && overview.publicSpaces.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 py-8 text-center text-muted-fg">
          <Compass className="size-10" strokeWidth={1.5} />
          <p className="text-sm">Noch keine Spaces — erstelle den ersten!</p>
        </div>
      )}
    </div>
  );
}

// ── Message renderer ──────────────────────────────────────────────────────

function MessageList({
  messages,
  myId,
  emptyIcon,
  emptyText,
  endRef,
}: {
  messages: Message[];
  myId: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-fg">
        {emptyIcon}
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const showHeader =
          !prev ||
          prev.authorId !== msg.authorId ||
          new Date(msg.sentAt).getTime() - new Date(prev.sentAt).getTime() >
            5 * 60 * 1000;
        const isMe = msg.authorId === myId;
        const authorName = isMe ? "Du" : (msg.author?.name ?? "?");
        const initial = (isMe ? "D" : (msg.author?.name?.[0] ?? "?")).toUpperCase();
        const time = new Date(msg.sentAt).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={msg.id}
            className={cn("flex gap-2.5 px-4", showHeader && i > 0 && "mt-3")}
          >
            {showHeader ? (
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isMe ? "bg-brand/15 text-brand" : "bg-muted text-muted-fg"
                )}
              >
                {initial}
              </div>
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
            </div>
          </div>
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
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="shrink-0 border-t border-border p-3">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-brand/50">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none bg-transparent py-1 text-sm focus:outline-none"
          style={{ maxHeight: "100px" }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim()}
          className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-opacity disabled:opacity-35 hover:opacity-90"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────

export function MasterSpaceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState("");
  const [selSpaceId, setSelSpaceId] = useState<string | null>(null);
  const [selChannelId, setSelChannelId] = useState<string | null>(null);
  const [selDmId, setSelDmId] = useState<string | null>(null);
  const [selDmName, setSelDmName] = useState("");
  const [view, setView] = useState<View>("home");
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(true);
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────

  const fetchOverview = useCallback(async () => {
    const res = await fetch("/api/masterspace").catch(() => null);
    if (!res?.ok) return;
    const data: OverviewData = await res.json();
    setOverview(data);
    setMyId(data.myId ?? "");
  }, []);

  const fetchSpaceDetail = useCallback(async (spaceId: string) => {
    const res = await fetch(`/api/masterspace/${spaceId}`).catch(() => null);
    if (!res?.ok) return;
    const data: SpaceData = await res.json();
    setSpaceData(data);
    if (data.myId) setMyId(data.myId);
  }, []);

  const fetchChannelMessages = useCallback(
    async (spaceId: string, channelId: string) => {
      const res = await fetch(
        `/api/masterspace/${spaceId}/${channelId}/messages`
      ).catch(() => null);
      if (!res?.ok) return;
      const data: { messages: Message[]; myId: string } = await res.json();
      setMessages(data.messages ?? []);
      if (data.myId) setMyId(data.myId);
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
    if (data.myId) setMyId(data.myId);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────

  // Open via custom event from nav
  useEffect(() => {
    const open = () => {
      setIsOpen(true);
      fetchOverview();
    };
    window.addEventListener("ms:open", open);
    return () => window.removeEventListener("ms:open", open);
  }, [fetchOverview]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length]);

  // Polling every 3s
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

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [
    isOpen,
    view,
    selSpaceId,
    selChannelId,
    selDmId,
    fetchChannelMessages,
    fetchDmMessages,
  ]);

  // ── Navigation ────────────────────────────────────────────────────

  function goHome() {
    setSelSpaceId(null);
    setSelChannelId(null);
    setSelDmId(null);
    setView("home");
    setMobileSidebar(true);
    setSpaceData(null);
    fetchOverview();
  }

  function goToChannel(spaceId: string, channelId: string) {
    setSelSpaceId(spaceId);
    setSelChannelId(channelId);
    setView("channel");
    setMessages([]);
    setMobileSidebar(false);
    fetchChannelMessages(spaceId, channelId);
  }

  function selectSpace(space: SpaceSummary) {
    setSelSpaceId(space.id);
    setSpaceData(null);
    fetchSpaceDetail(space.id);
    const first = space.channels[0];
    if (first) {
      goToChannel(space.id, first.id);
    } else {
      setView("home");
      setMobileSidebar(true);
    }
  }

  function clickSpaceIcon(spaceId: string) {
    const space = overview?.mySpaces.find((s) => s.id === spaceId);
    if (space) selectSpace(space);
  }

  function goToDm(partnerId: string, partnerName: string) {
    setSelDmId(partnerId);
    setSelDmName(partnerName);
    setView("dm");
    setMessages([]);
    setMobileSidebar(false);
    fetchDmMessages(partnerId);
  }

  // ── Send message ──────────────────────────────────────────────────

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
  const isAdmin =
    spaceData?.myRole === "owner" || spaceData?.myRole === "admin";
  const channelName = space?.channels.find((c) => c.id === selChannelId)?.name;

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="MasterSpace"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog */}
      <div className="relative flex h-[92dvh] w-full max-h-[820px] max-w-[1120px] overflow-hidden rounded-t-2xl border border-border shadow-2xl sm:h-[88dvh] sm:rounded-2xl">

        {/* ── Col 1: Space icon strip ─────────────────────────── */}
        <div className="flex w-[68px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-muted px-2 py-3">
          {/* Home / compass */}
          <button
            onClick={goHome}
            title="Home"
            className={cn(
              "group relative flex size-10 shrink-0 items-center justify-center rounded-[30%] transition-all duration-200 hover:rounded-xl",
              !selSpaceId
                ? "rounded-xl bg-brand"
                : "bg-surface hover:bg-brand/20"
            )}
          >
            <Compass
              className={cn(
                "size-5 transition-colors",
                !selSpaceId
                  ? "text-white"
                  : "text-muted-fg group-hover:text-brand"
              )}
            />
            {!selSpaceId && (
              <span className="absolute -left-2 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-fg" />
            )}
          </button>

          <div className="my-0.5 h-px w-8 rounded-full bg-border" />

          {/* Space icons */}
          {overview?.mySpaces.map((s) => (
            <button
              key={s.id}
              onClick={() => clickSpaceIcon(s.id)}
              title={s.name}
              className={cn(
                "group relative flex size-10 shrink-0 items-center justify-center rounded-[30%] text-lg transition-all duration-200 hover:rounded-xl",
                selSpaceId === s.id
                  ? "rounded-xl bg-brand"
                  : "bg-surface hover:bg-brand/20"
              )}
            >
              {selSpaceId === s.id ? (
                <span className="text-base filter">{s.emoji}</span>
              ) : (
                <span>{s.emoji}</span>
              )}
              {selSpaceId === s.id && (
                <span className="absolute -left-2 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-fg" />
              )}
            </button>
          ))}

          <div className="my-0.5 h-px w-8 rounded-full bg-border" />

          {/* Create space */}
          <button
            onClick={goHome}
            title="Space erstellen"
            className="group flex size-10 items-center justify-center rounded-[30%] bg-surface text-muted-fg transition-all duration-200 hover:rounded-xl hover:bg-success/15 hover:text-success"
          >
            <Plus className="size-5" />
          </button>
        </div>

        {/* ── Col 2: Channel sidebar ──────────────────────────── */}
        <div
          className={cn(
            "flex w-56 shrink-0 flex-col border-r border-border bg-surface",
            !mobileSidebar && "hidden sm:flex"
          )}
        >
          {/* Header */}
          <div className="flex h-12 items-center justify-between border-b border-border px-3">
            {selSpaceId && space ? (
              <>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base">{space.emoji}</span>
                  <p className="truncate text-sm font-bold">{space.name}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="shrink-0 rounded p-1 text-muted-fg hover:bg-muted hover:text-fg"
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Compass className="size-4 text-brand" />
                  <p className="text-sm font-bold">MasterSpace</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-muted-fg hover:bg-muted hover:text-fg"
                >
                  <X className="size-4" />
                </button>
              </>
            )}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto py-2">
            {selSpaceId && space ? (
              <>
                {/* Channels */}
                <div className="mb-1">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">
                      Kanäle
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => setShowNewChannel((v) => !v)}
                        title="Kanal erstellen"
                        className="rounded p-0.5 text-muted-fg hover:bg-muted hover:text-fg"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* New channel input */}
                  {showNewChannel && (
                    <form
                      className="mx-2 mb-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        fd.set("spaceId", selSpaceId);
                        const result = await createChannelModal(fd);
                        if (result) {
                          setShowNewChannel(false);
                          setNewChannelName("");
                          await fetchSpaceDetail(selSpaceId);
                          goToChannel(selSpaceId, result.channelId);
                        }
                      }}
                    >
                      <input
                        name="name"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="kanal-name"
                        autoFocus
                        className="w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setShowNewChannel(false);
                        }}
                      />
                    </form>
                  )}

                  {space.channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => goToChannel(selSpaceId, ch.id)}
                      className={cn(
                        "mx-1 flex w-[calc(100%-8px)] items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                        ch.id === selChannelId && view === "channel"
                          ? "bg-brand/10 font-semibold text-brand"
                          : "text-muted-fg hover:bg-muted hover:text-fg"
                      )}
                    >
                      <Hash className="size-3.5 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </button>
                  ))}
                </div>

                {/* DMs */}
                {overview?.dmConversations && overview.dmConversations.length > 0 && (
                  <div className="mt-3">
                    <div className="px-3 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">
                        Direktnachrichten
                      </span>
                    </div>
                    {overview.dmConversations.map((dm) => (
                      <button
                        key={dm.id}
                        onClick={() => goToDm(dm.partner.id, dm.partner.name)}
                        className={cn(
                          "mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                          selDmId === dm.partner.id && view === "dm"
                            ? "bg-brand/10 font-semibold text-brand"
                            : "text-muted-fg hover:bg-muted hover:text-fg"
                        )}
                      >
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-fg">
                          {dm.partner.name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="truncate">{dm.partner.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Home sidebar */
              <>
                {overview?.mySpaces && overview.mySpaces.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">
                        Meine Spaces
                      </span>
                    </div>
                    {overview.mySpaces.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => selectSpace(s)}
                        className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted-fg transition-colors hover:bg-muted hover:text-fg"
                      >
                        <span className="text-base">{s.emoji}</span>
                        <span className="truncate font-medium">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {overview?.dmConversations && overview.dmConversations.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">
                        Direktnachrichten
                      </span>
                    </div>
                    {overview.dmConversations.map((dm) => (
                      <button
                        key={dm.id}
                        onClick={() => goToDm(dm.partner.id, dm.partner.name)}
                        className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted-fg transition-colors hover:bg-muted hover:text-fg"
                      >
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-fg">
                          {dm.partner.name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="truncate">{dm.partner.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Members count footer */}
          {selSpaceId && space && (
            <div className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-xs text-muted-fg">
              <Users className="size-3.5" />
              {space.members.length}{" "}
              {space.members.length === 1 ? "Mitglied" : "Mitglieder"}
            </div>
          )}
        </div>

        {/* ── Col 3: Main content ─────────────────────────────── */}
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
                  className="mr-1 rounded p-1 text-muted-fg hover:bg-muted hover:text-fg sm:hidden"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <Hash className="size-4 shrink-0 text-muted-fg" />
                <p className="flex-1 truncate font-semibold">{channelName}</p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-muted-fg hover:bg-muted hover:text-fg sm:hidden"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4">
                <MessageList
                  messages={messages}
                  myId={myId}
                  emptyIcon={<Hash className="size-8" strokeWidth={1.5} />}
                  emptyText={`Schreib die erste Nachricht in #${channelName}`}
                  endRef={messagesEndRef}
                />
              </div>

              {/* Input */}
              <MessageInput
                value={input}
                onChange={setInput}
                onSend={sendMessage}
                placeholder={`Nachricht in #${channelName}`}
                textareaRef={textareaRef}
              />
            </>
          ) : (
            <>
              {/* DM header */}
              <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-4">
                <button
                  onClick={() => setMobileSidebar(true)}
                  className="mr-1 rounded p-1 text-muted-fg hover:bg-muted hover:text-fg sm:hidden"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                  {selDmName[0]?.toUpperCase() ?? "?"}
                </div>
                <p className="flex-1 truncate font-semibold">{selDmName}</p>
                <span className="text-xs text-muted-fg">Direktnachricht</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-muted-fg hover:bg-muted hover:text-fg sm:hidden"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* DM messages */}
              <div className="flex-1 overflow-y-auto py-4">
                <MessageList
                  messages={messages}
                  myId={myId}
                  emptyIcon={<MessageCircle className="size-8" strokeWidth={1.5} />}
                  emptyText={`Starte eine Unterhaltung mit ${selDmName}`}
                  endRef={messagesEndRef}
                />
              </div>

              {/* DM input */}
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

        {/* ── Col 4: Members panel (xl+) ─────────────────────── */}
        {view === "channel" && space && (
          <div className="hidden w-44 shrink-0 flex-col border-l border-border bg-surface xl:flex">
            <div className="flex h-12 items-center gap-2 border-b border-border px-3">
              <Users className="size-4 text-muted-fg" />
              <p className="text-sm font-semibold">Mitglieder</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {space.members.map((m) => (
                <button
                  key={m.userId}
                  onClick={() =>
                    m.userId !== myId && goToDm(m.userId, m.user.name)
                  }
                  disabled={m.userId === myId}
                  className={cn(
                    "mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    m.userId !== myId && "hover:bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      m.userId === myId
                        ? "bg-brand/15 text-brand"
                        : "bg-muted text-muted-fg"
                    )}
                  >
                    {m.user.name[0]?.toUpperCase() ?? "?"}
                  </div>
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
  );
}
