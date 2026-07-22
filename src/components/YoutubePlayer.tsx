import { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';

interface YoutubePlayerProps {
  videoId: string;
  seekToTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

export default function YoutubePlayer({ videoId, seekToTime, onTimeUpdate }: YoutubePlayerProps) {
  const playerRef = useRef<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playerRef.current && seekToTime !== undefined) {
      playerRef.current.seekTo(seekToTime, true);
      playerRef.current.playVideo();
    }
  }, [seekToTime]);

  const onReady = (event: any) => {
    playerRef.current = event.target;
  };

  const onStateChange = (event: any) => {
    // Playing state is 1
    if (event.data === 1) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          if (playerRef.current && onTimeUpdate) {
            onTimeUpdate(playerRef.current.getCurrentTime());
          }
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!videoId) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-white dark:bg-[#1E1E1E] shadow-2xl rounded-xl border border-gray-200 dark:border-gray-800 transition-all duration-300 ${isMinimized ? 'w-64 h-14' : 'w-80 h-56'}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-t-xl border-b border-gray-200 dark:border-gray-700 cursor-move">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="red" stroke="red" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon fill="white" stroke="white" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
          YouTube Player
        </span>
        <button onClick={() => setIsMinimized(!isMinimized)} className="text-gray-400 hover:text-gray-600 transition-colors">
          {isMinimized ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          )}
        </button>
      </div>
      
      <div className={`w-full ${isMinimized ? 'hidden' : 'h-[188px]'}`}>
        <YouTube 
          videoId={videoId} 
          opts={{ width: '100%', height: '188', playerVars: { autoplay: 0, modestbranding: 1 } }}
          onReady={onReady}
          onStateChange={onStateChange}
          className="w-full h-full rounded-b-xl overflow-hidden"
        />
      </div>
    </div>
  );
}
