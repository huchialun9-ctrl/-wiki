import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Search, Zap } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      if (inputRef.current) inputRef.current.focus();
      
      // Fetch user history
      if (token) {
        fetch('http://localhost:3000/api/user/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setHistory(data))
          .catch(err => console.error(err));
      }
    }
  }, [isOpen, token]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') {
        if (query.startsWith('http://') || query.startsWith('https://')) {
          navigate(`/project/new?analyze_url=${encodeURIComponent(query)}`);
          onClose();
        } else if (filteredHistory.length > 0) {
          navigate(`/project/${filteredHistory[0].projectId}`);
          onClose();
        }
      }
    };
    
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query]);

  if (!isOpen) return null;

  const filteredHistory = history.filter(h => 
    h.project && h.project.title && h.project.title.toLowerCase().includes(query.toLowerCase())
  );
  const isUrl = query.startsWith('http://') || query.startsWith('https://');

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-notion-bg-light dark:bg-[#2F2F2F] w-full max-w-xl rounded-xl shadow-2xl border border-notion-border-light dark:border-notion-border-dark overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-notion-border-light dark:border-notion-border-dark">
          <Search size={20} className="text-notion-text-muted-light mr-3" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="輸入 URL 解析，或搜尋專案名稱..." 
            className="flex-1 bg-transparent border-none outline-none text-lg dark:text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded ml-2">ESC</kbd>
        </div>
        
        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {isUrl ? (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-notion-text-muted-light uppercase tracking-wider">AI Analysis</div>
              <div 
                onClick={() => {
                  navigate(`/project/new?analyze_url=${encodeURIComponent(query)}`);
                  onClose();
                }}
                className="px-3 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer flex items-center gap-3 transition-colors"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg"><Zap size={16} /></div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-semibold">🚀 立即解析此網址...</div>
                  <div className="text-xs opacity-70 truncate">{query}</div>
                </div>
                <kbd className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded">Enter</kbd>
              </div>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-notion-text-muted-light uppercase tracking-wider">Recent Projects</div>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((h: any, index: number) => (
                  <div 
                    key={h.id}
                    onClick={() => {
                      navigate(`/project/${h.projectId}`);
                      onClose();
                    }}
                    className="px-3 py-3 text-sm hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark rounded-lg cursor-pointer flex items-center gap-3 transition-colors group"
                  >
                    <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg group-hover:bg-white dark:group-hover:bg-white/10 transition-colors"><FileText size={16} className="text-gray-500 dark:text-gray-400" /></div>
                    <span className="flex-1 truncate dark:text-white">{h.project.title || '已刪除的懶人包'}</span>
                    {index === 0 && query && <kbd className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Enter</kbd>}
                  </div>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-notion-text-muted-light">
                  找不到相符的專案
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
