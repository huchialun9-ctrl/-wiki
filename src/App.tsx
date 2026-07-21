import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full bg-notion-bg-light dark:bg-notion-bg-dark text-notion-text-light dark:text-notion-text-dark font-notion overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto">
        {/* User Info Bar at top right */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-4 bg-white/80 dark:bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-notion-border-light dark:border-notion-border-dark shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">{user?.name?.charAt(0)}</div>
            <div className="text-sm">
              <span className="font-semibold">{user?.name}</span>
              <span className="text-xs text-notion-text-muted-light ml-2 px-1.5 py-0.5 bg-black/5 rounded">{user?.role}</span>
            </div>
          </div>
          <button onClick={logout} className="text-xs text-red-500 hover:underline">登出</button>
        </div>

        <Outlet context={{ sidebarOpen, setSidebarOpen }} />
      </main>

      {/* Cmd+K Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="bg-notion-bg-light dark:bg-[#2F2F2F] w-full max-w-xl rounded-xl shadow-2xl border border-notion-border-light dark:border-notion-border-dark overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 py-3 border-b border-notion-border-light dark:border-notion-border-dark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-notion-text-muted-light mr-3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="輸入 URL 解析，或搜尋專案名稱..." 
                className="flex-1 bg-transparent border-none outline-none text-lg"
                autoFocus
              />
              <kbd className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded ml-2">ESC</kbd>
            </div>
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-notion-text-muted-light">Recent Projects</div>
              <div className="px-3 py-2 text-sm hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark rounded cursor-pointer flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                今晚直播：國會大亂鬥
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<HomePage />} />
            <Route path="project/:id" element={<EditorPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
