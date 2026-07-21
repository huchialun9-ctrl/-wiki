import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { X, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CommentPanelProps {
  projectId: string;
  blockId: string;
  onClose: () => void;
}

export default function CommentPanel({ projectId, blockId, onClose }: CommentPanelProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const { token } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!token) return;

    // Load comments
    fetch(`http://localhost:3000/api/projects/${projectId}/comments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        // Filter for this block
        const blockComments = data.filter((c: any) => c.blockId === blockId);
        setComments(blockComments);
      })
      .catch(console.error);

    // Load users for mentions
    fetch(`http://localhost:3000/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(console.error);

    // Setup Socket
    const newSocket = io('http://localhost:3000');
    newSocket.emit('join-project', projectId);

    newSocket.on('new-comment', (comment: any) => {
      if (comment.blockId === blockId) {
        setComments(prev => [...prev, comment]);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [projectId, blockId, token]);

  const handlePost = async () => {
    if (!newComment.trim() || !token) return;

    try {
      await fetch(`http://localhost:3000/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ blockId, content: newComment })
      });
      setNewComment('');
      setShowMentions(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPosition);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1 && !textBeforeCursor.substring(lastAt).includes(' ')) {
      setShowMentions(true);
      setMentionQuery(textBeforeCursor.substring(lastAt + 1));
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (mentionName: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    const beforeMention = newComment.substring(0, lastAt);
    const afterMention = newComment.substring(cursorPosition);
    
    setNewComment(`${beforeMention}@${mentionName} ${afterMention}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()));

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-[#2F2F2F] border-l border-notion-border-light dark:border-notion-border-dark shadow-xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b border-notion-border-light dark:border-notion-border-dark">
        <h3 className="font-bold">評論區</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-notion-text-muted-light text-center mt-10">目前還沒有留言，來開個頭吧！</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                {c.author.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm">{c.author.name}</span>
                  <span className="text-xs text-notion-text-muted-light">{new Date(c.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm mt-1 bg-black/5 dark:bg-white/5 p-2 rounded whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-notion-border-light dark:border-notion-border-dark relative">
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark rounded shadow-lg overflow-hidden">
            {filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => insertMention(u.name)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark flex items-center justify-between"
              >
                <span>{u.name}</span>
                <span className="text-xs text-gray-400">{u.role}</span>
              </button>
            ))}
          </div>
        )}
        <div className="relative flex items-end gap-2 bg-black/5 dark:bg-white/5 rounded-lg border border-transparent focus-within:border-blue-500 transition-colors p-2">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="加入評論... (輸入 @ 提及成員)"
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm min-h-[40px] max-h-32 py-1"
            rows={1}
          />
          <button 
            onClick={handlePost}
            disabled={!newComment.trim()}
            className="p-1.5 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 transition-colors shrink-0 mb-0.5"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
