import { API_BASE_URL } from "../config";
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, password: password || undefined })
      });
      if (res.ok) {
        alert('個人資料已更新！如果修改了密碼，請重新登入。');
        if (password) {
          logout();
        } else {
          // Ideally we would update the user in AuthContext, but a page reload works too
          window.location.reload();
        }
      }
    } catch (err) {
      console.error(err);
      alert('更新失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-notion-bg-light dark:bg-notion-bg-dark h-full relative">
      <div className="max-w-2xl mx-auto py-12 px-8 pt-16 relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-8 flex items-center gap-1.5 text-sm font-medium text-notion-text-muted-light hover:text-notion-text-light dark:text-notion-text-muted-dark dark:hover:text-notion-text-dark transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-3 py-1.5 rounded-full"
        >
          <ArrowLeft size={16} /> 返回工作區
        </button>

        <div className="mb-8 flex items-center gap-3 border-b border-notion-border-light dark:border-notion-border-dark pb-6">
          <UserIcon size={28} />
          <div>
            <h1 className="text-3xl font-bold">帳號設定</h1>
            <p className="text-notion-text-muted-light mt-1">管理您的個人資料與密碼</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white dark:bg-[#2F2F2F] rounded-xl shadow-sm border border-notion-border-light dark:border-notion-border-dark p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-notion-text-light dark:text-notion-text-dark">Email 帳號 (唯讀)</label>
            <input 
              type="text" 
              value={user?.email || ''} 
              disabled 
              className="w-full bg-black/5 dark:bg-black/20 border border-transparent rounded-lg px-4 py-2 outline-none text-notion-text-muted-light cursor-not-allowed"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-notion-text-light dark:text-notion-text-dark">顯示名稱</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-transparent border border-notion-border-light dark:border-notion-border-dark rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium mb-2 text-notion-text-light dark:text-notion-text-dark">變更密碼 (選填)</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="輸入新密碼 (若不修改請留空)"
              className="w-full bg-transparent border border-notion-border-light dark:border-notion-border-dark rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-notion-border-light dark:border-notion-border-dark">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} /> {loading ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
