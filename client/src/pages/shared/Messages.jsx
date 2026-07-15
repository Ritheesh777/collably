import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { chatApi, mediaApi } from '../../api/endpoints.js';
import { Avatar, EmptyState, Spinner } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { timeAgo } from '../../utils/format.js';
import {
  IconMessage, IconArrowLeft, IconSend, IconTrash, IconSearch, IconMore, IconPin2,
  IconArchive, IconUnarchive, IconBellOff, IconBell, IconBan, IconAttach,
  IconFile, IconTimer, IconEyeOff, IconCheck, IconCheckCheck, IconX, IconSpinner,
} from '../../components/icons.jsx';

/**
 * Advanced chat (v2 §22–§28).
 * Primary/General/Archived tabs, search, mute, block, archive, attachments,
 * one-time-view photos, and profile navigation from the chat header.
 */
const TABS = [
  { key: 'primary', label: 'Primary' },
  { key: 'general', label: 'General' },
  { key: 'archived', label: 'Archived' },
];

// The API accepts 25MB, but a chat attachment that large is a bad experience on
// the low-end phones this has to work on — so the composer stops earlier.
const MAX_UPLOAD = 10 * 1024 * 1024;

export default function Messages() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [tab, setTab] = useState('general');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({ primary: 0, general: 0, archived: 0 });
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [canSend, setCanSend] = useState(true);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [text, setText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(null); // staged attachment
  const [viewOnce, setViewOnce] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const endRef = useRef(null);
  const activeRef = useRef(null);
  const fileRef = useRef(null);

  const loadList = useCallback(
    async (opts = {}) => {
      const category = opts.tab ?? tab;
      const q = opts.q ?? search;
      const d = await chatApi.conversations({ category, q: q || undefined });
      setConversations(d.items);
      setCounts(d.counts || { primary: 0, general: 0, archived: 0 });
      return d.items;
    },
    [tab, search]
  );

  // Initial load — honours ?c= so notification links open the right thread
  useEffect(() => {
    (async () => {
      try {
        const d = await chatApi.conversations();
        setConversations(d.items);
        setCounts(d.counts || {});
        const pre = params.get('c');
        if (pre) openConversation(pre, d.items);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoadingList(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab / search changes reload the list. Debounced so typing doesn't spam the API.
  useEffect(() => {
    if (loadingList) return;
    const t = setTimeout(() => loadList().catch(() => {}), search ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  useEffect(() => {
    if (!socket) return;
    const onNew = ({ conversationId, message }) => {
      if (conversationId === activeRef.current) {
        addMessage(message);
        socket.emit('message:read', { conversationId });
      }
      setConversations((cs) =>
        cs.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: message.body || 'Attachment', lastMessageAt: message.createdAt }
            : c
        )
      );
    };
    const onTyping = ({ conversationId, isTyping }) => {
      if (conversationId === activeRef.current) setTyping(isTyping);
    };
    const onDeleted = ({ conversationId, messageId }) => {
      if (conversationId === activeRef.current)
        setMessages((m) => m.filter((x) => String(x._id) !== String(messageId)));
    };
    // §25 — the sender is told the moment their one-time photo is opened
    const onViewed = ({ conversationId, messageId }) => {
      if (conversationId === activeRef.current)
        setMessages((m) =>
          m.map((x) => (String(x._id) === String(messageId) ? { ...x, viewOnceSeen: true } : x))
        );
    };
    socket.on('message:new', onNew);
    socket.on('typing', onTyping);
    socket.on('message:deleted', onDeleted);
    socket.on('message:viewed', onViewed);
    return () => {
      socket.off('message:new', onNew);
      socket.off('typing', onTyping);
      socket.off('message:deleted', onDeleted);
      socket.off('message:viewed', onViewed);
    };
  }, [socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  /**
   * Append only if absent. The server both broadcasts to the room AND acks the
   * sender, so without this guard your own message renders twice.
   */
  const addMessage = (message) =>
    setMessages((m) => (m.some((x) => String(x._id) === String(message._id)) ? m : [...m, message]));

  const openConversation = async (id, list = conversations) => {
    setActive(list.find((c) => c._id === id) || { _id: id });
    activeRef.current = id;
    setParams({ c: id }, { replace: true });
    setLoadingMsgs(true);
    setMenuOpen(false);
    if (socket) socket.emit('conversation:join', id);
    try {
      const { messages, conversation, blocked } = await chatApi.messages(id);
      setMessages(messages);
      setActive((a) => ({ ...a, ...conversation }));
      setCanSend(blocked?.canSend !== false);
      setIBlockedThem(!!blocked?.iBlockedThem);
      setConversations((cs) => cs.map((c) => (c._id === id ? { ...c, unreadCount: 0 } : c)));
      if (socket) socket.emit('message:read', { conversationId: id });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const closeThread = () => {
    setActive(null);
    activeRef.current = null;
    setMessages([]);
    setParams({}, { replace: true });
  };

  // §26/§27 — category + mute
  const setPrefs = async (patch, label) => {
    if (!active) return;
    try {
      await chatApi.setPrefs(active._id, patch);
      setActive((a) => ({ ...a, ...patch }));
      setMenuOpen(false);
      toast.success(label);
      await loadList();
      // Moving a thread out of the current tab means it no longer belongs here.
      if (patch.category && patch.category !== tab) closeThread();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // §27 — block / unblock
  const toggleBlock = async () => {
    const o = other(active);
    if (!o) return;
    try {
      if (iBlockedThem) {
        await chatApi.unblock(o._id);
        setIBlockedThem(false);
        setCanSend(true);
        toast.success(`Unblocked ${o.name}`);
      } else {
        if (
          !confirm(
            `Block ${o.name}? Neither of you will be able to send messages. Your collaboration history and reviews are kept.`
          )
        )
          return;
        await chatApi.block(o._id);
        setIBlockedThem(true);
        setCanSend(false);
        toast.success(`Blocked ${o.name}`);
      }
      setMenuOpen(false);
    } catch (e) {
      toast.error(e.message);
    }
  };

  // §27 — one-sided clear
  const clearChat = async () => {
    if (
      !confirm(
        'Clear this chat from your view? The other person keeps their copy, and your collaboration history is unaffected.'
      )
    )
      return;
    try {
      await chatApi.deleteConversation(active._id);
      toast.success('Chat cleared from your view');
      setMessages([]);
      setMenuOpen(false);
      await loadList();
      closeThread();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const removeMessage = async (id) => {
    const prev = messages;
    setMessages((m) => m.filter((x) => String(x._id) !== String(id)));
    try {
      await chatApi.deleteMessage(id);
    } catch (err) {
      setMessages(prev);
      toast.error(err.message || 'Could not delete message');
    }
  };

  // §24 — attachments
  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_UPLOAD)
      return toast.error(`That file is ${(file.size / 1048576).toFixed(1)}MB. The limit is 10MB.`);
    setUploading(true);
    try {
      const res = await mediaApi.upload(file);
      const kind = file.type.startsWith('image/')
        ? 'image'
        : file.type === 'application/pdf'
          ? 'pdf'
          : 'file';
      setPending({
        url: res.url,
        name: res.name || file.name,
        type: kind,
        size: file.size,
        mime: file.type,
      });
      if (kind !== 'image') setViewOnce(false); // §25 is images-only
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!active || (!text.trim() && !pending)) return;
    const body = text.trim();
    const attachments = pending ? [pending] : [];
    const once = !!(pending && pending.type === 'image' && viewOnce);
    setText('');
    setPending(null);
    setViewOnce(false);
    try {
      // Attachments and view-once go over HTTP so the server can validate them;
      // the socket path stays for plain text, where latency matters most.
      if (attachments.length || !socket) {
        const { message } = await chatApi.send(active._id, { body, attachments, viewOnce: once });
        addMessage(message);
      } else {
        socket.emit('message:send', { conversationId: active._id, body }, (res) => {
          if (res?.ok) addMessage(res.message);
          else toast.error(res?.error || 'Message not sent');
        });
      }
    } catch (err) {
      toast.error(err.message);
      setText(body); // don't lose what they typed
    }
  };

  const onType = (e) => {
    setText(e.target.value);
    if (socket && active) socket.emit('typing', { conversationId: active._id, isTyping: true });
  };
  const stopTyping = () => {
    if (socket && active) socket.emit('typing', { conversationId: active._id, isTyping: false });
  };

  const other = (c) => c?.otherParty || c?.participants?.find((p) => String(p._id) !== String(user._id));

  // §22/§23 — clicking the photo/logo opens that profile
  const openProfile = (o) => {
    if (!o) return;
    navigate(o.role === 'creator' ? `/creators/${o._id}` : `/companies/${o._id}`);
  };

  const revealOnce = async (id) => {
    try {
      const { attachments } = await chatApi.viewOnce(id);
      setMessages((ms) =>
        ms.map((x) => (String(x._id) === String(id) ? { ...x, attachments, _revealed: true } : x))
      );
    } catch (e) {
      toast.error(e.message);
      setMessages((ms) =>
        ms.map((x) => (String(x._id) === String(id) ? { ...x, attachments: [] } : x))
      );
    }
  };

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 md:grid-cols-[340px_1fr]">
      {/* ── List ─────────────────────────────────────── */}
      <div className={`card flex flex-col overflow-hidden ${active ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-ink-200 p-3">
          <h1 className="mb-2.5 font-semibold text-ink-900">Messages</h1>

          {/* §28 — search by person or campaign */}
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Search name or campaign"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                aria-label="Clear search"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* §26 — PRIMARY / GENERAL / ARCHIVED */}
          <div className="mt-2.5 flex gap-1 rounded-xl bg-ink-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                  tab === t.key ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                {t.label}
                {counts[t.key] > 0 && <span className="ml-1 text-ink-400">{counts[t.key]}</span>}
              </button>
            ))}
          </div>
        </div>

        {loadingList ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : conversations.length ? (
          <ul className="flex-1 overflow-y-auto">
            {conversations.map((c) => {
              const o = other(c);
              return (
                <li key={c._id}>
                  <button
                    onClick={() => openConversation(c._id)}
                    className={`flex w-full items-center gap-3 border-b border-ink-100 px-4 py-3 text-left transition hover:bg-ink-50 ${
                      active?._id === c._id ? 'bg-brand-50' : ''
                    }`}
                  >
                    <Avatar src={o?.avatarUrl} name={o?.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate font-medium text-ink-800">{o?.name || 'User'}</span>
                          {c.muted && <IconBellOff className="h-3 w-3 shrink-0 text-ink-400" />}
                        </span>
                        <span className="shrink-0 text-[10px] text-ink-400">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      {c.campaign?.title && (
                        <div className="truncate text-[11px] text-ink-400">{c.campaign.title}</div>
                      )}
                      <div className="truncate text-xs text-ink-500">{c.lastMessage || 'Start chatting'}</div>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="badge shrink-0 bg-accent-500 text-white">{c.unreadCount}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={IconMessage}
            title={search ? 'No matches' : `No ${tab} chats`}
            subtitle={
              search
                ? 'Try a different name or campaign.'
                : tab === 'archived'
                  ? 'Chats you archive will appear here.'
                  : 'Chats unlock once a collaboration is accepted.'
            }
          />
        )}
      </div>

      {/* ── Thread ───────────────────────────────────── */}
      <div className={`card flex flex-col overflow-hidden ${active ? 'flex' : 'hidden md:flex'}`}>
        {active ? (
          <>
            <div className="relative flex items-center gap-3 border-b border-ink-200 px-4 py-3">
              <button className="md:hidden" onClick={closeThread} aria-label="Back">
                <IconArrowLeft className="h-5 w-5 text-ink-500" />
              </button>
              {/* §23 — the photo/logo opens the profile */}
              <button onClick={() => openProfile(other(active))} title="Open profile">
                <Avatar src={other(active)?.avatarUrl} name={other(active)?.name} size={36} />
              </button>
              <button
                onClick={() => openProfile(other(active))}
                className="min-w-0 flex-1 text-left"
                title="Open profile"
              >
                <div className="truncate font-semibold text-ink-900 hover:underline">
                  {other(active)?.name || 'Conversation'}
                </div>
                {active.campaign?.title && (
                  <div className="truncate text-xs text-ink-400">{active.campaign.title}</div>
                )}
              </button>

              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                aria-label="Chat options"
                aria-expanded={menuOpen}
              >
                <IconMore className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-3 top-14 z-20 w-56 overflow-hidden rounded-xl border border-ink-200 bg-surface py-1 shadow-card">
                    {active.category !== 'primary' && (
                      <MenuItem icon={IconPin2} onClick={() => setPrefs({ category: 'primary' }, 'Moved to Primary')}>
                        Move to Primary
                      </MenuItem>
                    )}
                    {active.category !== 'general' && (
                      <MenuItem icon={IconMessage} onClick={() => setPrefs({ category: 'general' }, 'Moved to General')}>
                        Move to General
                      </MenuItem>
                    )}
                    {active.category === 'archived' ? (
                      <MenuItem icon={IconUnarchive} onClick={() => setPrefs({ category: 'general' }, 'Unarchived')}>
                        Unarchive
                      </MenuItem>
                    ) : (
                      <MenuItem icon={IconArchive} onClick={() => setPrefs({ category: 'archived' }, 'Archived')}>
                        Archive
                      </MenuItem>
                    )}
                    <MenuItem
                      icon={active.muted ? IconBell : IconBellOff}
                      onClick={() => setPrefs({ muted: !active.muted }, active.muted ? 'Unmuted' : 'Muted')}
                    >
                      {active.muted ? 'Unmute notifications' : 'Mute notifications'}
                    </MenuItem>
                    <div className="my-1 border-t border-ink-100" />
                    <MenuItem icon={IconBan} danger onClick={toggleBlock}>
                      {iBlockedThem ? 'Unblock' : 'Block'} {other(active)?.name?.split(' ')[0] || 'user'}
                    </MenuItem>
                    <MenuItem icon={IconTrash} danger onClick={clearChat}>
                      Clear chat for me
                    </MenuItem>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-paper p-4">
              {loadingMsgs ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-ink-400">No messages yet. Say hello.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <Bubble
                    key={m._id}
                    m={m}
                    mine={String(m.sender?._id || m.sender) === String(user._id)}
                    onDelete={removeMessage}
                    onReveal={revealOnce}
                  />
                ))
              )}
              {typing && <div className="text-xs text-ink-400">typing…</div>}
              <div ref={endRef} />
            </div>

            {/* Composer */}
            {canSend ? (
              <form onSubmit={send} className="border-t border-ink-200 p-3 safe-bottom">
                {pending && (
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-2">
                    {pending.type === 'image' ? (
                      <img src={pending.url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-12 w-12 place-items-center rounded-lg bg-ink-200 text-ink-600">
                        <IconFile className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink-800">{pending.name}</div>
                      <div className="text-xs text-ink-400">{(pending.size / 1024).toFixed(0)} KB</div>
                    </div>
                    {/* §25 — view-once is images-only */}
                    {pending.type === 'image' && (
                      <button
                        type="button"
                        onClick={() => setViewOnce((v) => !v)}
                        title="Send as a one-time photo"
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          viewOnce ? 'bg-ink-900 text-paper' : 'bg-ink-200 text-ink-600 hover:bg-ink-300'
                        }`}
                      >
                        <IconTimer className="h-3.5 w-3.5" /> View once
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPending(null);
                        setViewOnce(false);
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:text-rose-600"
                      aria-label="Remove attachment"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={pickFile}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || !!pending}
                    className="rounded-lg p-2.5 text-ink-500 transition hover:bg-ink-100 disabled:opacity-40"
                    title="Attach an image or PDF"
                  >
                    {uploading ? (
                      <IconSpinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconAttach className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    className="input flex-1"
                    placeholder="Type a message…"
                    value={text}
                    onChange={onType}
                    onBlur={stopTyping}
                  />
                  <button className="btn-primary" disabled={!text.trim() && !pending}>
                    <IconSend className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-t border-ink-200 bg-ink-50 p-4 text-center safe-bottom">
                <p className="text-sm text-ink-600">
                  {iBlockedThem
                    ? 'You blocked this person. Unblock them from the menu to message again.'
                    : 'You can no longer send messages in this conversation.'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={IconMessage}
              title="Select a conversation"
              subtitle="Choose a chat to start messaging."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-ink-700 hover:bg-ink-50'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{children}</span>
    </button>
  );
}

function Bubble({ m, mine, onDelete, onReveal }) {
  const att = m.attachments?.[0];
  // The server strips the URL once a one-time photo is consumed, so a viewOnce
  // message with no attachment means "already opened".
  const consumed = m.viewOnce && !mine && !att && !m._revealed;
  const unopened = m.viewOnce && !mine && !m._revealed && !!att;
  const sentOnce = m.viewOnce && mine;

  return (
    <div className={`group flex items-center gap-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
      {mine && (
        <button
          onClick={() => onDelete(m._id)}
          title="Delete message"
          className="rounded-md p-1 text-ink-300 opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      )}
      <div
        className={`max-w-[75%] overflow-hidden rounded-2xl text-sm ${
          mine ? 'bg-ink-900 text-paper' : 'border border-ink-200 bg-surface text-ink-800'
        }`}
      >
        {consumed ? (
          <div className="flex items-center gap-2 px-3.5 py-3 text-ink-400">
            <IconEyeOff className="h-4 w-4" />
            <span className="text-xs italic">Photo opened — no longer available</span>
          </div>
        ) : unopened ? (
          <button
            onClick={() => onReveal(m._id)}
            className="flex w-full items-center gap-2 px-3.5 py-3 text-left transition hover:bg-ink-50"
          >
            <IconTimer className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="text-xs font-semibold text-brand-700">
              Tap to view once
              <span className="block font-normal text-ink-400">You can only open this one time</span>
            </span>
          </button>
        ) : att ? (
          att.type === 'image' ? (
            <a href={att.url} target="_blank" rel="noreferrer noopener">
              <img src={att.url} alt={att.name || 'Photo'} className="max-h-64 w-full object-cover" />
            </a>
          ) : (
            <a
              href={att.url}
              target="_blank"
              rel="noreferrer noopener"
              className={`flex items-center gap-2.5 px-3.5 py-2.5 ${mine ? 'text-paper' : 'text-ink-800'}`}
            >
              <IconFile className="h-5 w-5 shrink-0 opacity-70" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{att.name || 'Document'}</span>
                <span className={`text-[10px] ${mine ? 'text-paper/60' : 'text-ink-400'}`}>
                  {att.type === 'pdf' ? 'PDF' : 'File'} · tap to open
                </span>
              </span>
            </a>
          )
        ) : null}

        {m.body && <div className="px-3.5 py-2">{m.body}</div>}

        {sentOnce && (
          <div className={`px-3.5 ${m.body ? '' : 'py-2'}`}>
            <span className={`flex items-center gap-1.5 text-xs ${mine ? 'text-paper/70' : 'text-ink-500'}`}>
              <IconTimer className="h-3.5 w-3.5" />
              One-time photo {m.viewOnceSeen || m.viewedBy?.length ? '· opened' : '· not opened yet'}
            </span>
          </div>
        )}

        <div
          className={`flex items-center justify-end gap-1 px-3.5 pb-1.5 pt-1 text-[10px] ${
            mine ? 'text-paper/50' : 'text-ink-400'
          }`}
        >
          {timeAgo(m.createdAt)}
          {mine &&
            (m.readBy?.length > 1 ? <IconCheckCheck className="h-3 w-3" /> : <IconCheck className="h-3 w-3" />)}
        </div>
      </div>
    </div>
  );
}
