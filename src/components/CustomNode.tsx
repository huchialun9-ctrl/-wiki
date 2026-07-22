import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { PlayCircle, ChevronDown, ChevronUp, Quote } from 'lucide-react';

export default function CustomNode({ data }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-[#2F2F2F] border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-5 w-80 transition-all hover:border-blue-400 dark:hover:border-blue-500">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500 border-2 border-white" />
      
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 flex-1 pr-2">{data.title || "無標題"}</h3>
        {data.timestamp !== undefined && (
          <button 
            className="text-blue-500 hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (data.onPlay) data.onPlay(data.timestamp);
            }}
            title="跳轉至此時間段"
          >
            <PlayCircle size={20} />
          </button>
        )}
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
        {data.content || "暫無摘要內容..."}
      </div>

      {(data.quotes?.length > 0 || data.details?.length > 0) && (
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
              {data.quotes && data.quotes.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                  {data.quotes.map((q: string, i: number) => (
                    <div key={i} className="flex gap-2 text-yellow-800 dark:text-yellow-200 text-xs italic mb-2 last:mb-0">
                      <Quote size={12} className="shrink-0 mt-0.5 opacity-50" />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {data.details && data.details.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {data.details.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
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
