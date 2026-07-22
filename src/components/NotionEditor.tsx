import { API_BASE_URL } from "../config";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useEffect, useState, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/mantine/style.css";
import { useAuth } from "../contexts/AuthContext";
import { io, Socket } from "socket.io-client";

interface CursorData {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}
export default function NotionEditor({ projectId, initialBlocks, readOnly }: { projectId: string, initialBlocks?: any[], readOnly?: boolean }) {
  const [initialContent, setInitialContent] = useState<PartialBlock[] | "loading">(initialBlocks ? (initialBlocks as PartialBlock[]) : "loading");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const editorRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<string>(`hsl(${Math.random() * 360}, 70%, 50%)`);

  useEffect(() => {
    if (initialBlocks) {
      setInitialContent(initialBlocks as PartialBlock[]);
      return;
    }
    if (!projectId || !token) return;
    
    fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          try {
            setInitialContent(JSON.parse(data.content));
          } catch (e) {
            setInitialContent([{ type: "paragraph", content: "" }]);
          }
        } else {
          setInitialContent([{ type: "paragraph", content: "" }]);
        }
      })
      .catch(err => {
        console.error("Failed to load content from DB:", err);
        setInitialContent([{ type: "paragraph", content: "" }]);
      });
  }, [projectId, initialBlocks, token]);

  const editor = useCreateBlockNote({
    initialContent: initialContent === "loading" ? undefined : initialContent,
  });

  const [activeBlock, setActiveBlock] = useState<any>(null);

  useEffect(() => {
    if (readOnly) return; // Do not listen to insert events in read-only/staging mode
    const handleInsertBlocks = (event: Event) => {
      const customEvent = event as CustomEvent;
      const blocks = customEvent.detail;
      if (editor && blocks) {
        editor.insertBlocks(blocks, editor.document[editor.document.length - 1], "after");
      }
    };

    window.addEventListener('insertBlocks', handleInsertBlocks);
    return () => window.removeEventListener('insertBlocks', handleInsertBlocks);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!projectId || readOnly || !user) return;
    
    // Connect to Socket.io
    const socket = io(API_BASE_URL);
    socketRef.current = socket;
    
    socket.emit('join-project', projectId);
    
    socket.on('remote-cursor-move', (data: CursorData) => {
      setCursors(prev => ({ ...prev, [data.userId]: data }));
    });
    
    socket.on('remote-cursor-leave', (data: { userId: string }) => {
      setCursors(prev => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    });
    
    socket.on('remote-block-update', (blocks: PartialBlock[]) => {
      if (editor) {
        editor.replaceBlocks(editor.document, blocks);
      }
    });
    
    return () => {
      socket.emit('cursor-leave', { projectId, userId: user.id });
      socket.disconnect();
    };
  }, [projectId, readOnly, user, editor]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readOnly || !socketRef.current || !user || !editorRef.current) return;
    const rect = editorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    socketRef.current.emit('cursor-move', {
      projectId,
      userId: user.id,
      userName: user.name,
      x,
      y,
      color: colorRef.current
    });
  };

  const handleMouseLeave = () => {
    if (readOnly || !socketRef.current || !user) return;
    socketRef.current.emit('cursor-leave', { projectId, userId: user.id });
  };

  if (initialContent === "loading") {
    return <div className="text-notion-text-muted-light dark:text-notion-text-muted-dark">載入中...</div>;
  }

  return (
    <div 
      className={`notion-editor-wrapper relative group ${readOnly ? '' : '-ml-12'}`}
      ref={editorRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Remote Cursors */}
      {Object.values(cursors).map(c => (
        <div 
          key={c.userId} 
          className="absolute pointer-events-none z-50 flex flex-col items-start transition-all duration-100 ease-linear"
          style={{ left: c.x, top: c.y }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={c.color} stroke="white" strokeWidth="2" className="-ml-1 -mt-1 drop-shadow-md">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
          </svg>
          <span 
            className="text-[10px] text-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap mt-1"
            style={{ backgroundColor: c.color }}
          >
            {c.userName}
          </span>
        </div>
      ))}
      
      <BlockNoteView 
        editor={editor} 
        theme="light"
        editable={!readOnly}
        onSelectionChange={() => {
          if (readOnly) return;
          try {
            const block = editor.getTextCursorPosition().block;
            setActiveBlock(block);
          } catch (e) {
            // ignore
          }
        }}
        onChange={() => {
          if (readOnly) return;
          
          // Emit to other clients immediately
          if (socketRef.current) {
            socketRef.current.emit('block-update', {
              projectId,
              blocks: editor.document
            });
          }

          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            if (!token) return;
            fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ content: JSON.stringify(editor.document) })
            }).catch(e => console.error("Auto-save failed", e));
          }, 1000);
        }}
      />
      {activeBlock && !readOnly && (
        <button
          className="fixed bottom-12 right-12 bg-blue-500 text-white p-3 rounded-full shadow-2xl hover:bg-blue-600 transition-transform hover:scale-105 flex items-center gap-2 z-40"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('openComments', { detail: { blockId: activeBlock.id, text: activeBlock.content } }));
          }}
          title="針對目前段落留言"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          針對此段落留言
        </button>
      )}
    </div>
  );
}
