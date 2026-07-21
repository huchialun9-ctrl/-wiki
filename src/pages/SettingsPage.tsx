import { API_BASE_URL } from "../config";
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Shield, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [teamRoles, setTeamRoles] = useState<any[]>([]);
  const { token, user: currentUser, currentTeam, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  
  // Custom role state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCanEdit, setNewRoleCanEdit] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (token && currentTeam) {
        fetchUsers();
        fetchRoles();
      } else {
        setLoading(false);
      }
    }
  }, [token, currentTeam, authLoading]);

  const fetchUsers = async () => {
    if (!currentTeam) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${currentTeam.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    if (!currentTeam) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${currentTeam.id}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTeamRoles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/teams/${currentTeam?.id}/members/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roleId })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentTeam || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${currentTeam.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole || teamRoles[0]?.name || '企劃', roleId: inviteRole || teamRoles[0]?.id })
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

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName || !currentTeam || !token) return;
    try {
      await fetch(`${API_BASE_URL}/api/teams/${currentTeam.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newRoleName, canEdit: newRoleCanEdit, canInvite: false })
      });
      setNewRoleName('');
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm('確定要刪除此角色嗎？')) return;
    try {
      await fetch(`${API_BASE_URL}/api/teams/${currentTeam?.id}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
  };

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
            <h1 className="text-3xl font-bold">設定與權限管理</h1>
            <p className="text-notion-text-muted-light mt-1">管理您的團隊 {currentTeam?.name} 的設定與客製化角色</p>
          </div>
        </div>

        {/* Roles Management Form */}
        {isAdmin && (
          <div className="mb-8 bg-white dark:bg-[#2F2F2F] rounded-xl shadow-sm border border-notion-border-light dark:border-notion-border-dark p-6">
            <h3 className="font-semibold text-lg mb-2">客製化權限角色 (Custom Roles)</h3>
            <p className="text-sm text-notion-text-muted-light mb-4">自訂您專屬的職稱與權限，分配給您的團隊成員。</p>
            
            <form onSubmit={createRole} className="flex gap-2 mb-6 items-center">
              <input 
                type="text" 
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="輸入新職稱 (例如: 文案總監)"
                className="flex-1 max-w-xs bg-transparent border border-notion-border-light dark:border-notion-border-dark rounded-lg px-4 py-2 outline-none focus:border-blue-500 text-sm"
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer ml-2">
                <input type="checkbox" checked={newRoleCanEdit} onChange={e => setNewRoleCanEdit(e.target.checked)} className="rounded border-gray-300" />
                允許編輯懶人包
              </label>
              <button type="submit" className="ml-auto bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg font-medium hover:opacity-80 transition-opacity flex items-center gap-1 text-sm">
                <Plus size={16} /> 新增角色
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {teamRoles.map(role => (
                <div key={role.id} className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full border border-notion-border-light dark:border-notion-border-dark">
                  <span className="text-sm font-medium">{role.name}</span>
                  {role.canEdit && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded">編輯</span>}
                  {role.canInvite && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded">管理</span>}
                  {!role.canInvite && (
                    <button onClick={() => deleteRole(role.id)} className="text-gray-400 hover:text-red-500 ml-1 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
              <select
                value={inviteRole || (teamRoles[0]?.id || '')}
                onChange={e => setInviteRole(e.target.value)}
                className="bg-transparent border border-notion-border-light dark:border-notion-border-dark rounded-lg px-4 py-2 outline-none focus:border-blue-500 cursor-pointer"
              >
                {teamRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shrink-0">
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
                      value={u.roleId || ''}
                      onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                      className="bg-transparent border border-notion-border-light dark:border-notion-border-dark rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {teamRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
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
