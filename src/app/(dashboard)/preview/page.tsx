"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Download, 
  Code, 
  Sparkles,
  RefreshCw,
  FolderGit2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FullPreviewPage() {
  const router = useRouter();
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  useEffect(() => {
    const html = sessionStorage.getItem("lastGeneratedWebsite");
    const files = sessionStorage.getItem("lastGeneratedFiles");
    if (html) {
      setHtmlContent(html);
    }
    if (files) {
      try {
        setGeneratedFiles(JSON.parse(files));
      } catch (e) {}
    }
  }, []);

  const downloadZip = () => {
    if (generatedFiles.length === 0) return;
    const allCode = generatedFiles.map(f => `// ==========================================\n// FILE: ${f.path}\n// ==========================================\n\n${f.content}`).join("\n\n");
    const blob = new Blob([allCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-website-source.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#030308] text-white overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-white/10 bg-[#0a0a0f] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors text-xs font-bold border border-white/5"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary animate-pulse" />
            <span className="font-bold text-sm text-glow gradient-text">Neural Website Live Preview</span>
          </div>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setViewport("desktop")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
              viewport === "desktop" ? "bg-primary/20 text-primary border border-primary/30" : "text-white/40 hover:text-white"
            )}
          >
            <Monitor size={14} /> Desktop
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
              viewport === "tablet" ? "bg-primary/20 text-primary border border-primary/30" : "text-white/40 hover:text-white"
            )}
          >
            <Tablet size={14} /> Tablet
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
              viewport === "mobile" ? "bg-primary/20 text-primary border border-primary/30" : "text-white/40 hover:text-white"
            )}
          >
            <Smartphone size={14} /> Mobile
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {generatedFiles.length > 0 && (
            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-colors"
            >
              <Code size={14} /> View Code ({generatedFiles.length} files)
            </button>
          )}
          <button
            onClick={downloadZip}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            <Download size={14} /> Download Code
          </button>
        </div>
      </header>

      {/* Main Preview Container */}
      <main className="flex-1 bg-[#06060c] flex items-center justify-center p-4 relative overflow-hidden">
        {htmlContent ? (
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 bg-white relative",
              viewport === "desktop" && "w-full",
              viewport === "tablet" && "w-[768px]",
              viewport === "mobile" && "w-[375px]"
            )}
          >
            <iframe
              srcDoc={htmlContent}
              className="w-full h-full border-none"
              title="Full Website Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : (
          <div className="text-center opacity-40">
            <RefreshCw size={36} className="mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm font-mono">No website preview generated yet.</p>
            <p className="text-xs text-white/50 mt-1">Go to Command Center, enter a prompt, and click Engage.</p>
          </div>
        )}
      </main>

      {/* Source Code Inspector Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
          <div className="w-full max-w-5xl h-[80vh] bg-[#0a0a0f] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-white/[0.02]">
              <h3 className="font-bold text-sm text-glow">Generated Source Code Files</h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-white/40 hover:text-white text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 border-r border-white/10 overflow-y-auto bg-black/40 p-2 space-y-1">
                {generatedFiles.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 transition-colors",
                      selectedFileIndex === idx ? "bg-primary/20 text-primary border border-primary/30" : "text-white/60 hover:bg-white/5"
                    )}
                  >
                    <FolderGit2 size={14} className="shrink-0" />
                    <span className="truncate">{file.path}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-auto p-6 bg-[#050508] font-mono text-xs text-white/80">
                <pre><code>{`// FILE: ${generatedFiles[selectedFileIndex]?.path}\n\n${generatedFiles[selectedFileIndex]?.content}`}</code></pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
