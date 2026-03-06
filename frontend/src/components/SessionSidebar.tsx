import { useEffect, useState, useCallback } from 'react';
import { useSession } from '../contexts/SessionContext';
import { renameSession, deleteSession } from '../api/sessions';
import { useToast } from '../contexts/ToastContext';

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return d.toLocaleDateString();
}

export default function SessionSidebar({ isOpen, onClose }: SessionSidebarProps) {
  const { sessions, loadSession, startNewSession, conversationId, refreshSessionList } = useSession();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) refreshSessionList();
  }, [isOpen, refreshSessionList]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filteredSessions = search.trim()
    ? sessions.filter((s) => (s.title || '').toLowerCase().includes(search.toLowerCase()))
    : sessions;

  const handleRename = useCallback(async (id: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) { setEditingId(null); return; }
    const ok = await renameSession(id, trimmed);
    if (ok) {
      toast('Session renamed', 'success');
      refreshSessionList();
    } else {
      toast('Failed to rename session', 'error');
    }
    setEditingId(null);
  }, [editTitle, refreshSessionList, toast]);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteSession(id);
    if (ok) {
      toast('Session deleted', 'success');
      if (id === conversationId) startNewSession();
      refreshSessionList();
    } else {
      toast('Failed to delete session', 'error');
    }
    setConfirmDeleteId(null);
  }, [conversationId, startNewSession, refreshSessionList, toast]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        aria-label="Session history"
        className={`fixed top-0 left-0 h-full w-72 bg-[#0e0e12] border-r border-white/[0.06]
                    z-50 flex flex-col
                    transform transition-transform duration-250 ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <h2 className="text-[13px] font-bold text-zinc-200 tracking-wide uppercase">History</h2>
          <button onClick={onClose} aria-label="Close sidebar"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]
                       transition-all duration-150">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="h-px bg-white/[0.06]" aria-hidden="true" />

        {/* Search */}
        <div className="px-3 pt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            aria-label="Search sessions"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]
                       text-[13px] text-zinc-200 placeholder-zinc-600
                       outline-none focus:border-white/[0.12] focus:bg-white/[0.06]
                       transition-all duration-200"
          />
        </div>

        {/* New Chat button */}
        <div className="px-3 py-2.5">
          <button
            onClick={() => { startNewSession(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                       text-[13px] font-semibold text-zinc-200
                       bg-white/[0.08] border border-white/[0.08]
                       hover:bg-white/[0.12] hover:text-white
                       active:bg-white/[0.06]
                       transition-all duration-150">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {filteredSessions.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center mt-8">
              {search ? 'No matching sessions' : 'No sessions yet'}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5" role="list">
              {filteredSessions.map((session) => (
                <li key={session.conversation_id} className="group relative">
                  {editingId === session.conversation_id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRename(session.conversation_id); }}
                      className="px-3 py-2"
                    >
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRename(session.conversation_id)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null); }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12]
                                   text-[13px] text-zinc-200
                                   outline-none focus:border-white/[0.2]"
                        aria-label="Rename session"
                      />
                    </form>
                  ) : confirmDeleteId === session.conversation_id ? (
                    <div className="px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/15">
                      <p className="text-[12px] text-red-400 mb-2">Delete this session?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(session.conversation_id)}
                          className="flex-1 px-2 py-1.5 rounded-lg text-[12px] font-semibold
                                     bg-red-500/20 text-red-400 border border-red-500/20
                                     hover:bg-red-500/30 transition-all duration-150"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 px-2 py-1.5 rounded-lg text-[12px] font-medium
                                     bg-white/[0.04] text-zinc-400 border border-white/[0.06]
                                     hover:bg-white/[0.06] transition-all duration-150"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { loadSession(session.conversation_id); onClose(); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px]
                                 transition-all duration-150
                                 ${session.conversation_id === conversationId
                                   ? 'bg-white/[0.06] border border-white/[0.08] text-zinc-200'
                                   : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent'
                                 }`}
                    >
                      <div className="truncate font-medium pr-12">{session.title || 'Untitled'}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-zinc-600">{formatTime(session.updated_at)}</span>
                        {session.current_shader && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" title="Has shader" />
                        )}
                      </div>
                    </button>
                  )}

                  {/* Action buttons — visible on hover */}
                  {editingId !== session.conversation_id && confirmDeleteId !== session.conversation_id && (
                    <div className="absolute right-2 top-2 hidden group-hover:flex gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(session.conversation_id);
                          setEditTitle(session.title || '');
                        }}
                        className="p-1 rounded-md text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.06]
                                   transition-all duration-150"
                        aria-label="Rename session"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(session.conversation_id);
                        }}
                        className="p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-white/[0.06]
                                   transition-all duration-150"
                        aria-label="Delete session"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
