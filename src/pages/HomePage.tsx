import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:3000/api/projects', {
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
  }, [token]);

  const createProject = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: '無標題懶人包' })
      });
      const data = await res.json();
      navigate(`/project/${data.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-12 sm:p-24 max-w-5xl mx-auto w-full">
      <h1 className="text-4xl font-bold mb-8">Logic Hub 戰情室總覽</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Card */}
        <div 
          onClick={createProject}
          className="border-2 border-dashed border-notion-border-light dark:border-notion-border-dark rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors h-48 group"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <h3 className="font-semibold text-lg">新增專案 (New Project)</h3>
          <p className="text-sm text-notion-text-muted-light mt-2">建立一個空白的懶人包筆記</p>
        </div>

        {/* Dynamic Project Cards */}
        {loading ? (
          <div className="text-sm text-notion-text-muted-light p-6">Loading projects...</div>
        ) : (
          projects.map(p => (
            <Link key={p.id} to={`/project/${p.id}`} className="border border-notion-border-light dark:border-notion-border-dark rounded-xl p-6 flex flex-col hover:shadow-lg hover:border-notion-text-muted-light transition-all h-48 bg-white dark:bg-notion-bg-dark">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={20} className="text-blue-500" />
                <span className="text-xs font-semibold text-notion-text-muted-light px-2 py-1 bg-black/5 dark:bg-white/10 rounded">{p.category}</span>
              </div>
              <h3 className="font-bold text-xl mb-2 line-clamp-2">{p.title}</h3>
              <p className="text-sm text-notion-text-muted-light mt-auto">更新於 {new Date(p.updatedAt).toLocaleDateString()}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
