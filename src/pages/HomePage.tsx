import { API_BASE_URL } from "../config";
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, user, currentTeam } = useAuth();

  useEffect(() => {
    if (!token || !currentTeam) return;
    fetch(`${API_BASE_URL}/api/projects?teamId=${currentTeam.id}`, {
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
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
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
          <div className="absolute inset-0 bg-[url('/blob.png')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
          
          <div className="relative z-10 p-12 md:w-1/2 text-white">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              {user?.name}，你好！<br/>歡迎使用 AI 新聞文章精華庫
            </h1>
            <p className="text-blue-100/80 text-lg mb-8 max-w-md leading-relaxed">
              在這裡，您可以貼上任何新聞連結、文章網址或上傳文件，由 AI 快速為您提煉精華重點並生成社群文案，打造您的專屬知識庫。
            </p>
            <button 
              onClick={createProject}
              className="bg-white text-blue-900 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              立即整理新文章/新聞
            </button>
          </div>
          
          <div className="relative z-10 md:w-1/2 p-8 flex justify-center items-center">
            <img 
              src="/blob.png" 
              alt="Dashboard Illustration" 
              className="w-full max-w-sm hover:scale-105 transition-transform duration-500"
            />
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
