import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const { token, user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/users', {
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
    if (!token) return;
    // Optimistic update
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    
    try {
      await fetch(`http://localhost:3000/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ role: newRole })
      });
    } catch (err) {
      console.error(err);
      // Revert if failed (omitted for brevity)
    }
  };

  const roles = ['主持人', '企劃', '剪輯師', '來賓'];

  if (loading) {
    return <div className="p-8 text-center text-notion-text-muted-light">載入中...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-notion-bg-light dark:bg-notion-bg-dark h-full">
      <div className="max-w-4xl mx-auto py-12 px-8">
        <div className="mb-8 flex items-center gap-3 border-b border-notion-border-light dark:border-notion-border-dark pb-6">
          <Settings size={28} />
          <div>
            <h1 className="text-3xl font-bold">團隊設定與權限管理</h1>
            <p className="text-notion-text-muted-light mt-1">管理「懶人包 Wiki」的團隊成員身分與讀寫權限。</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#2F2F2F] rounded-xl shadow-sm border border-notion-border-light dark:border-notion-border-dark overflow-hidden">
          <div className="p-5 border-b border-notion-border-light dark:border-notion-border-dark bg-gray-50/50 dark:bg-black/20 flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            <h2 className="font-semibold text-lg">成員名單 (Team Members)</h2>
          </div>
          
          <div className="divide-y divide-notion-border-light dark:divide-notion-border-dark">
            {users.map(u => (
              <div key={u.id} className="p-5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-base flex items-center gap-2">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">你</span>
                      )}
                    </div>
                    <div className="text-xs text-notion-text-muted-light mt-0.5">ID: {u.id.substring(0, 8)}...</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-transparent border border-notion-border-light dark:border-notion-border-dark rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {roles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
