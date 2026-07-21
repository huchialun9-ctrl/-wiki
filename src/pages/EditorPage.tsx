import { useState, useRef, useEffect } from 'react';
import { useParams, useOutletContext, useSearchParams } from 'react-router-dom';
import NotionEditor from '../components/NotionEditor';
import ErrorBoundary from '../components/ErrorBoundary';
import { Paperclip, Loader2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import CommentPanel from '../components/CommentPanel';
import { API_BASE_URL } from '../config';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<any>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [commentTarget, setCommentTarget] = useState<{ blockId: string; text: string } | null>(null);
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [format, setFormat] = useState('auto');
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


  
  // AI Staging Area State
  const [aiBlocks, setAiBlocks] = useState<any[] | null>(null);
  const [aiTitle, setAiTitle] = useState<string>('');

  // 將字串轉換為 BlockNote 合法的 InlineContent 陣列
  const toInline = (text: string) => [{ type: "text" as const, text: String(text || ''), styles: {} }];

  const generateBlocksFromResult = (data: any) => {
    if (!data.result) return [];
    
    // 1. 樹狀圖 (Tree)
    if (data.format === 'tree' && data.result.tree) {
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
    else if (data.format === 'summary' && data.result.summary) {
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
    // 3. 時間線 (Timeline)
    else if (data.format === 'timeline' && data.result.timeline) {
      const { title, events } = data.result.timeline;
      const blocks: any[] = [];
      
      if (title) blocks.push({ type: "heading", props: { level: 2, textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(title), children: [] });
      
      if (events && Array.isArray(events)) {
        events.forEach((item: any) => {
          if (item.time || item.title) {
            blocks.push({ type: "heading", props: { level: 3, textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(`📌 [${item.time || ''}] ${item.title || ''}`), children: [] });
          }
          if (item.description) blocks.push({ type: "paragraph", props: { textColor: "default", backgroundColor: "default", textAlignment: "left" }, content: toInline(item.description), children: [] });
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
          const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ url: analyzeUrl, format: 'auto' })
          });
          const data = await response.json();
          
          if (data.success && data.result) {
            const blocksToInsert = generateBlocksFromResult(data);
            
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('insertBlocks', { 
                detail: [
                  { type: "heading", props: { level: 3 }, content: `🌐 網頁解析: ${data.filename || analyzeUrl}` },
                  ...blocksToInsert,
                  { type: "paragraph", content: "" }
                ]
              }));
            }, 1500);
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
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      
      if (data.success && data.result) {
        const blocksToInsert = generateBlocksFromResult(data);
        setAiTitle(`📄 檔案分析: ${file.name}`);
        setAiBlocks(blocksToInsert);
      }
    } catch (error) {
      console.error("Upload failed", error);
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
      try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ url, format })
        });
        const data = await response.json();
        
        if (data.success && data.result) {
          const blocksToInsert = generateBlocksFromResult(data);
          setAiTitle(`🌐 網頁解析: ${data.filename || url}`);
          setAiBlocks(blocksToInsert);
        }
      } catch (error) {
        console.error("URL Analysis failed", error);
      } finally {
        setIsUploading(false);
        e.currentTarget.value = '';
      }
    }
  };

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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}
          
          <div className="flex-1 max-w-2xl mx-auto flex items-center bg-gray-100/5 dark:bg-gray-800/5 rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-notion-border-light dark:focus-within:ring-notion-border-dark transition-shadow">
            <select 
              value={format} 
              onChange={e => setFormat(e.target.value)}
              disabled={isUploading}
              className="bg-transparent text-xs font-semibold border-none outline-none text-notion-text-muted-light dark:text-notion-text-muted-dark hover:text-blue-500 cursor-pointer disabled:opacity-50 appearance-none"
              title="選擇 AI 分析模式"
            >
              <option value="auto">✨ 自動</option>
              <option value="timeline">時間線</option>
              <option value="tree">樹狀圖</option>
              <option value="summary">摘要</option>
            </select>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-3"></div>
            
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
            <div className="relative">
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
                  <button onClick={() => { exportMarkdown(); setShareOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors">
                    Export as Markdown
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
      <div className={`flex flex-col xl:flex-row gap-6 w-full mx-auto py-12 pb-32 transition-all duration-300 ${liveMode ? 'max-w-5xl px-8 sm:px-16 text-lg' : 'max-w-7xl px-8 sm:px-12 text-base'}`}>
        
        {/* Left/Main Document Area */}
        <div className={`flex-1 min-w-0 transition-all duration-500 ${aiBlocks ? 'xl:w-1/2' : 'max-w-4xl mx-auto xl:px-12'}`}>
          {/* Title Area */}
          <div className="mb-8 group relative">
            <div className="mb-4 cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark w-fit rounded transition-colors p-1 -ml-1">
              <img src="/blob.png" alt="Page Icon" className="w-16 h-16 object-contain" />
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
          
          {/* Empty State Guide */}
          {!isUploading && project && (!project.content || project.content === '[]' || project.content.includes('"content":""')) && !aiBlocks && (
            <div 
              className="mb-8 p-12 border-2 border-dashed border-notion-border-light dark:border-notion-border-dark rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-notion-hover-light dark:hover:bg-notion-hover-dark transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 mb-4 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">上傳檔案以開始解析</h3>
              <p className="text-notion-text-muted-light dark:text-notion-text-muted-dark max-w-md">
                點擊此處或使用上方的迴紋針按鈕，上傳 PDF、文件或影片。系統將自動為您萃取時間線與重點區塊！
              </p>
            </div>
          )}

          {isUploading && (
            <div className="mb-8 p-12 rounded-xl flex flex-col items-center justify-center text-center bg-blue-50 dark:bg-blue-900/10">
              <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400">AI 正在努力閱讀與解析中...</h3>
              <p className="text-sm text-blue-500/70 mt-2">即將產生精美的分析報告</p>
            </div>
          )}

          <NotionEditor projectId={id || 'default'} />
        </div>

        {/* Right: AI Staging Area */}
        {aiBlocks && (
          <div className="w-full xl:w-[45%] flex-shrink-0 bg-white dark:bg-[#1E1E1E] rounded-xl border border-notion-border-light dark:border-notion-border-dark overflow-hidden flex flex-col h-[calc(100vh-8rem)] sticky top-20 shadow-2xl animate-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2A2A2A] border-b border-notion-border-light dark:border-notion-border-dark shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  ✨
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI 展示區 (Staging Area)</h3>
                  <p className="text-xs text-notion-text-muted-light">{aiTitle}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('insertBlocks', { 
                      detail: [
                        { type: "heading", props: { level: 3 }, content: aiTitle },
                        ...aiBlocks,
                        { type: "paragraph", content: "" }
                      ]
                    }));
                    setAiBlocks(null);
                  }}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded shadow hover:bg-blue-600 transition-transform active:scale-95"
                >
                  全部插入左側
                </button>
                <button 
                  onClick={() => setAiBlocks(null)}
                  className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="關閉展示區"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs flex gap-2 items-start border-b border-yellow-200 dark:border-yellow-800/50 shrink-0">
              <span className="mt-0.5">💡</span>
              <p>您可以直接將下方的區塊 <strong>拖曳 (Drag & Drop)</strong> 到左側的筆記中。完成後可點擊右上角關閉。</p>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <ErrorBoundary>
                <NotionEditor key={aiTitle} projectId="ai-staging" initialBlocks={aiBlocks} readOnly={true} />
              </ErrorBoundary>
            </div>
          </div>
        )}
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
    </>
  );
}
