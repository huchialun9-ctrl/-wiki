import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Plus, FileText, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

export default function Sidebar({ isOpen, toggle }: SidebarProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const { token, logout } = useAuth();

  useEffect(() => {
    if (isOpen && token) {
      fetch('http://localhost:3000/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setProjects(data))
        .catch(err => console.error(err));
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  // Group projects by category
  const groupedProjects = projects.reduce((acc, p) => {
    const cat = p.category || 'Drafts';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <aside className="w-64 shrink-0 h-full bg-notion-sidebar-light dark:bg-notion-sidebar-dark border-r border-notion-border-light dark:border-notion-border-dark flex flex-col group relative transition-all">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center border border-gray-100">
            <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-semibold text-sm">懶人包 Wiki</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-all text-notion-text-muted-light dark:text-notion-text-muted-dark"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/></svg>
        </button>
      </div>

      <div className="px-3 mb-2">
        <div 
          onClick={() => {
            navigate('/settings');
            if (window.innerWidth < 768) toggle();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors cursor-pointer"
        >
          <Settings size={16} />
          <span>設定與權限</span>
        </div>
      </div>

      {/* Global Search */}
      <div className="px-3 my-2">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors">
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
                  const res = await fetch('http://localhost:3000/api/projects', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                    body: JSON.stringify({ category }) 
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
