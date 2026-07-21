import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Bot, Users, Zap, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, user, currentTeam } = useAuth();

  useEffect(() => {
    if (!token || !currentTeam) return;
    fetch(`http://localhost:3000/api/projects?teamId=${currentTeam.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [token, currentTeam]);

  const createProject = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: '無標題懶人包', category: 'Drafts', teamId: currentTeam?.id })
      });
      const data = await res.json();
      navigate(`/project/${data.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-notion-bg-light dark:bg-notion-bg-dark h-full">
      <div className="p-8 sm:p-12 max-w-6xl mx-auto w-full">
        
        {/* Hero Section */}
        <div className="relative mb-16 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row items-center border border-white/10">
          <div className="absolute inset-0 bg-[url('/hero.png')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
          
          <div className="relative z-10 p-12 md:w-1/2 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-sm font-medium mb-6 backdrop-blur-md">
              <LayoutDashboard size={16} />
              戰情室總覽 (Workspace Overview)
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              {user?.name}，你好！<br/>歡迎來到您的專屬戰情室
            </h1>
            <p className="text-blue-100/80 text-lg mb-8 max-w-md leading-relaxed">
              在這裡，您可以透過 AI 智能解析快速萃取重點，並與團隊成員協作，大幅提升創作與資訊整理的效率。
            </p>
            <button 
              onClick={createProject}
              className="bg-white text-blue-900 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              立即建立新懶人包
            </button>
          </div>
          
          <div className="relative z-10 md:w-1/2 p-8 flex justify-center items-center">
            <img 
              src="/hero.png" 
              alt="AI Logic Dashboard Illustration" 
              className="w-full max-w-sm rounded-2xl shadow-2xl shadow-purple-900/50 hover:scale-105 transition-transform duration-500 border border-white/10"
            />
          </div>
        </div>

        {/* Features Guide */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Zap className="text-yellow-500" />
            快速上手指南
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#2F2F2F] p-6 rounded-2xl border border-notion-border-light dark:border-notion-border-dark hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                <FileText size={24} />
              </div>
              <h3 className="font-bold text-lg mb-2">1. 建立懶人包專案</h3>
              <p className="text-sm text-notion-text-muted-light leading-relaxed">
                點擊「新增專案」來建立一個空白畫布。您可以自由撰寫大綱，或是使用圖文並茂的區塊編輯器來整理思緒。
              </p>
            </div>
            
            <div className="bg-white dark:bg-[#2F2F2F] p-6 rounded-2xl border border-notion-border-light dark:border-notion-border-dark hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-500 rounded-xl flex items-center justify-center mb-4">
                <Bot size={24} />
              </div>
              <h3 className="font-bold text-lg mb-2">2. 讓 AI 為您自動解析</h3>
              <p className="text-sm text-notion-text-muted-light leading-relaxed">
                在編輯器上方貼上 YouTube 影片網址或新聞連結，強大的 AI 引擎將自動為您萃取時間線、樹狀圖或重點摘要。
              </p>
            </div>

            <div className="bg-white dark:bg-[#2F2F2F] p-6 rounded-2xl border border-notion-border-light dark:border-notion-border-dark hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-xl flex items-center justify-center mb-4">
                <Users size={24} />
              </div>
              <h3 className="font-bold text-lg mb-2">3. 團隊即時協作</h3>
              <p className="text-sm text-notion-text-muted-light leading-relaxed">
                在左側邊欄切換或設定您的團隊。邀請企劃、剪輯師加入，大家就能在同一個懶人包上同步留言與編輯。
              </p>
            </div>
          </div>
        </div>
        
        {/* Recent Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">最近編輯的專案</h2>
            <span className="text-sm text-notion-text-muted-light bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
              {currentTeam?.name}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            <div 
              onClick={createProject}
              className="border-2 border-dashed border-notion-border-light dark:border-notion-border-dark rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors h-48 group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <h3 className="font-semibold text-lg">新增專案</h3>
              <p className="text-sm text-notion-text-muted-light mt-1">從空白開始打造</p>
            </div>

            {loading ? (
              <div className="text-sm text-notion-text-muted-light p-6 col-span-2">Loading projects...</div>
            ) : (
              projects.map(p => (
                <Link key={p.id} to={`/project/${p.id}`} className="border border-notion-border-light dark:border-notion-border-dark rounded-2xl p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all h-48 bg-white dark:bg-[#2F2F2F]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-500">
                      <FileText size={20} />
                    </div>
                    <span className="text-xs font-semibold text-notion-text-muted-light px-2 py-1 bg-gray-100 dark:bg-black/30 rounded">{p.category}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{p.title}</h3>
                  <p className="text-xs text-notion-text-muted-light mt-auto">更新於 {new Date(p.updatedAt).toLocaleDateString()}</p>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
