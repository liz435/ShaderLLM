import { useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000); // backend stores seconds
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

  // Refresh list when sidebar opens
  useEffect(() => {
    if (isOpen) refreshSessionList();
  }, [isOpen, refreshSessionList]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        aria-label="Session history"
        className={`fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-700/60
                    z-50 flex flex-col
                    transform transition-transform duration-200 ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/60">
          <h2 className="text-sm font-semibold text-zinc-200">History</h2>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
                       transition-colors duration-100"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 py-2">
          <button
            onClick={() => { startNewSession(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                       text-zinc-200 bg-zinc-800 border border-zinc-700
                       hover:bg-zinc-700 hover:text-zinc-100
                       transition-colors duration-100"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {sessions.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center mt-8">No sessions yet</p>
          ) : (
            <ul className="flex flex-col gap-0.5" role="list">
              {sessions.map((session) => (
                <li key={session.conversation_id}>
                  <button
                    onClick={() => { loadSession(session.conversation_id); onClose(); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm
                               transition-colors duration-100
                               ${session.conversation_id === conversationId
                                 ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-200'
                                 : 'text-zinc-300 hover:bg-zinc-800 border border-transparent'
                               }`}
                  >
                    <div className="truncate font-medium">{session.title || 'Untitled'}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">{formatTime(session.updated_at)}</span>
                      {session.current_shader && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Has shader" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
