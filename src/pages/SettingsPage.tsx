import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const { token, user: currentUser, currentTeam, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (token && currentTeam) {
        fetchUsers();
      } else {
        setLoading(false);
      }
    }
  }, [token, currentTeam, authLoading]);

  const fetchUsers = async () => {
    if (!currentTeam) return;
    try {
      const res = await fetch(`http://localhost:3000/api/teams/${currentTeam.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token || !currentTeam) return;
    // Optimistic update
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role: newRole } : u));
    
    try {
      await fetch(`http://localhost:3000/api/teams/${currentTeam.id}/members/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ role: newRole })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentTeam || !token) return;
    try {
      const res = await fetch(`http://localhost:3000/api/teams/${currentTeam.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, role: '企劃' })
      });
      if (res.ok) {
        setInviteEmail('');
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || '邀請失敗，請確認該用戶已註冊');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const roles = ['管理員', '主持人', '企劃', '剪輯師', '來賓'];
  
  const isAdmin = currentTeam?.ownerId === currentUser?.id;

  if (loading) {
    return <div className="p-8 text-center text-notion-text-muted-light">載入中...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-notion-bg-light dark:bg-notion-bg-dark h-full relative">
      <div className="max-w-4xl mx-auto py-12 px-8 pt-16 relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-8 flex items-center gap-1.5 text-sm font-medium text-notion-text-muted-light hover:text-notion-text-light dark:text-notion-text-muted-dark dark:hover:text-notion-text-dark transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-3 py-1.5 rounded-full"
        >
          <ArrowLeft size={16} /> 返回工作區
        </button>

        <div className="mb-8 flex items-center gap-3 border-b border-notion-border-light dark:border-notion-border-dark pb-6">
          <Settings size={28} />
          <div>
            <h1 className="text-3xl font-bold">{currentTeam?.name || '團隊設定'}</h1>
            <p className="text-notion-text-muted-light mt-1">管理當前團隊空間的成員身分與讀寫權限。</p>
          </div>
        </div>

        {/* Invite Form */}
        {isAdmin && (
          <div className="mb-8 bg-white dark:bg-[#2F2F2F] rounded-xl shadow-sm border border-notion-border-light dark:border-notion-border-dark p-6">
            <h3 className="font-semibold text-lg mb-2">邀請成員加入 {currentTeam?.name}</h3>
            <p className="text-sm text-notion-text-muted-light mb-4">輸入已註冊使用者的 Email，即可將他們加入您的團隊。</p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input 
                type="email" 
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                className="flex-1 bg-transparent border border-notion-border-light dark:border-notion-border-dark rounded-lg px-4 py-2 outline-none focus:border-blue-500"
              />
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                邀請加入
              </button>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-[#2F2F2F] rounded-xl shadow-sm border border-notion-border-light dark:border-notion-border-dark overflow-hidden">
          <div className="p-5 border-b border-notion-border-light dark:border-notion-border-dark bg-gray-50/50 dark:bg-black/20 flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            <h2 className="font-semibold text-lg">成員名單 (Team Members)</h2>
          </div>
          
          <div className="divide-y divide-notion-border-light dark:divide-notion-border-dark">
            {users.map(u => (
              <div key={u.userId} className="p-5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {u.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-base flex items-center gap-2">
                      {u.user?.name}
                      {u.userId === currentUser?.id && (
                        <span className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">你</span>
                      )}
                    </div>
                    <div className="text-xs text-notion-text-muted-light mt-0.5">{u.user?.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {isAdmin ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                      className="bg-transparent border border-notion-border-light dark:border-notion-border-dark rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {roles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-3 py-1.5 text-sm text-notion-text-muted-light">{u.role}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
