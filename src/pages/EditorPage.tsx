import { useState, useRef, useEffect } from 'react';
import { useParams, useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import NotionEditor from '../components/NotionEditor';
import { Paperclip, Loader2, X, LayoutTemplate, FileText } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import CommentPanel from '../components/CommentPanel';
import { API_BASE_URL } from '../config';
import { templates } from "../utils/templates";
import CanvasEditor from '../components/CanvasEditor';
import YoutubePlayer from '../components/YoutubePlayer';

const getYoutubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
};

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<any>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [commentTarget, setCommentTarget] = useState<{ blockId: string; text: string } | null>(null);
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'text' | 'canvas' | 'split'>('text');
  const [analyzeFormat, setAnalyzeFormat] = useState('summary');
  const [analyzeStatus, setAnalyzeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [analyzeMsg, setAnalyzeMsg] = useState('');
  const [youtubeTime, setYoutubeTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const { sidebarOpen, setSidebarOpen } = useOutletContext<{ sidebarOpen: boolean, setSidebarOpen: any }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenComments = (e: Event) => {
      const event = e as CustomEvent;
      setCommentTarget(event.detail);
    };
    window.addEventListener('openComments', handleOpenComments);
    return () => window.removeEventListener('openComments', handleOpenComments);
  }, []);

  useEffect(() => {
    if (id && token) {
      fetch(`${API_BASE_URL}/api/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setProject(data);
          
          // Record history
          fetch(`${API_BASE_URL}/api/user/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ projectId: id })
          }).catch(err => console.error('Failed to record history', err));
        })
        .catch(err => console.error(err));
    }
  }, [id, token]);

  const updateTitle = (newTitle: string) => {
    if (!id || !token) return;
    fetch(`${API_BASE_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle })
    });
  };

  const updateCategory = (newCategory: string) => {
    if (!id || !token) return;
    fetch(`${API_BASE_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ category: newCategory })
    }).then(() => window.dispatchEvent(new Event('refreshProjects')));
  };

  const exportMarkdown = () => {
    if (!project || !project.content) return;
    try {
      const blocks = JSON.parse(project.content);
      let mdText = `# ${project.title}\n\n`;
      blocks.forEach((b: any) => {
        if (b.type === 'heading') {
          const level = '#'.repeat(b.props.level || 1);
          mdText += `${level} ${b.content.map((c: any) => c.text).join('')}\n\n`;
        } else if (b.type === 'bulletListItem') {
          mdText += `- ${b.content.map((c: any) => c.text).join('')}\n`;
        } else if (b.type === 'paragraph') {
          if (b.content.length > 0) {
            mdText += `${b.content.map((c: any) => c.text).join('')}\n\n`;
          }
        }
      });
      const blob = new Blob([mdText], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    }
  };
  const exportPdf = () => {
    // 透過瀏覽器原生的列印對話框轉存 PDF，配合 print.css 隱藏 UI
    window.print();
  };


  
  // AI Staging Area State


  // 將字串轉換為 BlockNote 合法的 InlineContent 陣列
  const toInline = (text: string) => [{ type: "text" as const, text: String(text || ''), styles: {} }];

  const generateBlocksFromResult = (data: any) => {
    if (!data.result) return [];

    // 前端也自動偵測格式：如果後端回傳 'auto' 或格式與 result 的 key 不符，從 result 結構推斷
    let detectedFormat = data.format;
    if (!detectedFormat || detectedFormat === 'auto') {
      if (data.result.timeline) detectedFormat = 'timeline';
      else if (data.result.tree) detectedFormat = 'tree';
      else if (data.result.summary) detectedFormat = 'summary';
      else detectedFormat = 'timeline';
    }
    // 覆蓋 data.format 供後續判斷使用
    const fmt = detectedFormat;
    
    // 1. 樹狀圖 (Tree)
    if (fmt === 'tree' && data.result.tree) {
      const { title, overview, nodes } = data.result.tree;
      const blocks: any[] = [];
      
      if (title) blocks.push({ type: "heading", props: { level: 2, textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(title), children: [] });
      if (overview) blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "blue", textAlignment: "left" }, content: toInline(`💡 ${overview}`), children: [] });
      
      const buildTree = (subNodes: any[]): any[] => {
        if (!subNodes || !Array.isArray(subNodes)) return [];
        return subNodes.map(sub => ({
          type: "bulletListItem",
          props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
          content: toInline(sub.concept + (sub.details ? `：${sub.details}` : "")),
          children: buildTree(sub.subConcepts)
        }));
      };
      
      if (nodes && Array.isArray(nodes)) {
        nodes.forEach((n: any) => {
          blocks.push({
            type: "heading",
            props: { level: 3, textColor: "default", backgroundColor: "default", textAlignment: "left" },
            content: toInline(n.concept),
            children: buildTree(n.subConcepts || [])
          });
          if (n.details) {
            blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(n.details), children: [] });
          }
        });
      }
      return blocks;
    } 
    // 2. 懶人包摘要 (Summary)
    else if (fmt === 'summary' && data.result.summary) {
      const { title, tldr, keyPoints } = data.result.summary;
      const blocks: any[] = [];
      
      if (title) blocks.push({ type: "heading", props: { level: 2, textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(title), children: [] });
      if (tldr) blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "blue", textAlignment: "left" }, content: toInline(`💡 一分鐘速讀：${tldr}`), children: [] });
      
      if (keyPoints && Array.isArray(keyPoints)) {
        keyPoints.forEach((item: any) => {
          if (item.point) blocks.push({ type: "heading", props: { level: 3, textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(item.point), children: [] });
          if (item.explanation) blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(item.explanation), children: [] });
          
          if (item.details && Array.isArray(item.details)) {
            item.details.forEach((detail: string) => {
              blocks.push({ type: "bulletListItem", props: { textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(detail), children: [] });
            });
          }
          if (item.quotes && Array.isArray(item.quotes)) {
            item.quotes.forEach((quote: string) => {
              blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "yellow", textAlignment: "left" }, content: toInline(`💬 ${quote}`), children: [] });
            });
          }
        });
      }
      return blocks;
    } 
    // 3. 時間線 (Timeline) - 同時支援新格式 {title, events[]} 和舊格式直接陣列
    else if (fmt === 'timeline' && data.result.timeline) {
      const timelineData = data.result.timeline;
      const blocks: any[] = [];

      // 新格式：{ title, events[] }
      if (timelineData && !Array.isArray(timelineData) && timelineData.events) {
        const { title, events } = timelineData;
        if (title) blocks.push({ type: "heading", props: { level: 2, textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(title), children: [] });
        events.forEach((item: any) => {
          const label = item.title || item.text || '';
          if (item.time || label) {
            blocks.push({ type: "heading", props: { level: 3, textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(`📌 [${item.time || ''}] ${label}`), children: [] });
          }
          const desc = item.description || item.text || '';
          if (desc && desc !== label) blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(desc), children: [] });
          if (item.impact) blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "orange", textAlignment: "left" }, content: toInline(`⚡ 影響：${item.impact}`), children: [] });
        });
      }
      // 舊格式：直接是陣列 timeline: [...]
      else if (Array.isArray(timelineData)) {
        timelineData.forEach((item: any) => {
          const label = item.title || item.text || '';
          if (item.time || label) {
            blocks.push({ type: "heading", props: { level: 3, textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(`📌 [${item.time || ''}] ${label}`), children: [] });
          }
          const desc = item.description || (item.text !== label ? item.text : '');
          if (desc) blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(desc), children: [] });
          if (item.impact) blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "orange", textAlignment: "left" }, content: toInline(`⚡ 影響：${item.impact}`), children: [] });
        });
      }

      return blocks;
    }
    
    // 降級：嘗試從 result 直接讀出文字
    const fallbackText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
    return [{ type: "paragraph", props: { textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(fallbackText), children: [] }];
  };

  useEffect(() => {
    const analyzeUrl = searchParams.get('analyze_url');
    if (analyzeUrl && token && !isUploading) {
      const runAutoAnalysis = async () => {
        setIsUploading(true);
        try {
          const formatFromUrl = searchParams.get('format') || 'summary';
          const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ url: analyzeUrl, format: formatFromUrl })
          });
          const data = await response.json();
          
          if (data.success && data.result) {
            const blocksToInsert = generateBlocksFromResult(data);
            window.dispatchEvent(new CustomEvent('insertBlocks', { detail: blocksToInsert }));
            
            const ytId = getYoutubeId(analyzeUrl);
            if (ytId && project) {
              setProject((prev: any) => ({ ...prev, youtubeUrl: analyzeUrl }));
              fetch(`${API_BASE_URL}/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ youtubeUrl: analyzeUrl })
              });
            }
          }
        } catch (error) {
          console.error("Auto URL Analysis failed", error);
        } finally {
          setIsUploading(false);
          searchParams.delete('analyze_url');
          setSearchParams(searchParams);
        }
      };
      runAutoAnalysis();
    }
  }, [searchParams, token]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setAnalyzeStatus('loading');
    setAnalyzeMsg('🔄 正在分析檔案...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', analyzeFormat);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      
      if (data.success && data.result) {
        const blocksToInsert = generateBlocksFromResult(data);
        setAnalyzeStatus('success');
        setAnalyzeMsg('✅ 分析完成！');
        setTimeout(() => setAnalyzeStatus('idle'), 3000);
        
        if (id) {
          window.dispatchEvent(new CustomEvent('insertBlocks', { detail: blocksToInsert }));
        } else {
          // Create new project when on home page
          const createRes = await fetch(`${API_BASE_URL}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
              title: data.filename || file.name || '新分析報告', 
              content: JSON.stringify(blocksToInsert)
            })
          });
          const newProject = await createRes.json();
          window.dispatchEvent(new Event('refreshProjects'));
          navigate(`/project/${newProject.id}`);
        }
      }
    } catch (error) {
      console.error("Upload failed", error);
      setAnalyzeStatus('error');
      setAnalyzeMsg('❌ 分析失敗，請稍後重試');
      setTimeout(() => setAnalyzeStatus('idle'), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const url = e.currentTarget.value;
      if (!url.startsWith('http')) {
        alert('請輸入有效的網址 (以 http 開頭)');
        return;
      }
      setIsUploading(true);
      setAnalyzeStatus('loading');
      setAnalyzeMsg('🔄 AI 分析中，請稍候（約 15-30 秒）...');
      try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ url, format: analyzeFormat })
        });
        const data = await response.json();
        
        if (data.success && data.result) {
          const blocksToInsert = generateBlocksFromResult(data);
          setAnalyzeStatus('success');
          setAnalyzeMsg('✅ 分析完成！');
          setTimeout(() => setAnalyzeStatus('idle'), 3000);
          
          if (id) {
            window.dispatchEvent(new CustomEvent('insertBlocks', { detail: blocksToInsert }));
            
            const ytId = getYoutubeId(url);
            if (ytId && project) {
              setProject((prev: any) => ({ ...prev, youtubeUrl: url }));
              fetch(`${API_BASE_URL}/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ youtubeUrl: url })
              });
            }
          } else {
            // Create new project when on home page
            const createRes = await fetch(`${API_BASE_URL}/api/projects`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ 
                title: data.filename || '新分析報告', 
                content: JSON.stringify(blocksToInsert),
                youtubeUrl: getYoutubeId(url) ? url : undefined
              })
            });
            const newProject = await createRes.json();
            window.dispatchEvent(new Event('refreshProjects'));
            navigate(`/project/${newProject.id}`);
          }
        }
      } catch (error) {
        console.error("URL Analysis failed", error);
        setAnalyzeStatus('error');
        setAnalyzeMsg('❌ 分析失敗，請確認網址是否正確');
        setTimeout(() => setAnalyzeStatus('idle'), 4000);
      } finally {
        setIsUploading(false);
        e.currentTarget.value = '';
      }
    }
  };

  const generateCanvasGraph = async () => {
    if (!project || !project.content) return;
    setIsUploading(true);
    setAnalyzeStatus('loading');
    setAnalyzeMsg('🔄 AI 正在將懶人包轉為首覺畫布，請稍候（約 10-20 秒）...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: project.content })
      });
      const data = await response.json();
      if (data.success && data.graphData) {
        const graphDataStr = JSON.stringify(data.graphData);
        setProject((prev: any) => ({ ...prev, graphData: graphDataStr }));
        fetch(`${API_BASE_URL}/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ graphData: graphDataStr })
        });
        setAnalyzeStatus('success');
        setAnalyzeMsg('✅ 畫布產生完成！');
        setTimeout(() => setAnalyzeStatus('idle'), 2000);
        setViewMode('canvas');
      } else {
        throw new Error(data.error || '未知錯誤');
      }
    } catch (error: any) {
      console.error("Generate graph failed", error);
      setAnalyzeStatus('error');
      setAnalyzeMsg(`❌ 畫布產生失敗：${error.message || '請稍後重試'}`);
      setTimeout(() => setAnalyzeStatus('idle'), 4000);
    } finally {
      setIsUploading(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // CANVAS MODE — full-page, completely separate layout
  // ────────────────────────────────────────────────────────────
  if (viewMode === 'canvas') {
    return (
      <div className="flex flex-col w-full h-screen bg-gray-50 dark:bg-[#0f0f0f] overflow-hidden">
        {/* Canvas Toolbar */}
        <div className="shrink-0 h-12 flex items-center px-4 gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-10">
          {/* Home button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            首頁
          </button>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          {/* Back to text mode */}
          <button
            onClick={() => setViewMode('text')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors"
          >
            ← 返回文字懶人包
          </button>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          {/* Project title */}
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-xs">
            🧩 {project?.title || '視覺畫布'}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Regenerate */}
            <button
              onClick={generateCanvasGraph}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : '🔄'}
              重新產生
            </button>
          </div>
        </div>

        {/* Loading overlay */}
        {analyzeStatus === 'loading' && (
          <div className="absolute inset-0 top-12 z-50 flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm">
            <Loader2 size={40} className="animate-spin text-blue-400 mb-4" />
            <p className="text-white font-medium">{analyzeMsg}</p>
          </div>
        )}

        {/* Full-page canvas */}
        <div className="flex-1 overflow-hidden">
          <CanvasEditor
            initialData={project?.graphData}
            currentTime={youtubeTime}
            onPlayNode={(time) => setSeekTime(time)}
            onChange={(data) => {
              if (!id || !token) return;
              fetch(`${API_BASE_URL}/api/projects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ graphData: data })
              });
            }}
          />
        </div>

        <YoutubePlayer
          videoId={project?.youtubeUrl ? (getYoutubeId(project.youtubeUrl) || '') : ''}
          seekToTime={seekTime}
          onTimeUpdate={setYoutubeTime}
        />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // TEXT MODE — normal editor layout
  // ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Top Navbar / Quick Add Bar Placeholder */}
      {!liveMode && (
        <div className="sticky top-0 z-10 w-full h-12 flex items-center px-4 shrink-0 bg-notion-bg-light/80 dark:bg-notion-bg-dark/80 backdrop-blur-md">
          {!sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 mr-2 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-muted-light dark:text-notion-text-muted-dark transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
          
          <div className="flex-1 max-w-2xl mx-auto flex items-center bg-gray-100/5 dark:bg-gray-800/5 rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-notion-border-light dark:focus-within:ring-notion-border-dark transition-shadow relative">
            {analyzeStatus === 'loading' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 dark:bg-blue-900/20 rounded-md z-10">
                <Loader2 size={14} className="animate-spin text-blue-500 mr-2" />
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{analyzeMsg}</span>
              </div>
            ) : analyzeStatus === 'success' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 dark:bg-green-900/20 rounded-md z-10">
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">{analyzeMsg}</span>
              </div>
            ) : analyzeStatus === 'error' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 dark:bg-red-900/20 rounded-md z-10">
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">{analyzeMsg}</span>
              </div>
            ) : null}
            <span className="text-blue-500 mr-2" title="AI 自動摘要">✨</span>
            
            <select 
              value={analyzeFormat}
              onChange={(e) => setAnalyzeFormat(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-notion-text-light dark:text-notion-text-dark font-medium cursor-pointer mr-2 shrink-0 border-r border-gray-200 dark:border-gray-700 pr-2"
            >
              <option value="summary">懶人包模式</option>
              <option value="timeline">時間軸模式</option>
              <option value="tree">心智圖模式</option>
            </select>

            <input 
              type="text" 
              placeholder="貼上 YouTube 連結、網址，或輸入 / 開始整理..."
              onKeyDown={handleUrlSubmit}
              disabled={isUploading}
              className="w-full bg-transparent text-sm border-none outline-none placeholder:text-notion-text-muted-light dark:placeholder:text-notion-text-muted-dark disabled:opacity-50"
            />
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".pdf,.txt,.md,.mp4,.mp3"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="ml-2 text-notion-text-muted-light hover:text-notion-text-light transition-colors p-1 rounded hover:bg-gray-200/5"
              title="上傳檔案以自動分析"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </button>
          </div>
          
          <div className="ml-auto flex items-center gap-2 relative">
            <button 
              onClick={() => setLiveMode(true)}
              className="text-sm px-3 py-1 font-medium rounded text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1 border border-red-500/20"
              title="切換至直播清晰模式"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Live Focus
            </button>
            <button 
              onClick={() => exportMarkdown()}
              className="text-sm px-3 py-1 font-medium rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors border border-gray-200 dark:border-gray-700 flex items-center gap-1.5"
              title="匯出為 Markdown"
            >
              <FileText size={14} />
              MD
            </button>
            <button 
              onClick={() => exportPdf()}
              className="text-sm px-3 py-1 font-medium rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 mr-2"
              title="匯出為 PDF"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              PDF
            </button>
            
            <div className="relative no-print">
              <button 
                onClick={() => setShareOpen(!shareOpen)}
                className="text-sm px-3 py-1 font-medium rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors"
              >
                Share
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-notion-bg-light dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark shadow-xl rounded-lg py-1 z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-notion-text-muted-light border-b border-notion-border-light dark:border-notion-border-dark mb-1">
                    Export Options
                  </div>
                  <button onClick={() => { alert('已發布至網頁！'); setShareOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors">
                    Publish to Web
                  </button>
                  <button onClick={() => { setQrModalOpen(true); setShareOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors">
                    Generate QR Code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Mode Exit Button */}
      {liveMode && (
        <button 
          onClick={() => setLiveMode(false)}
          className="fixed top-4 right-4 z-50 bg-gray-800/70 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-900 transition-colors backdrop-blur flex items-center gap-2 shadow-lg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
          Exit Live Focus
        </button>
      )}

      {/* Editor Layout */}
      <div className={`flex flex-col xl:flex-row gap-6 w-full mx-auto py-12 pb-32 transition-all duration-300 ${liveMode ? 'max-w-5xl px-8 sm:px-16 text-lg' : 'max-w-7xl px-8 sm:px-12 text-base'}`}>
        
       <main className="flex-1 overflow-y-auto relative p-6 flex gap-6 custom-scrollbar bg-gray-50 dark:bg-[#121212] transition-colors">
        <div className="flex-1 min-w-0 transition-all duration-500 max-w-4xl mx-auto xl:px-12">
          {/* Title Area */}
          <div className="mb-8 group relative no-print">
            <div className="flex items-center gap-4 mb-4">
              <div className="cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark w-fit rounded transition-colors p-1 -ml-1">
                <img src="/blob.png" alt="Page Icon" className="w-16 h-16 object-contain" />
              </div>
              
              {project && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark w-fit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <input 
                      type="text"
                      defaultValue={project.category || 'Drafts'}
                      onBlur={(e) => updateCategory(e.target.value)}
                      className="bg-transparent border-none outline-none w-24 focus:w-32 transition-all text-sm"
                      placeholder="專案分類"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newStatus = !project.isPublished;
                      setProject({ ...project, isPublished: newStatus });
                    fetch(`${API_BASE_URL}/api/projects/${project.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ isPublished: newStatus })
                    }).then(() => window.dispatchEvent(new Event('refreshProjects')));
                  }}
                    className={`px-3 py-1 text-xs font-medium rounded shadow transition-colors flex items-center gap-1.5 ${
                      project.isPublished 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800" 
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${project.isPublished ? 'bg-green-500' : 'bg-gray-400'}`}/>
                    {project.isPublished ? "已正式發布" : "標記為正式"}
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {project?.graphData && (
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
                  <button 
                    onClick={() => setViewMode('text')}
                    className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                  >
                    📝 文字模式
                  </button>
                  <button 
                    onClick={() => setViewMode('canvas')}
                    className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    🧩 畫布模式
                  </button>
                </div>
              )}
              
              {project?.content && project.content.length > 10 && (
                <button 
                  onClick={generateCanvasGraph}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md flex items-center gap-2 disabled:opacity-50 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-none"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : "✨"}
                  {project?.graphData ? "🔄 重新產生畫布" : "下一步：產生視覺畫布"}
                </button>
              )}
            </div>
            
            {project ? (
              <input 
                type="text"
                defaultValue={project.title}
                onBlur={(e) => updateTitle(e.target.value)}
                className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-notion-text-muted-light dark:placeholder:text-notion-text-muted-dark"
              />
            ) : (
              <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"/>
            )}
          </div>
          
          <NotionEditor 
            initialBlocks={project?.content ? JSON.parse(project.content) : undefined} 
            projectId={project?.id}
          />

          {/* Empty State Guide */}
          {!isUploading && project && (!project.content || project.content === '[]' || project.content.includes('"content":""')) && (
            <div className="mb-8">
              <div 
                className="p-12 border-2 border-dashed border-notion-border-light dark:border-notion-border-dark rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors mb-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 mb-4 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">上傳檔案或貼上 YouTube 網址以開始解析</h3>
                <p className="text-notion-text-muted-light dark:text-notion-text-muted-dark max-w-md">
                  點擊此處上傳 PDF、文件或影片。或是直接在上方搜尋列貼上 YouTube 網址，系統將自動擷取字幕並萃取精華！
                </p>
              </div>

              {/* Template Library */}
              <div className="mt-12">
                <div className="flex items-center gap-2 mb-6 text-notion-text-muted-light dark:text-notion-text-muted-dark">
                  <LayoutTemplate size={20} />
                  <h3 className="text-lg font-semibold">或是從精選版型開始 (Template Library)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map((tpl: any) => (
                    <div 
                      key={tpl.id}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('insertBlocks', { detail: tpl.blocks }));
                      }}
                      className="p-5 border border-notion-border-light dark:border-notion-border-dark rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group bg-white dark:bg-[#1E1E1E]"
                    >
                      <h4 className="font-bold text-lg mb-2 group-hover:text-blue-500 transition-colors flex items-center">
                        <img src="/blob.png" alt="icon" className="w-5 h-5 inline-block mr-2 rounded" />
                        {tpl.title}
                      </h4>
                      <p className="text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mb-8 p-12 rounded-xl flex flex-col items-center justify-center text-center bg-blue-50 dark:bg-blue-900/10">
              <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400">AI 正在努力閱讀與解析中...</h3>
              <p className="text-sm text-blue-500/70 mt-2">即將產生精美的分析報告</p>
            </div>
          )}
        </div>
      </main>

        {/* QR Code Modal */}
        {qrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm" onClick={() => setQrModalOpen(false)}>
            <div className="bg-white dark:bg-notion-bg-dark p-8 rounded-xl shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <div className="flex w-full justify-between items-center mb-6">
                <h3 className="font-bold text-xl">分享給觀眾掃描</h3>
                <button onClick={() => setQrModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={window.location.href} size={200} />
              </div>
              <p className="mt-4 text-sm text-notion-text-muted-light">使用手機掃描即可檢視此懶人包</p>
            </div>
          </div>
        )}
      </div>

      {commentTarget && id && (
        <CommentPanel
          projectId={id}
          blockId={commentTarget.blockId}
          onClose={() => setCommentTarget(null)}
        />
      )}
      <YoutubePlayer 
        videoId={project?.youtubeUrl ? (getYoutubeId(project.youtubeUrl) || "") : ""} 
        seekToTime={seekTime} 
        onTimeUpdate={setYoutubeTime} 
      />
    </>
  );
}

        <div className="sticky top-0 z-10 w-full h-12 flex items-center px-4 shrink-0 bg-notion-bg-light/80 dark:bg-notion-bg-dark/80 backdrop-blur-md">
          {!sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 mr-2 rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark text-notion-text-muted-light dark:text-notion-text-muted-dark transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}
          
          <div className="flex-1 max-w-2xl mx-auto flex items-center bg-gray-100/5 dark:bg-gray-800/5 rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-notion-border-light dark:focus-within:ring-notion-border-dark transition-shadow relative">
            {analyzeStatus === 'loading' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 dark:bg-blue-900/20 rounded-md z-10">
                <Loader2 size={14} className="animate-spin text-blue-500 mr-2" />
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{analyzeMsg}</span>
              </div>
            ) : analyzeStatus === 'success' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 dark:bg-green-900/20 rounded-md z-10">
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">{analyzeMsg}</span>
              </div>
            ) : analyzeStatus === 'error' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 dark:bg-red-900/20 rounded-md z-10">
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">{analyzeMsg}</span>
              </div>
            ) : null}
            <span className="text-blue-500 mr-2" title="AI 自動摘要">✨</span>
            
            <select 
              value={analyzeFormat}
              onChange={(e) => setAnalyzeFormat(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-notion-text-light dark:text-notion-text-dark font-medium cursor-pointer mr-2 shrink-0 border-r border-gray-200 dark:border-gray-700 pr-2"
            >
              <option value="summary">懶人包模式</option>
              <option value="timeline">時間軸模式</option>
              <option value="tree">心智圖模式</option>
            </select>

            <input 
              type="text" 
              placeholder="貼上 YouTube 連結、網址，或輸入 / 開始整理..."
              onKeyDown={handleUrlSubmit}
              disabled={isUploading}
              className="w-full bg-transparent text-sm border-none outline-none placeholder:text-notion-text-muted-light dark:placeholder:text-notion-text-muted-dark disabled:opacity-50"
            />
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".pdf,.txt,.md,.mp4,.mp3"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="ml-2 text-notion-text-muted-light hover:text-notion-text-light transition-colors p-1 rounded hover:bg-gray-200/5"
              title="上傳檔案以自動分析"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </button>
          </div>
          
          <div className="ml-auto flex items-center gap-2 relative">
            <button 
              onClick={() => setLiveMode(true)}
              className="text-sm px-3 py-1 font-medium rounded text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1 border border-red-500/20"
              title="切換至直播清晰模式"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Live Focus
            </button>
            <button 
              onClick={() => exportMarkdown()}
              className="text-sm px-3 py-1 font-medium rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors border border-gray-200 dark:border-gray-700 flex items-center gap-1.5"
              title="匯出為 Markdown"
            >
              <FileText size={14} />
              MD
            </button>
            <button 
              onClick={() => exportPdf()}
              className="text-sm px-3 py-1 font-medium rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 mr-2"
              title="匯出為 PDF"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              PDF
            </button>
            
            <div className="relative no-print">
              <button 
                onClick={() => setShareOpen(!shareOpen)}
                className="text-sm px-3 py-1 font-medium rounded hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors"
              >
                Share
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-notion-bg-light dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark shadow-xl rounded-lg py-1 z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-notion-text-muted-light border-b border-notion-border-light dark:border-notion-border-dark mb-1">
                    Export Options
                  </div>
                  <button onClick={() => { alert('已發布至網頁！'); setShareOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors">
                    Publish to Web
                  </button>
                  <button onClick={() => { setQrModalOpen(true); setShareOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors">
                    Generate QR Code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Mode Exit Button */}
      {liveMode && (
        <button 
          onClick={() => setLiveMode(false)}
          className="fixed top-4 right-4 z-50 bg-gray-800/70 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-900 transition-colors backdrop-blur flex items-center gap-2 shadow-lg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
          Exit Live Focus
        </button>
      )}

      {/* Editor & AI Staging Area Layout */}
      <div className={`flex flex-col xl:flex-row gap-6 w-full mx-auto py-12 pb-32 transition-all duration-300 ${liveMode ? 'max-w-5xl px-8 sm:px-16 text-lg' : (viewMode === 'split' ? 'w-full px-8 sm:px-12 text-base' : 'max-w-7xl px-8 sm:px-12 text-base')}`}>
        
       <main className="flex-1 overflow-y-auto relative p-6 flex gap-6 custom-scrollbar bg-gray-50 dark:bg-[#121212] transition-colors">
        <div className={`flex-1 min-w-0 transition-all duration-500 ${viewMode === 'split' ? 'w-full mx-auto' : 'max-w-4xl mx-auto xl:px-12'}`}>
          {/* Title Area */}
          <div className="mb-8 group relative no-print">
            <div className="flex items-center gap-4 mb-4">
              <div className="cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark w-fit rounded transition-colors p-1 -ml-1">
                <img src="/blob.png" alt="Page Icon" className="w-16 h-16 object-contain" />
              </div>
              
              {project && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark w-fit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    <input 
                      type="text"
                      defaultValue={project.category || 'Drafts'}
                      onBlur={(e) => updateCategory(e.target.value)}
                      className="bg-transparent border-none outline-none w-24 focus:w-32 transition-all text-sm"
                      placeholder="專案分類"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newStatus = !project.isPublished;
                      setProject({ ...project, isPublished: newStatus });
                    fetch(`${API_BASE_URL}/api/projects/${project.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ isPublished: newStatus })
                    }).then(() => window.dispatchEvent(new Event('refreshProjects')));
                  }}
                    className={`px-3 py-1 text-xs font-medium rounded shadow transition-colors flex items-center gap-1.5 ${
                      project.isPublished 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800" 
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${project.isPublished ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    {project.isPublished ? "已正式發布" : "標記為正式"}
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {project?.graphData && (
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
                  <button 
                    onClick={() => setViewMode('text')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'text' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    📝 文字模式
                  </button>
                  <button 
                    onClick={() => setViewMode('canvas')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'canvas' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    🧩 畫布模式
                  </button>
                </div>
              )}
              
              {project?.content && project.content.length > 10 && viewMode !== 'canvas' && (
                <button 
                  onClick={generateCanvasGraph}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md flex items-center gap-2 disabled:opacity-50 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-none"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : "✨"}
                  {project?.graphData ? "🔄 重新產生畫布" : "下一步：產生視覺畫布"}
                </button>
              )}
            </div>
            
            {project ? (
              <input 
                type="text"
                defaultValue={project.title}
                onBlur={(e) => updateTitle(e.target.value)}
                className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-notion-text-muted-light dark:placeholder:text-notion-text-muted-dark"
              />
            ) : (
              <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
            )}
          </div>
          
          {viewMode === 'text' ? (
            <NotionEditor 
              initialBlocks={project?.content ? JSON.parse(project.content) : undefined} 
              projectId={project?.id}
            />
          ) : (
            <div className="fixed inset-0 top-12 z-20 bg-gray-50 dark:bg-[#0f0f0f]">
              {/* Floating back button */}
              <button
                onClick={() => setViewMode('text')}
                className="absolute top-4 left-4 z-30 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105 text-gray-700 dark:text-gray-200"
              >
                ← 返回文字懶人包
              </button>
              {/* Regenerate button */}
              <button
                onClick={generateCanvasGraph}
                disabled={isUploading}
                className="absolute top-4 right-4 z-30 flex items-center gap-2 px-4 py-2 bg-blue-600/90 dark:bg-blue-700/90 backdrop-blur-md rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105 text-white disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : "🔄"}
                重新產生
              </button>
              <CanvasEditor 
                initialData={project?.graphData}
                currentTime={youtubeTime}
                onPlayNode={(time) => setSeekTime(time)}
                onChange={(data) => {
                  if (!id || !token) return;
                  fetch(`${API_BASE_URL}/api/projects/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ graphData: data })
                  });
                }}
              />
            </div>
          )}

          {/* Empty State Guide */}
          {!isUploading && project && (!project.content || project.content === '[]' || project.content.includes('"content":""')) && (
            <div className="mb-8">
              <div 
                className="p-12 border-2 border-dashed border-notion-border-light dark:border-notion-border-dark rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors mb-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 mb-4 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">上傳檔案或貼上 YouTube 網址以開始解析</h3>
                <p className="text-notion-text-muted-light dark:text-notion-text-muted-dark max-w-md">
                  點擊此處上傳 PDF、文件或影片。或是直接在上方搜尋列貼上 YouTube 網址，系統將自動擷取字幕並萃取精華！
                </p>
              </div>

              {/* Template Library */}
              <div className="mt-12">
                <div className="flex items-center gap-2 mb-6 text-notion-text-muted-light dark:text-notion-text-muted-dark">
                  <LayoutTemplate size={20} />
                  <h3 className="text-lg font-semibold">或是從精選版型開始 (Template Library)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map((tpl: any) => (
                    <div 
                      key={tpl.id}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('insertBlocks', { detail: tpl.blocks }));
                      }}
                      className="p-5 border border-notion-border-light dark:border-notion-border-dark rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group bg-white dark:bg-[#1E1E1E]"
                    >
                      <h4 className="font-bold text-lg mb-2 group-hover:text-blue-500 transition-colors flex items-center">
                        <img src="/blob.png" alt="icon" className="w-5 h-5 inline-block mr-2 rounded" />
                        {tpl.title}
                      </h4>
                      <p className="text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mb-8 p-12 rounded-xl flex flex-col items-center justify-center text-center bg-blue-50 dark:bg-blue-900/10">
              <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400">AI 正在努力閱讀與解析中...</h3>
              <p className="text-sm text-blue-500/70 mt-2">即將產生精美的分析報告</p>
            </div>
          )}
        </div>
      </main>


        {/* QR Code Modal */}
        {qrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm" onClick={() => setQrModalOpen(false)}>
            <div className="bg-white dark:bg-notion-bg-dark p-8 rounded-xl shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <div className="flex w-full justify-between items-center mb-6">
                <h3 className="font-bold text-xl">分享給觀眾掃描</h3>
                <button onClick={() => setQrModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={window.location.href} size={200} />
              </div>
              <p className="mt-4 text-sm text-notion-text-muted-light">使用手機掃描即可檢視此懶人包</p>
            </div>
          </div>
        )}
      </div>

      {commentTarget && id && (
        <CommentPanel
          projectId={id}
          blockId={commentTarget.blockId}
          onClose={() => setCommentTarget(null)}
        />
      )}
      <YoutubePlayer 
        videoId={project?.youtubeUrl ? (getYoutubeId(project.youtubeUrl) || "") : ""} 
        seekToTime={seekTime} 
        onTimeUpdate={setYoutubeTime} 
      />
    </>
  );
}
