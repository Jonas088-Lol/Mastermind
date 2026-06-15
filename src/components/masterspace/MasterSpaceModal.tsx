"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Fragment,
} from "react";
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
  Volume2,
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  UserPlus,
  UserCheck,
  UserX,
  Circle,
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
  joinVoiceModal,
  leaveVoiceModal,
  leaveAllVoiceModal,
  setMuteModal,
  setDeafModal,
  setScreenShareModal,
  sendFriendRequestModal,
  acceptFriendModal,
  declineFriendModal,
  searchUsersModal,
} from "@/app/app/masterspace/modal-actions";

// ── Types ─────────────────────────────────────────────────────────────────

type SpaceChannel = {
  id: string;
  name: string;
  type: string;
  position: number;
  _count?: { voiceParticipants: number };
};

type SpaceSummary = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  channels: SpaceChannel[];
  _count: { members: number };
};

type PublicSpace = { id: string; name: string; emoji: string; _count: { members: number } };

type DmConversation = { id: string; partner: { id: string; name: string } };

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
  user: { id: string; name: string; lastSeenAt?: string | null };
};

type SpaceDetail = {
  id: string;
  name: string;
  emoji: string;
  channels: SpaceChannel[];
  members: SpaceMember[];
};

type SpaceData = { space: SpaceDetail; myRole: "owner" | "admin" | "member"; myId: string };

type Message = {
  id: string;
  content: string;
  authorId: string;
  author: { id?: string; name: string };
  sentAt: string;
  editedAt?: string | null;
};

type VoiceParticipant = {
  id: string;
  userId: string;
  isMuted: boolean;
  isDeaf: boolean;
  isSharingScreen: boolean;
  user: { id: string; name: string };
};

type Friend = { id: string; user: { id: string; name: string }; online: boolean };
type FriendRequest = { id: string; from: { id: string; name: string } };
type FriendData = {
  friends: Friend[];
  pendingReceived: FriendRequest[];
  pendingSent: { id: string; to: { id: string; name: string } }[];
  myId: string;
};

type View = "home" | "channel" | "dm" | "voice" | "friends";

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

function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return new Date(lastSeenAt) >= new Date(Date.now() - 5 * 60 * 1000);
}

