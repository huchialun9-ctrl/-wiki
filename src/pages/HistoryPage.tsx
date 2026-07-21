import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { History, FileText, ArrowLeft, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetch('http://localhost:3000/api/user/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setHistory(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [token]);

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
          <History size={28} />
          <div>
            <h1 className="text-3xl font-bold">歷史瀏覽紀錄</h1>
            <p className="text-notion-text-muted-light mt-1">追蹤您近期檢視與編輯過的所有懶人包專案</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center p-12 bg-black/5 dark:bg-white/5 rounded-2xl">
            <Clock size={48} className="mx-auto text-notion-text-muted-light mb-4 opacity-50" />
            <p className="text-notion-text-muted-light">目前還沒有任何瀏覽紀錄喔！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((h: any) => (
              <Link 
                key={h.id} 
                to={`/project/${h.projectId}`} 
                className="border border-notion-border-light dark:border-notion-border-dark rounded-xl p-5 flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white dark:bg-[#2F2F2F]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                    <FileText size={16} />
                  </div>
                  <span className="text-xs font-semibold text-notion-text-muted-light px-2 py-1 bg-gray-100 dark:bg-black/30 rounded truncate">
                    {h.project?.team?.name || '個人專案'}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2 line-clamp-1">{h.project?.title || '已刪除的懶人包'}</h3>
                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className="text-xs text-notion-text-muted-light">{h.project?.category || 'Drafts'}</span>
                  <span className="text-xs text-notion-text-muted-light flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(h.lastAccessed).toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
