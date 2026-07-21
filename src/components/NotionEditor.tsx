import { API_BASE_URL } from "../config";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useEffect, useState, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useAuth } from "../contexts/AuthContext";

export default function NotionEditor({ projectId, initialBlocks, readOnly }: { projectId: string, initialBlocks?: any[], readOnly?: boolean }) {
  const [initialContent, setInitialContent] = useState<PartialBlock[] | "loading">(initialBlocks ? (initialBlocks as PartialBlock[]) : "loading");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { token } = useAuth();

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

  if (initialContent === "loading") {
    return <div className="text-notion-text-muted-light dark:text-notion-text-muted-dark">載入中...</div>;
  }

  return (
    <div className={`notion-editor-wrapper relative group ${readOnly ? '' : '-ml-12'}`}>
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
