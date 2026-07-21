import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex w-screen h-screen overflow-hidden dark:bg-notion-bg-dark bg-notion-bg-light text-notion-text-light dark:text-notion-text-dark selection:bg-blue-200 dark:selection:bg-blue-900 text-base">
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <Outlet context={{ sidebarOpen, setSidebarOpen }} />
      </main>

      {/* Cmd+K Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="bg-notion-bg-light dark:bg-notion-bg-dark w-full max-w-xl rounded-xl shadow-2xl border border-notion-border-light dark:border-notion-border-dark overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 border-b border-notion-border-light dark:border-notion-border-dark">
              <svg className="text-notion-text-muted-light" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Search Logic Hub..." 
                autoFocus
                className="flex-1 bg-transparent border-none outline-none p-4 text-lg placeholder:text-notion-text-muted-light dark:placeholder:text-notion-text-muted-dark"
              />
              <kbd className="text-xs bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-notion-text-muted-light font-sans">ESC</kbd>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-semibold text-notion-text-muted-light uppercase tracking-wider">Recent Projects</div>
              <div className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark flex items-center gap-2">
                <span className="text-notion-text-muted-light">📄</span> 無標題懶人包
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