function Avatar({
  name,
  isMe,
  online,
  size = "md",
}: {
  name: string;
  isMe: boolean;
  online?: boolean;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "size-5 text-[9px]" : "size-8 text-xs";
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-bold",
          cls,
          isMe ? "bg-brand/15 text-brand" : "bg-muted text-muted-fg"
        )}
      >
        {(isMe ? "D" : name[0] ?? "?").toUpperCase()}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-bg",
            online ? "bg-green-500" : "bg-muted-fg/40"
          )}
        />
      )}
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
  voiceChannelName,
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
  voiceChannelName?: string;
}) {
  const lastMsgs = messages.slice(-4);

  return (
    <div className="fixed bottom-20 right-3 z-200 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:bottom-5 sm:right-5">
      <div className="flex items-center gap-2 border-b border-border bg-bg px-3 py-2.5">
        <span className="text-base leading-none">{emoji}</span>
        <p className="flex-1 truncate text-xs font-semibold">{label}</p>
        {voiceChannelName && (
          <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-500">
            <span className="size-1.5 rounded-full bg-green-500" />
            {voiceChannelName}
          </span>
        )}
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
                  {msg.content.length > 70 ? msg.content.slice(0, 70) + "…" : msg.content}
                </span>
              </p>
            );
          })}
        </div>
      )}

      {hasContext && (
        <div className="border-t border-border px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
            <input
              value={quickInput}
              onChange={(e) => onQuickInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
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
  onGoFriends,
}: {
  overview: OverviewData | null;
  creating: boolean;
  onCreateSpace: (e: React.FormEvent<HTMLFormElement>) => void;
  onJoinSpace: (spaceId: string) => void;
  onSelectSpace: (space: SpaceSummary) => void;
  onGoFriends: () => void;
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
          <p className="mt-1 text-sm text-muted-fg">Spaces, Kanäle & Direktnachrichten — nur ab Pro.</p>
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
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">Meine Spaces</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {overview.mySpaces.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSpace(s)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-brand/30 hover:shadow-sm"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">{s.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  {s.description && <p className="truncate text-xs text-muted-fg">{s.description}</p>}
                  <p className="text-xs text-muted-fg">{s._count.members} Mitglieder · {s.channels.length} Kanäle</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {overview.publicSpaces.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">Spaces entdecken</p>
          <div className="flex flex-col gap-2">
            {overview.publicSpaces.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">{s.emoji}</span>
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

      <section className="mb-6">
        <button
          onClick={onGoFriends}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-brand/30 hover:shadow-sm"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
            <UserPlus className="size-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold">Freunde</p>
            <p className="text-xs text-muted-fg">Freunde hinzufügen, Anfragen verwalten</p>
          </div>
        </button>
      </section>

      <section>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">Neuen Space erstellen</p>
        <form onSubmit={onCreateSpace} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-fg">Icon</p>
            <div className="flex flex-wrap gap-1.5">
              {PLAN_EMOJI.map((e, i) => (
                <label key={e} className="cursor-pointer">
                  <input type="radio" name="emoji" value={e} defaultChecked={i === 0} className="sr-only peer" />
                  <span className="flex size-9 items-center justify-center rounded-xl border border-border text-base transition-all peer-checked:border-brand peer-checked:bg-brand/10 hover:bg-muted">{e}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name *</label>
            <input name="name" type="text" required maxLength={50} placeholder="z.B. Klasse 10a" className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Beschreibung</label>
            <input name="description" type="text" maxLength={200} placeholder="Worum geht es?" className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={creating} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
              <Plus className="size-4" />
              {creating ? "Erstelle…" : "Space erstellen"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// ── Voice view ────────────────────────────────────────────────────────────

function VoiceView({
  participants,
  myId,
  channelName,
  isMuted,
  isDeaf,
  isSharingScreen,
  screenStream,
  onToggleMute,
  onToggleDeaf,
  onToggleScreenShare,
  onLeave,
  onDm,
}: {
  participants: VoiceParticipant[];
  myId: string;
  channelName: string;
  isMuted: boolean;
  isDeaf: boolean;
  isSharingScreen: boolean;
  screenStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleDeaf: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onDm: (userId: string, name: string) => void;
}) {
  const screenRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (screenRef.current && screenStream) {
      screenRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Screen share preview */}
      {isSharingScreen && screenStream && (
        <div className="shrink-0 border-b border-border bg-black p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Du teilst deinen Bildschirm</p>
          <video
            ref={screenRef}
            autoPlay
            muted
            playsInline
            className="max-h-48 w-full rounded-xl object-contain"
          />
        </div>
      )}

      {/* Participants grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-fg">{channelName}</p>
        <p className="mb-5 text-xs text-muted-fg">{participants.length} Teilnehmer · Audioübertragung benötigt WebRTC</p>

        {participants.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-fg">
            <Volume2 className="size-10" strokeWidth={1.5} />
            <p className="text-sm">Noch niemand im Sprachkanal</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {participants.map((p) => {
              const isMe = p.userId === myId;
              return (
                <button
                  key={p.userId}
                  onClick={() => !isMe && onDm(p.userId, p.user.name)}
                  disabled={isMe}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all",
                    isMe
                      ? "border-brand/30 bg-brand/5"
                      : "border-border bg-surface hover:border-brand/30 hover:bg-muted/30",
                    p.isSharingScreen && "ring-2 ring-green-500/40"
                  )}
                >
                  <div className="relative">
                    <div className={cn(
                      "flex size-14 items-center justify-center rounded-full text-xl font-bold",
                      isMe ? "bg-brand/20 text-brand" : "bg-muted text-muted-fg",
                      p.isSharingScreen && "ring-2 ring-green-500"
                    )}>
                      {p.user.name[0]?.toUpperCase()}
                    </div>
                    {p.isMuted && (
                      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-danger text-white">
                        <MicOff className="size-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate w-full text-center">{isMe ? "Du" : p.user.name}</p>
                  <div className="flex items-center gap-1.5">
                    {p.isMuted && <MicOff className="size-3 text-danger" />}
                    {p.isDeaf && <HeadphoneOff className="size-3 text-warning" />}
                    {p.isSharingScreen && <Monitor className="size-3 text-green-500" />}
                    {!p.isMuted && !p.isDeaf && !p.isSharingScreen && (
                      <Circle className="size-2 fill-green-500 text-green-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Voice controls */}
      <div className="shrink-0 border-t border-border bg-surface px-5 py-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onToggleMute}
            title={isMuted ? "Mikrofon einschalten" : "Stummschalten"}
            className={cn(
              "flex size-12 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-all hover:opacity-90",
              isMuted
                ? "border-danger/30 bg-danger text-white"
                : "border-border bg-muted text-fg hover:border-brand/30"
            )}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          <button
            onClick={onToggleDeaf}
            title={isDeaf ? "Audio einschalten" : "Audio stummen"}
            className={cn(
              "flex size-12 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-all hover:opacity-90",
              isDeaf
                ? "border-warning/30 bg-warning text-white"
                : "border-border bg-muted text-fg hover:border-brand/30"
            )}
          >
            {isDeaf ? <HeadphoneOff className="size-5" /> : <Headphones className="size-5" />}
          </button>

          <button
            onClick={onToggleScreenShare}
            title={isSharingScreen ? "Teilen beenden" : "Bildschirm teilen"}
            className={cn(
              "flex size-12 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-all hover:opacity-90",
              isSharingScreen
                ? "border-green-500/30 bg-green-500 text-white"
                : "border-border bg-muted text-fg hover:border-brand/30"
            )}
          >
            {isSharingScreen ? <MonitorOff className="size-5" /> : <Monitor className="size-5" />}
          </button>

          <button
            onClick={onLeave}
            title="Sprachkanal verlassen"
            className="flex size-12 flex-col items-center justify-center gap-0.5 rounded-2xl border border-danger/30 bg-danger text-white transition-all hover:opacity-90"
          >
            <PhoneOff className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-fg">
          {isMuted ? "Mikrofon stumm" : "Mikrofon aktiv"} · {isDeaf ? "Audio stumm" : "Audio aktiv"}
        </p>
      </div>
    </div>
  );
}

// ── Friends view ──────────────────────────────────────────────────────────

function FriendsView({
  data,
  onDm,
  onAccept,
  onDecline,
  onRefresh,
}: {
  data: FriendData | null;
  onDm: (userId: string, name: string) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  async function handleSearch(q: string) {
    setQuery(q);
    setAddStatus(null);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const res = await searchUsersModal(q);
    setResults(res);
    setSearching(false);
  }

  async function handleAdd(userId: string, name: string) {
    const res = await sendFriendRequestModal(userId);
    if (res.ok) {
      setAddStatus(`Anfrage an ${name} gesendet`);
      setQuery("");
      setResults([]);
      onRefresh();
    } else {
      setAddStatus(res.message ?? "Fehler");
    }
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const onlineFriends = data.friends.filter((f) => f.online);
  const offlineFriends = data.friends.filter((f) => !f.online);

  return (
    <div className="flex-1 overflow-y-auto p-5">
      {/* Add friend search */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-fg">Freund hinzufügen</p>
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5">
            <Search className="size-3.5 shrink-0 text-muted-fg" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Nach Name suchen…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            {searching && <div className="size-3.5 animate-spin rounded-full border border-brand border-t-transparent" />}
          </div>
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
              {results.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted">
                  <Avatar name={u.name} isMe={false} size="sm" />
                  <span className="flex-1 text-sm">{u.name}</span>
                  <button
                    onClick={() => handleAdd(u.id, u.name)}
                    className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <UserPlus className="size-3" />
                    Hinzufügen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {addStatus && <p className="mt-2 text-xs text-muted-fg">{addStatus}</p>}
      </div>

      {/* Pending requests */}
      {data.pendingReceived.length > 0 && (
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
            Anfragen ({data.pendingReceived.length})
          </p>
          <div className="flex flex-col gap-2">
            {data.pendingReceived.map((req) => (
              <div key={req.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <Avatar name={req.from.name} isMe={false} size="sm" />
                <p className="flex-1 text-sm font-medium">{req.from.name}</p>
                <button
                  onClick={() => { onAccept(req.id); onRefresh(); }}
                  className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <UserCheck className="size-3" />
                  Annehmen
                </button>
                <button
                  onClick={() => { onDecline(req.id); onRefresh(); }}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-fg hover:bg-muted"
                >
                  <UserX className="size-3" />
                  Ablehnen
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sent pending */}
      {data.pendingSent.length > 0 && (
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-fg">Gesendet</p>
          <div className="flex flex-col gap-1.5">
            {data.pendingSent.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
                <Avatar name={s.to.name} isMe={false} size="sm" />
                <p className="flex-1 text-sm text-muted-fg">{s.to.name}</p>
                <span className="text-xs text-muted-fg">Ausstehend</span>
                <button onClick={() => { onDecline(s.id); onRefresh(); }} className="rounded-lg p-1 text-muted-fg hover:text-danger">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Online friends */}
      {onlineFriends.length > 0 && (
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
            Online — {onlineFriends.length}
          </p>
          <div className="flex flex-col gap-1.5">
            {onlineFriends.map((f) => (
              <button
                key={f.id}
                onClick={() => onDm(f.user.id, f.user.name)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-left hover:border-brand/30 hover:bg-muted/20"
              >
                <Avatar name={f.user.name} isMe={false} online={true} size="sm" />
                <p className="flex-1 text-sm font-medium">{f.user.name}</p>
                <MessageCircle className="size-4 text-muted-fg" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Offline friends */}
      {offlineFriends.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-fg">
            Offline — {offlineFriends.length}
          </p>
          <div className="flex flex-col gap-1.5">
            {offlineFriends.map((f) => (
              <button
                key={f.id}
                onClick={() => onDm(f.user.id, f.user.name)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-left hover:border-brand/30 hover:bg-muted/20"
              >
                <Avatar name={f.user.name} isMe={false} online={false} size="sm" />
                <p className="flex-1 text-sm text-muted-fg">{f.user.name}</p>
                <MessageCircle className="size-4 text-muted-fg" />
              </button>
            ))}
          </div>
        </section>
      )}

      {data.friends.length === 0 && data.pendingReceived.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-fg">
          <Users className="size-10" strokeWidth={1.5} />
          <p className="text-sm">Noch keine Freunde — suche nach Namen oben</p>
        </div>
      )}
    </div>
  );
}

// ── Message list ──────────────────────────────────────────────────────────

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
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
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
        const time = msgDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

        return (
          <Fragment key={msg.id}>
            {showDay && (
              <div className="my-3 flex items-center gap-3 px-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{dayLabel}</span>
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
                    <span className={cn("text-sm font-semibold", isMe ? "text-brand" : "text-fg")}>
                      {authorName}
                    </span>
                    <span className="text-[10px] text-muted-fg">{time}</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                {msg.editedAt && <span className="text-[10px] text-muted-fg">(bearbeitet)</span>}
              </div>
              {hovered === msg.id && isMe && (
                <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-1 rounded-lg border border-border bg-surface px-1.5 py-1 shadow-md">
                  <button onClick={() => onEdit(msg)} title="Bearbeiten" className="rounded p-1 text-muted-fg hover:bg-muted hover:text-fg">
                    <Pencil className="size-3.5" />
                  </button>
                  <button onClick={() => onDelete(msg.id)} title="Löschen" className="rounded p-1 text-muted-fg hover:bg-danger hover:text-white">
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
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
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

// ── Voice status bar (shown at bottom while connected to voice) ───────────

function VoiceBar({
  channelName,
  spaceName,
  isMuted,
  isDeaf,
  isSharingScreen,
  onOpen,
  onToggleMute,
  onToggleDeaf,
  onLeave,
}: {
  channelName: string;
  spaceName: string;
  isMuted: boolean;
  isDeaf: boolean;
  isSharingScreen: boolean;
  onOpen: () => void;
  onToggleMute: () => void;
  onToggleDeaf: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-green-500/20 bg-green-500/5 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <button onClick={onOpen} className="flex flex-1 items-center gap-2 text-left">
          <span className="flex size-2 shrink-0 rounded-full bg-green-500" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-green-600">{channelName}</p>
            <p className="truncate text-[10px] text-muted-fg">{spaceName}</p>
          </div>
          {isSharingScreen && (
            <Monitor className="size-3.5 shrink-0 text-green-500" />
          )}
        </button>
        <button
          onClick={onToggleMute}
          title={isMuted ? "Mikrofon einschalten" : "Stummschalten"}
          className={cn(
            "rounded-lg p-1.5 transition-colors",
            isMuted ? "bg-danger text-white" : "text-muted-fg hover:bg-muted hover:text-fg"
          )}
        >
          {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
        <button
          onClick={onToggleDeaf}
          title={isDeaf ? "Audio einschalten" : "Audio stummen"}
          className={cn(
            "rounded-lg p-1.5 transition-colors",
            isDeaf ? "bg-warning text-white" : "text-muted-fg hover:bg-muted hover:text-fg"
          )}
        >
          {isDeaf ? <HeadphoneOff className="size-4" /> : <Headphones className="size-4" />}
        </button>
        <button
          onClick={onLeave}
          title="Verlassen"
          className="rounded-lg p-1.5 text-danger transition-colors hover:bg-danger hover:text-white"
        >
          <PhoneOff className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────

export function MasterSpaceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [quickInput, setQuickInput] = useState("");

  // Data
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState("");
  const [friendData, setFriendData] = useState<FriendData | null>(null);

  // Navigation
  const [selSpaceId, setSelSpaceId] = useState<string | null>(null);
  const [selChannelId, setSelChannelId] = useState<string | null>(null);
  const [selDmId, setSelDmId] = useState<string | null>(null);
  const [selDmName, setSelDmName] = useState("");
  const [view, setView] = useState<View>("home");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [mobileSidebar, setMobileSidebar] = useState(true);

  // Input / UI
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const [showNewChannel, setShowNewChannel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");

  // Voice state
  const [voiceChannelId, setVoiceChannelId] = useState<string | null>(null);
  const [voiceSpaceId, setVoiceSpaceId] = useState<string | null>(null);
  const [voiceChannelName, setVoiceChannelName] = useState("");
  const [voiceSpaceName, setVoiceSpaceName] = useState("");
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeaf, setIsDeaf] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voicePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetchers ────────────────────────────────────────────────────

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

  const fetchChannelMessages = useCallback(async (spaceId: string, channelId: string) => {
    const res = await fetch(`/api/masterspace/${spaceId}/${channelId}/messages`).catch(() => null);
    if (!res?.ok) return;
    const data: { messages: Message[]; myId: string } = await res.json();
    setMessages(data.messages ?? []);
    setMyId((p) => p || data.myId);
  }, []);

  const fetchDmMessages = useCallback(async (partnerId: string) => {
    const res = await fetch(`/api/masterspace/dm/${partnerId}/messages`).catch(() => null);
    if (!res?.ok) return;
    const data: { messages: Message[]; myId: string } = await res.json();
    setMessages(data.messages ?? []);
    setMyId((p) => p || data.myId);
  }, []);

  const fetchVoiceParticipants = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/masterspace/voice/${channelId}`).catch(() => null);
    if (!res?.ok) return;
    const data: { participants: VoiceParticipant[]; myId: string } = await res.json();
    setVoiceParticipants(data.participants ?? []);
  }, []);

  const fetchFriends = useCallback(async () => {
    const res = await fetch("/api/masterspace/friends").catch(() => null);
    if (!res?.ok) return;
    const data: FriendData = await res.json();
    setFriendData(data);
    setMyId((p) => p || data.myId);
  }, []);

  // ── Effects ─────────────────────────────────────────────────────

  useEffect(() => {
    const open = () => { setIsOpen(true); setIsMinimized(false); fetchOverview(); };
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

  // Message polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!isOpen) return;
    if (view === "channel" && selSpaceId && selChannelId) {
      pollRef.current = setInterval(() => fetchChannelMessages(selSpaceId, selChannelId), 3000);
    } else if (view === "dm" && selDmId) {
      pollRef.current = setInterval(() => fetchDmMessages(selDmId), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen, view, selSpaceId, selChannelId, selDmId, fetchChannelMessages, fetchDmMessages]);

  // Voice participant polling
  useEffect(() => {
    if (voicePollRef.current) clearInterval(voicePollRef.current);
    if (!voiceChannelId) return;
    fetchVoiceParticipants(voiceChannelId);
    voicePollRef.current = setInterval(() => fetchVoiceParticipants(voiceChannelId), 3000);
    return () => { if (voicePollRef.current) clearInterval(voicePollRef.current); };
  }, [voiceChannelId, fetchVoiceParticipants]);

  // Cleanup screen stream on unmount
  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach((t) => t.stop());
      if (voiceChannelId) leaveAllVoiceModal().catch(() => null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation ───────────────────────────────────────────────────

  function toggleExpand(spaceId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(spaceId) ? next.delete(spaceId) : next.add(spaceId);
      return next;
    });
  }

  function goHome() {
    setSelSpaceId(null); setSelChannelId(null); setSelDmId(null);
    setView("home"); setMobileSidebar(true); setSpaceData(null);
    setMessages([]); setSearchQuery(""); setShowSearch(false);
    fetchOverview();
  }

  function goToChannel(spaceId: string, channelId: string) {
    setSelSpaceId(spaceId); setSelChannelId(channelId);
    setView("channel"); setMessages([]);
    setMobileSidebar(false); setSearchQuery(""); setShowSearch(false);
    setEditingMsg(null);
    setExpandedIds((prev) => new Set([...prev, spaceId]));
    fetchChannelMessages(spaceId, channelId);
    if (selSpaceId !== spaceId) fetchSpaceDetail(spaceId);
  }

  function selectSpace(space: SpaceSummary) {
    setSelSpaceId(space.id); setSpaceData(null);
    fetchSpaceDetail(space.id);
    setExpandedIds((prev) => new Set([...prev, space.id]));
    const first = space.channels.find((c) => c.type === "text") ?? space.channels[0];
    if (first && first.type === "text") {
      goToChannel(space.id, first.id);
    } else {
      setView("home"); setMobileSidebar(true);
    }
  }

  function goToDm(partnerId: string, partnerName: string) {
    setSelDmId(partnerId); setSelDmName(partnerName);
    setView("dm"); setMessages([]);
    setMobileSidebar(false); setSearchQuery(""); setShowSearch(false);
    setEditingMsg(null);
    fetchDmMessages(partnerId);
  }

  function goToFriends() {
    setView("friends"); setMobileSidebar(false);
    fetchFriends();
  }

  // ── Messaging ────────────────────────────────────────────────────

  function sendMessage() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    textareaRef.current?.focus();
    if (view === "channel" && selSpaceId && selChannelId) {
      sendChannelMessageModal(selChannelId, content).then(() => fetchChannelMessages(selSpaceId, selChannelId));
    } else if (view === "dm" && selDmId) {
      sendDmModal(selDmId, content).then(() => fetchDmMessages(selDmId));
    }
  }

  function sendQuick() {
    const content = quickInput.trim();
    if (!content) return;
    setQuickInput("");
    if (view === "channel" && selSpaceId && selChannelId) {
      sendChannelMessageModal(selChannelId, content).then(() => fetchChannelMessages(selSpaceId, selChannelId));
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

  // ── Voice ────────────────────────────────────────────────────────

  async function joinVoice(spaceId: string, channelId: string, channelName: string, spaceName: string) {
    // Leave current voice first
    if (voiceChannelId) {
      await leaveVoiceModal(voiceChannelId);
    }
    await joinVoiceModal(channelId);
    setVoiceChannelId(channelId);
    setVoiceSpaceId(spaceId);
    setVoiceChannelName(channelName);
    setVoiceSpaceName(spaceName);
    setIsMuted(false); setIsDeaf(false);
    setView("voice"); setMobileSidebar(false);
    fetchVoiceParticipants(channelId);
  }

  async function leaveVoice() {
    if (!voiceChannelId) return;
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    if (isSharingScreen) await setScreenShareModal(voiceChannelId, false).catch(() => null);
    await leaveVoiceModal(voiceChannelId);
    setVoiceChannelId(null); setVoiceSpaceId(null);
    setVoiceChannelName(""); setVoiceSpaceName("");
    setVoiceParticipants([]);
    setIsMuted(false); setIsDeaf(false); setIsSharingScreen(false);
    if (view === "voice") goHome();
  }

  async function toggleMute() {
    if (!voiceChannelId) return;
    const next = !isMuted;
    setIsMuted(next);
    await setMuteModal(voiceChannelId, next);
  }

  async function toggleDeaf() {
    if (!voiceChannelId) return;
    const next = !isDeaf;
    setIsDeaf(next);
    await setDeafModal(voiceChannelId, next);
  }

  async function toggleScreenShare() {
    if (!voiceChannelId) return;
    if (isSharingScreen) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsSharingScreen(false);
      await setScreenShareModal(voiceChannelId, false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "monitor" },
          audio: false,
        });
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null); setIsSharingScreen(false);
          setScreenShareModal(voiceChannelId, false).catch(() => null);
        };
        setScreenStream(stream);
        setIsSharingScreen(true);
        await setScreenShareModal(voiceChannelId, true);
      } catch {
        // User cancelled picker
      }
    }
  }

  // ── Computed ─────────────────────────────────────────────────────

  const space = spaceData?.space;
  const isAdmin = spaceData?.myRole === "owner" || spaceData?.myRole === "admin";
  const channelName = space?.channels.find((c) => c.id === selChannelId)?.name;
  const memberAvatars = space?.members.slice(0, 5) ?? [];

  const widgetLabel =
    view === "channel" && space && channelName ? `${space.name} · #${channelName}`
    : view === "dm" && selDmName ? selDmName
    : view === "voice" ? voiceChannelName
    : "MasterSpace";
  const widgetEmoji =
    view === "channel" && space ? space.emoji
    : view === "dm" ? "💬"
    : view === "voice" ? "🔊"
    : "◈";

  // ── Minimized widget ─────────────────────────────────────────────

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
        hasContext={view !== "home" && view !== "friends" && view !== "voice"}
        voiceChannelName={voiceChannelId ? voiceChannelName : undefined}
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
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setIsMinimized(true)} />

      <div className="relative flex h-[93dvh] w-full max-h-210 max-w-280 flex-col overflow-hidden rounded-t-2xl border border-border bg-bg shadow-2xl sm:h-[88dvh] sm:rounded-2xl">

        {/* Top header */}
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
          {view === "voice" && (
            <div className="flex items-center gap-1 text-xs text-muted-fg">
              <span className="mx-1 opacity-40">·</span>
              <Volume2 className="size-3 text-green-500" />
              <span className="font-medium text-green-600">{voiceChannelName}</span>
            </div>
          )}
          {view === "friends" && (
            <div className="flex items-center gap-1 text-xs text-muted-fg">
              <span className="mx-1 opacity-40">·</span>
              <span className="font-medium text-fg">Freunde</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-0.5">
            <button onClick={() => setIsMinimized(true)} title="Minimieren" className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-muted hover:text-fg">
              <Minus className="size-4" />
            </button>
            <button onClick={() => setIsOpen(false)} title="Schließen" className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-muted hover:text-fg">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body row */}
        <div className="flex min-h-0 flex-1">

          {/* Left sidebar */}
          <div className={cn("flex w-60 shrink-0 flex-col border-r border-border bg-surface", !mobileSidebar && "hidden sm:flex")}>
            <div className="flex-1 overflow-y-auto py-2">

              {/* Home button */}
              <button
                onClick={goHome}
                className={cn(
                  "mx-2 mb-1 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  view === "home" ? "bg-brand/10 text-brand" : "text-muted-fg hover:bg-muted hover:text-fg"
                )}
              >
                <Compass className="size-4 shrink-0" strokeWidth={1.75} />
                <span>Übersicht</span>
              </button>

              {/* Friends shortcut */}
              <button
                onClick={goToFriends}
                className={cn(
                  "mx-2 mb-1 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  view === "friends" ? "bg-brand/10 text-brand" : "text-muted-fg hover:bg-muted hover:text-fg"
                )}
              >
                <UserPlus className="size-4 shrink-0" strokeWidth={1.75} />
                <span>Freunde</span>
                {friendData && friendData.pendingReceived.length > 0 && (
                  <span className="ml-auto flex size-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
                    {friendData.pendingReceived.length}
                  </span>
                )}
              </button>

              {/* Spaces tree */}
              {overview?.mySpaces && overview.mySpaces.length > 0 && (
                <div className="mb-2">
                  <p className="px-5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">Spaces</p>
                  {overview.mySpaces.map((s) => {
                    const expanded = expandedIds.has(s.id);
                    const isActiveSpace = selSpaceId === s.id;
                    const currentSpace = spaceData?.space.id === s.id ? spaceData.space : null;
                    const channels = currentSpace?.channels ?? s.channels;

                    return (
                      <div key={s.id}>
                        <div className="flex items-center">
                          <button onClick={() => toggleExpand(s.id)} className="ml-2 flex h-8 w-5 items-center justify-center rounded text-muted-fg hover:text-fg">
                            <ChevronRight className={cn("size-3.5 transition-transform duration-150", expanded && "rotate-90")} />
                          </button>
                          <button
                            onClick={() => selectSpace(s)}
                            className={cn(
                              "flex flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-all mr-2",
                              isActiveSpace && view !== "dm" && view !== "friends"
                                ? "font-semibold text-fg" : "text-muted-fg hover:bg-muted hover:text-fg"
                            )}
                          >
                            <span className="text-base leading-none">{s.emoji}</span>
                            <span className="flex-1 truncate">{s.name}</span>
                            <span className="text-[10px] text-muted-fg">{s._count.members}</span>
                          </button>
                        </div>

                        {expanded && (
                          <div className="ml-9 mb-1 border-l border-border pl-2">
                            {/* Text channels */}
                            {channels.filter((c) => c.type !== "voice").map((ch) => {
                              const active = selChannelId === ch.id && selSpaceId === s.id && view === "channel";
                              return (
                                <button
                                  key={ch.id}
                                  onClick={() => goToChannel(s.id, ch.id)}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all",
                                    active ? "bg-brand/10 font-semibold text-brand" : "text-muted-fg hover:bg-muted hover:text-fg"
                                  )}
                                >
                                  <Hash className={cn("size-3.5 shrink-0", active ? "text-brand" : "text-muted-fg/50")} />
                                  <span className="truncate">{ch.name}</span>
                                </button>
                              );
                            })}

                            {/* Voice channels */}
                            {channels.filter((c) => c.type === "voice").map((ch) => {
                              const inThisVoice = voiceChannelId === ch.id;
                              const count = ch._count?.voiceParticipants ?? 0;
                              return (
                                <button
                                  key={ch.id}
                                  onClick={() => {
                                    const sName = overview.mySpaces.find((sp) => sp.id === s.id)?.name ?? s.name;
                                    joinVoice(s.id, ch.id, ch.name, sName);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all",
                                    inThisVoice ? "bg-green-500/10 font-semibold text-green-600" : "text-muted-fg hover:bg-muted hover:text-fg"
                                  )}
                                >
                                  <Volume2 className={cn("size-3.5 shrink-0", inThisVoice ? "text-green-500" : "text-muted-fg/50")} />
                                  <span className="flex-1 truncate">{ch.name}</span>
                                  {count > 0 && <span className="text-[10px] text-muted-fg">{count}</span>}
                                </button>
                              );
                            })}

                            {/* Add channel */}
                            {isAdmin && selSpaceId === s.id && (
                              showNewChannel === s.id ? (
                                <form
                                  className="mr-1 mt-1 flex flex-col gap-1.5"
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    fd.set("spaceId", s.id);
                                    fd.set("type", newChannelType);
                                    const result = await createChannelModal(fd);
                                    if (result) {
                                      setShowNewChannel(null);
                                      setNewChannelName("");
                                      await fetchSpaceDetail(s.id);
                                      await fetchOverview();
                                      if (newChannelType === "text") goToChannel(s.id, result.channelId);
                                    }
                                  }}
                                >
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => setNewChannelType("text")} className={cn("flex-1 rounded-lg border px-2 py-1 text-[10px]", newChannelType === "text" ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-fg")}>
                                      # Text
                                    </button>
                                    <button type="button" onClick={() => setNewChannelType("voice")} className={cn("flex-1 rounded-lg border px-2 py-1 text-[10px]", newChannelType === "voice" ? "border-green-500 bg-green-500/10 text-green-600" : "border-border text-muted-fg")}>
                                      🔊 Sprache
                                    </button>
                                  </div>
                                  <input
                                    name="name"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    placeholder="kanal-name"
                                    autoFocus
                                    className="w-full rounded-lg border border-border bg-bg px-2.5 py-1 text-xs focus:border-brand focus:outline-none"
                                    onKeyDown={(e) => { if (e.key === "Escape") setShowNewChannel(null); }}
                                  />
                                </form>
                              ) : (
                                <button onClick={() => setShowNewChannel(s.id)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-muted-fg hover:text-fg">
                                  <Plus className="size-3" />
                                  Kanal hinzufügen
                                </button>
                              )
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
                  <p className="px-5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-fg">Direktnachrichten</p>
                  {overview.dmConversations.map((dm) => {
                    const active = selDmId === dm.partner.id && view === "dm";
                    return (
                      <button
                        key={dm.id}
                        onClick={() => goToDm(dm.partner.id, dm.partner.name)}
                        className={cn(
                          "mx-2 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm transition-all",
                          active ? "bg-brand/10 font-semibold text-brand" : "text-muted-fg hover:bg-muted hover:text-fg"
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

            {/* Voice bar in sidebar */}
            {voiceChannelId && (
              <VoiceBar
                channelName={voiceChannelName}
                spaceName={voiceSpaceName}
                isMuted={isMuted}
                isDeaf={isDeaf}
                isSharingScreen={isSharingScreen}
                onOpen={() => { setView("voice"); setMobileSidebar(false); }}
                onToggleMute={toggleMute}
                onToggleDeaf={toggleDeaf}
                onLeave={leaveVoice}
              />
            )}

            {/* Sidebar footer */}
            <div className="shrink-0 border-t border-border px-3 py-2">
              <button onClick={goHome} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-muted-fg transition-colors hover:bg-muted hover:text-fg">
                <Plus className="size-3.5" />
                Space erstellen
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className={cn("flex flex-1 min-w-0 flex-col overflow-hidden bg-bg", mobileSidebar && "hidden sm:flex")}>
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
                onGoFriends={goToFriends}
              />
            ) : view === "friends" ? (
              <>
                <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
                  <button onClick={() => setMobileSidebar(true)} className="mr-1 rounded-lg p-1 text-muted-fg hover:bg-muted sm:hidden">
                    <ArrowLeft className="size-4" />
                  </button>
                  <UserPlus className="size-4 text-brand" />
                  <p className="flex-1 text-sm font-semibold">Freunde</p>
                </div>
                <FriendsView
                  data={friendData}
                  onDm={goToDm}
                  onAccept={acceptFriendModal}
                  onDecline={declineFriendModal}
                  onRefresh={fetchFriends}
                />
              </>
            ) : view === "voice" ? (
              <>
                <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
                  <button onClick={() => setMobileSidebar(true)} className="mr-1 rounded-lg p-1 text-muted-fg hover:bg-muted sm:hidden">
                    <ArrowLeft className="size-4" />
                  </button>
                  <Volume2 className="size-4 text-green-500" />
                  <p className="flex-1 text-sm font-semibold">{voiceChannelName}</p>
                  <span className="text-xs text-muted-fg">{voiceSpaceName}</span>
                </div>
                <VoiceView
                  participants={voiceParticipants}
                  myId={myId}
                  channelName={voiceChannelName}
                  isMuted={isMuted}
                  isDeaf={isDeaf}
                  isSharingScreen={isSharingScreen}
                  screenStream={screenStream}
                  onToggleMute={toggleMute}
                  onToggleDeaf={toggleDeaf}
                  onToggleScreenShare={toggleScreenShare}
                  onLeave={leaveVoice}
                  onDm={goToDm}
                />
              </>
            ) : view === "channel" ? (
              <>
                <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
                  <button onClick={() => setMobileSidebar(true)} className="mr-1 rounded-lg p-1 text-muted-fg hover:bg-muted sm:hidden">
                    <ArrowLeft className="size-4" />
                  </button>
                  <Hash className="size-4 text-muted-fg" />
                  <p className="flex-1 truncate text-sm font-semibold">{channelName}</p>

                  {memberAvatars.length > 0 && (
                    <div className="hidden items-center lg:flex">
                      <div className="flex -space-x-1.5">
                        {memberAvatars.map((m) => (
                          <div
                            key={m.userId}
                            title={m.user.name}
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full border-2 border-bg text-[9px] font-bold",
                              m.userId === myId ? "bg-brand/15 text-brand" : "bg-muted text-muted-fg"
                            )}
                          >
                            {m.user.name[0]?.toUpperCase()}
                          </div>
                        ))}
                      </div>
                      {space && space.members.length > 5 && (
                        <span className="ml-2 text-xs text-muted-fg">+{space.members.length - 5}</span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => { setShowSearch((v) => !v); setSearchQuery(""); }}
                    className={cn("rounded-lg p-1.5 transition-colors hover:bg-muted", showSearch ? "text-brand" : "text-muted-fg hover:text-fg")}
                  >
                    <Search className="size-4" />
                  </button>
                  <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-muted-fg hover:bg-muted hover:text-fg sm:hidden">
                    <X className="size-4" />
                  </button>
                </div>

                {showSearch && (
                  <div className="shrink-0 border-b border-border bg-surface px-4 py-2">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-1.5">
                      <Search className="size-3.5 shrink-0 text-muted-fg" />
                      <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`In #${channelName} suchen…`} className="flex-1 bg-transparent text-sm focus:outline-none" />
                      {searchQuery && <button onClick={() => setSearchQuery("")} className="text-muted-fg hover:text-fg"><X className="size-3.5" /></button>}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto py-3">
                  <MessageList
                    messages={messages}
                    myId={myId}
                    emptyIcon={<div className="flex size-12 items-center justify-center rounded-2xl bg-brand/10"><Hash className="size-6 text-brand" strokeWidth={1.5} /></div>}
                    emptyText={`Schreib die erste Nachricht in #${channelName}`}
                    endRef={messagesEndRef}
                    searchQuery={searchQuery}
                    onEdit={(msg) => { setEditingMsg(msg); setEditInput(msg.content); }}
                    onDelete={handleDelete}
                  />
                </div>

                {editingMsg && (
                  <div className="shrink-0 border-t border-warning/30 bg-warning/5 px-4 py-2">
                    <p className="mb-1.5 text-xs font-semibold text-warning">Nachricht bearbeiten</p>
                    <div className="flex gap-2">
                      <input
                        ref={editRef}
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") submitEdit(); if (e.key === "Escape") setEditingMsg(null); }}
                        className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm focus:border-brand focus:outline-none"
                      />
                      <button onClick={submitEdit} className="flex size-9 items-center justify-center rounded-xl bg-brand text-white hover:opacity-90"><Check className="size-4" /></button>
                      <button onClick={() => setEditingMsg(null)} className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-fg hover:bg-muted"><X className="size-4" /></button>
                    </div>
                  </div>
                )}

                {!editingMsg && (
                  <MessageInput value={input} onChange={setInput} onSend={sendMessage} placeholder={`Nachricht in #${channelName}`} textareaRef={textareaRef} />
                )}
              </>
            ) : (
              <>
                <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-4">
                  <button onClick={() => setMobileSidebar(true)} className="mr-1 rounded-lg p-1 text-muted-fg hover:bg-muted sm:hidden">
                    <ArrowLeft className="size-4" />
                  </button>
                  <Avatar name={selDmName} isMe={false} size="sm" />
                  <p className="flex-1 truncate text-sm font-semibold">{selDmName}</p>
                  <span className="text-xs text-muted-fg">Direktnachricht</span>
                  <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-muted-fg hover:bg-muted sm:hidden"><X className="size-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto py-3">
                  <MessageList
                    messages={messages}
                    myId={myId}
                    emptyIcon={<div className="flex size-12 items-center justify-center rounded-2xl bg-brand/10"><MessageCircle className="size-6 text-brand" strokeWidth={1.5} /></div>}
                    emptyText={`Starte eine Unterhaltung mit ${selDmName}`}
                    endRef={messagesEndRef}
                    searchQuery=""
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>

                <MessageInput value={input} onChange={setInput} onSend={sendMessage} placeholder={`Nachricht an ${selDmName}`} textareaRef={textareaRef} />
              </>
            )}
          </div>

          {/* Right members panel (xl+) */}
          {view === "channel" && space && (
            <div className="hidden w-44 shrink-0 flex-col border-l border-border bg-surface xl:flex">
              <div className="flex h-12 items-center gap-2 border-b border-border px-3">
                <Users className="size-4 text-muted-fg" />
                <p className="text-sm font-semibold">Mitglieder</p>
                <span className="ml-auto text-xs text-muted-fg">{space.members.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {space.members.map((m) => {
                  const online = isOnline(m.user.lastSeenAt);
                  return (
                    <button
                      key={m.userId}
                      onClick={() => m.userId !== myId && goToDm(m.userId, m.user.name)}
                      disabled={m.userId === myId}
                      title={m.userId !== myId ? `DM an ${m.user.name}` : undefined}
                      className={cn(
                        "mx-2 flex w-[calc(100%-16px)] items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors",
                        m.userId !== myId && "hover:bg-muted"
                      )}
                    >
                      <Avatar name={m.user.name} isMe={m.userId === myId} online={online} size="sm" />
                      <span className="truncate text-xs font-medium">{m.userId === myId ? "Du" : m.user.name}</span>
                      {m.role === "owner" && <Crown className="ml-auto size-3 shrink-0 text-warning" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
