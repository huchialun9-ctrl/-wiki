import { API_BASE_URL } from "../config";
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, FileText, Settings, Home, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  onSearch?: () => void;
}

export default function Sidebar({ isOpen, toggle, onSearch }: SidebarProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const { token, user, logout, teams, currentTeam, setCurrentTeam } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchProjects = () => {
      if (isOpen && token && currentTeam) {
        // Fetch projects
        fetch(`${API_BASE_URL}/api/projects?teamId=${currentTeam.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setProjects(data))
          .catch(err => console.error(err));

        // Fetch history
        fetch(`${API_BASE_URL}/api/user/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setHistory(data))
          .catch(err => console.error(err));
      }
    };
    
    fetchProjects();
    
    window.addEventListener('refreshProjects', fetchProjects);
    return () => window.removeEventListener('refreshProjects', fetchProjects);
  }, [isOpen, token, currentTeam]);

  if (!isOpen) return null;

  const groupedProjects = projects.reduce((acc, p) => {
    const cat = p.isPublished ? `✅ 正式發布 - ${p.category || '未分類'}` : `📝 草稿 - ${p.category || '未分類'}`;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <aside className="w-64 shrink-0 h-full bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-r border-notion-border-light dark:border-notion-border-dark flex flex-col group relative transition-all">
      {/* Header with Team Switcher */}
      <div className="p-4 flex items-center justify-between border-b border-notion-border-light dark:border-notion-border-dark">
        <div className="flex items-center gap-2 font-semibold flex-1 min-w-0">
          <div className="w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center border border-gray-100 shrink-0">
            <img src="/blob.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <select 
            className="text-sm font-semibold bg-transparent outline-none truncate cursor-pointer w-full text-notion-text-light dark:text-notion-text-dark"
            value={currentTeam?.id || ''}
            onChange={(e) => {
              const t = teams.find((t: any) => t.id === e.target.value);
              if (t) setCurrentTeam(t);
            }}
          >
            {teams.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-all text-notion-text-muted-light dark:text-notion-text-muted-dark ml-2 shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/></svg>
        </button>
      </div>

      <div className="px-3 mb-2 flex flex-col gap-1">
        <div 
          onClick={() => {
            navigate('/');
            if (window.innerWidth < 768) toggle();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium text-notion-text-light dark:text-notion-text-dark hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors cursor-pointer"
        >
          <Home size={16} />
          <span>前往首頁</span>
        </div>
        <div 
          onClick={() => {
            navigate('/settings');
            if (window.innerWidth < 768) toggle();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors cursor-pointer"
        >
          <Settings size={16} />
          <span>團隊設定與權限</span>
        </div>
      </div>

      {/* Global Search */}
      <div className="px-3 my-2">
        <button 
          onClick={onSearch}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors"
        >
          <Search size={16} />
          <span>Search</span>
          <div className="ml-auto flex gap-1">
            <kbd className="text-[10px] bg-black/5 dark:bg-white/10 px-1 rounded">⌘</kbd>
            <kbd className="text-[10px] bg-black/5 dark:bg-white/10 px-1 rounded">K</kbd>
          </div>
        </button>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        
        {/* History Section */}
        {history.filter(h => h.project?.teamId === currentTeam?.id).length > 0 && (
          <div className="px-3 mb-4">
            <div className="text-xs font-semibold text-notion-text-muted-light dark:text-notion-text-muted-dark mb-1 px-2 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1">
                <ChevronDown size={14} />
                <span>歷史紀錄</span>
              </div>
            </div>
            <div className="pl-2 border-l-2 border-transparent ml-2">
              {history.filter(h => h.project?.teamId === currentTeam?.id).map((h: any) => (
                <NavItem key={h.id} to={`/project/${h.projectId}`} icon={<FileText size={16} />} text={h.project?.title || '已刪除的懶人包'} />
              ))}
            </div>
          </div>
        )}

        {(Object.entries(groupedProjects) as [string, any[]][]).map(([category, items]) => (
          <div key={category} className="px-3 mb-4">
            <div 
              className="text-xs font-semibold text-notion-text-muted-light dark:text-notion-text-muted-dark mb-1 px-2 uppercase tracking-wider flex items-center justify-between group/section cursor-pointer hover:text-notion-text-light dark:hover:text-notion-text-dark"
            >
              <div className="flex items-center gap-1">
                <ChevronDown size={14} />
                <span>{category}</span>
              </div>
              <Plus 
                size={14} 
                className="opacity-0 group-hover/section:opacity-100 cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark rounded" 
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  const res = await fetch(`${API_BASE_URL}/api/projects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ title: '無標題懶人包', category, teamId: currentTeam?.id })
                  });
                  const data = await res.json();
                  navigate(`/project/${data.id}`);
                }}
              />
            </div>
            
            <div className="pl-2 border-l-2 border-transparent ml-2">
              {items.map(p => (
                <NavItem key={p.id} to={`/project/${p.id}`} icon={<FileText size={16} />} text={p.title} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User Info at Bottom */}
      <div className="p-4 border-t border-notion-border-light dark:border-notion-border-dark mt-auto bg-notion-bg-light dark:bg-notion-bg-dark">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => {
              navigate('/profile');
              if (window.innerWidth < 768) toggle();
            }}
            className="flex items-center gap-2 truncate cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 -ml-1 rounded transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">{user?.name?.charAt(0)}</div>
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm truncate">{user?.name}</span>
              <span className="text-xs text-notion-text-muted-light truncate">個人設定</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme} 
              className="text-notion-text-muted-light dark:text-notion-text-muted-dark hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded transition-colors"
              title="切換深淺色主題"
            >
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button onClick={logout} className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 rounded transition-colors shrink-0">登出</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
        isActive 
          ? 'bg-notion-hover-light dark:bg-notion-hover-dark font-medium text-notion-text-light dark:text-notion-text-dark' 
          : 'hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-muted-light dark:text-notion-text-muted-dark hover:text-notion-text-light dark:hover:text-notion-text-dark'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </NavLink>
  );
}
