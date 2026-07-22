import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { PlayCircle, ChevronDown, ChevronUp, Quote } from 'lucide-react';

const formatTimestamp = (secs: number) => {
  if (isNaN(secs) || secs === undefined) return '';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function CustomNode({ data }: any) {
  const [expanded, setExpanded] = useState(false);
  
  // Ensure quotes and details are arrays to prevent .map crashes
  const quotes = Array.isArray(data.quotes) ? data.quotes : (typeof data.quotes === 'string' ? [data.quotes] : []);
  const details = Array.isArray(data.details) ? data.details : (typeof data.details === 'string' ? [data.details] : []);

  const handleTextUpdate = (field: string, newValue: any) => {
    if (data.onUpdate) {
      data.onUpdate({ [field]: newValue });
    }
  };

  return (
    <div className="bg-white dark:bg-[#2F2F2F] border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-5 w-80 transition-all hover:border-blue-400 dark:hover:border-blue-500">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500 border-2 border-white" />
      
      {/* Time/Sequence/Video Timestamp badge */}
      {(data.time || data.timestamp !== undefined) && (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (data.onPlay && data.timestamp !== undefined) {
              data.onPlay(data.timestamp);
            }
          }}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 mb-2 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
          title={data.timestamp !== undefined ? "點擊跳轉影片播放時間" : undefined}
        >
          ⏱️ {data.time || (data.timestamp !== undefined ? formatTimestamp(data.timestamp) : '')}
          {data.timestamp !== undefined && <PlayCircle size={10} className="text-blue-500" />}
        </span>
      )}

      <div className="flex items-start justify-between mb-2">
        <h3 
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => handleTextUpdate('title', e.currentTarget.innerText)}
          className="font-bold text-sm text-gray-800 dark:text-gray-100 flex-1 pr-2 outline-none focus:bg-gray-50 dark:focus:bg-gray-800 rounded px-1"
          title="雙擊或點擊直接編輯標題"
        >
          {data.title || "無標題"}
        </h3>
      </div>
      
      <div 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => handleTextUpdate('content', e.currentTarget.innerText)}
        className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3 outline-none focus:bg-gray-50 dark:focus:bg-gray-800 rounded px-1"
        title="雙擊或點擊直接編輯主摘要"
      >
        {data.content || "暫無摘要內容..."}
      </div>

      {/* Timeline Impact Block */}
      {data.impact && (
        <div 
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => handleTextUpdate('impact', e.currentTarget.innerText)}
          className="text-xs p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-orange-800 dark:text-orange-300 mb-3 font-medium outline-none focus:bg-orange-100/50 dark:focus:bg-orange-900/30"
          title="雙擊或點擊直接編輯影響說明"
        >
          ⚡ 影響：{data.impact}
        </div>
      )}

      {(quotes.length > 0 || details.length > 0) && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="w-full flex items-center justify-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 py-1"
          >
            {expanded ? (
              <><ChevronUp size={14} /> 收起詳細內容</>
            ) : (
              <><ChevronDown size={14} /> 展開詳細內容</>
            )}
          </button>
          
          {expanded && (
            <div className="mt-3 space-y-3 pb-2 nodrag">
              {quotes.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                  {quotes.map((q: string, i: number) => (
                    <div key={i} className="flex gap-2 text-yellow-800 dark:text-yellow-200 text-xs italic mb-2 last:mb-0">
                      <Quote size={12} className="shrink-0 mt-0.5 opacity-50" />
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const nextQ = [...quotes];
                          nextQ[i] = e.currentTarget.innerText;
                          handleTextUpdate('quotes', nextQ);
                        }}
                        className="outline-none focus:bg-white dark:focus:bg-gray-800 rounded px-1 flex-1"
                      >
                        {q}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {details.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {details.map((d: string, i: number) => (
                    <li key={i}>
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const nextD = [...details];
                          nextD[i] = e.currentTarget.innerText;
                          handleTextUpdate('details', nextD);
                        }}
                        className="outline-none focus:bg-gray-50 dark:focus:bg-gray-800 rounded px-1"
                      >
                        {d}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500 border-2 border-white" />
    </div>
  );
}
