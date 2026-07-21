import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('企劃');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { email, password, name, role };
    
    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-notion-bg-light dark:bg-notion-bg-dark text-notion-text-light dark:text-notion-text-dark font-notion">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-[#2F2F2F] rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_5px_15px_rgba(0,0,0,0.5)] border border-notion-border-light dark:border-notion-border-dark">
        <div className="flex flex-col items-center mb-8">
          <img src="/blob.png" alt="Logo" className="w-16 h-16 mb-4 rounded-2xl shadow-sm" />
          <h1 className="text-2xl font-bold">懶人包 Wiki</h1>
          <p className="text-sm text-notion-text-muted-light mt-1">登入以繼續協作</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <input 
                type="text" 
                placeholder="顯示名稱 (例如：王大明)" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full p-2 rounded border border-notion-border-light dark:border-notion-border-dark bg-transparent focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
              <select 
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full p-2 rounded border border-notion-border-light dark:border-notion-border-dark bg-transparent focus:outline-none focus:border-blue-500 transition-colors text-sm"
              >
                <option value="主持人">主持人</option>
                <option value="企劃">企劃</option>
                <option value="剪輯師">剪輯師</option>
                <option value="來賓">來賓</option>
              </select>
            </>
          )}
          
          <input 
            type="email" 
            placeholder="電子郵件" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full p-2 rounded border border-notion-border-light dark:border-notion-border-dark bg-transparent focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          
          <input 
            type="password" 
            placeholder="密碼" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full p-2 rounded border border-notion-border-light dark:border-notion-border-dark bg-transparent focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />

          <button type="submit" className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded transition-colors mt-2 text-sm">
            {isLogin ? '登入 (Log in)' : '註冊 (Sign up)'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-notion-text-muted-light hover:text-notion-text-light dark:hover:text-white transition-colors"
          >
            {isLogin ? '還沒有帳號？點此註冊' : '已有帳號？點此登入'}
          </button>
        </div>
      </div>
    </div>
  );
}
