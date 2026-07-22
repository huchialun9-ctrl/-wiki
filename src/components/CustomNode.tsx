import { Handle, Position } from 'reactflow';
import { PlayCircle } from 'lucide-react';

export default function CustomNode({ data }: any) {
  return (
    <div className="bg-white dark:bg-[#2F2F2F] border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl p-4 w-72 transition-all hover:shadow-md hover:border-blue-400">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-400" />
      
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
      
      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-4 leading-relaxed">
        {data.content || "暫無摘要內容..."}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-400" />
    </div>
  );
}
