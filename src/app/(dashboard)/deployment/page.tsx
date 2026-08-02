"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudRain, Server, FolderGit2, CheckCircle2, Download, ChevronDown, Github, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function DeploymentPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("user_projects");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjects(parsed);
        if (parsed.length > 0) setSelectedProjectId(parsed[0].id);
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
  }, []);

  const handleDownloadZip = async () => {
    if (!selectedProjectId) return;
    setIsDownloading(true);

    try {
      const projectDataStr = sessionStorage.getItem(`project_data_${selectedProjectId}`);
      if (!projectDataStr) throw new Error("Project data not found");
      
      const projectData = JSON.parse(projectDataStr);
      const files = projectData.generatedFiles || [];
      const zip = new JSZip();

      if (files.length === 0 && projectData.websiteHtml) {
        // Fallback: If only HTML exists
        zip.file("index.html", projectData.websiteHtml);
      } else {
        files.forEach((f: any) => {
          zip.file(f.path, f.content);
        });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const proj = projects.find(p => p.id === selectedProjectId);
      saveAs(content, `${proj?.name || "project"}.zip`);
    } catch (e) {
      alert("Error generating ZIP: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setIsDownloading(false);
      setShowDropdown(false);
    }
  };

  const navTo = (url: string) => window.open(url, "_blank");

  return (
    <div className="p-8 max-w-7xl mx-auto h-full animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-sans text-glow gradient-text">Deployment</h1>
        <p className="text-muted-foreground mt-1">One-click scale and launch your multi-agent applications.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Providers */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glassmorphism p-8 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="flex items-center gap-4 mb-2">
            <Server className="text-primary w-8 h-8" />
            <h2 className="text-2xl font-semibold">Select Provider</h2>
          </div>
          
          <button 
            onClick={() => navTo("http://vercel.com/new")}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                <span className="text-black font-bold text-xl">V</span>
              </div>
              <div className="text-left">
                <h3 className="font-medium text-white group-hover:text-glow">Vercel</h3>
                <p className="text-xs text-muted-foreground">Serverless Next.js edge deployment</p>
              </div>
            </div>
            <CheckCircle2 size={20} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <button 
            onClick={() => navTo("https://app.netlify.com/signup/start/connect/repos")}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#00C7B7]/20 border border-[#00C7B7] flex items-center justify-center shrink-0">
                <span className="text-[#00C7B7] font-bold text-lg">N</span>
              </div>
              <div className="text-left">
                <h3 className="font-medium group-hover:text-glow text-[#00C7B7]">Netlify</h3>
                <p className="text-xs text-muted-foreground">Global CDN & Serverless functions</p>
              </div>
            </div>
            <CheckCircle2 size={20} className="text-[#00C7B7] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <button 
             onClick={() => navTo("https://github.com/")}
             className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Github size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-white group-hover:text-glow">GitHub</h3>
                <p className="text-xs text-muted-foreground">Version control & CI/CD workflow</p>
              </div>
            </div>
            <CheckCircle2 size={20} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold flex items-center justify-center gap-2 interactive-button shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <CloudRain size={20} />
            Deploy Active Project
          </button>
        </motion.div>
        
        {/* Output */}
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="flex flex-col gap-6"
        >
          {/* Export Options */}
          <div className="glassmorphism p-8 rounded-3xl border border-white/5 h-1/2 flex flex-col justify-center gap-4 relative">
             <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
               <FolderGit2 className="text-primary" size={20} /> Export Project
             </h2>
             
             {/* Dropdown Choice */}
             <div className="relative">
                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1 block">Choose Project</label>
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-sm hover:bg-white/10 transition-all"
                >
                  <span className="truncate">{projects.find(p => p.id === selectedProjectId)?.name || "Select a project..."}</span>
                  <ChevronDown className={cn("transition-transform duration-300", showDropdown ? "rotate-180" : "")} size={16} />
                </button>

                <AnimatePresence>
                  {showDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0 }}
                      className="absolute z-50 mt-2 w-full bg-[#11111a] border border-white/10 rounded-2xl shadow-2xl max-h-[180px] overflow-y-auto custom-scrollbar"
                    >
                      {projects.length > 0 ? projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProjectId(p.id); setShowDropdown(false); }}
                          className="w-full px-5 py-3 text-left text-xs text-white/70 hover:bg-primary/20 hover:text-white transition-colors border-b border-white/5 last:border-0"
                        >
                          {p.name} <span className="text-[10px] opacity-40 float-right">{p.date}</span>
                        </button>
                      )) : (
                        <div className="p-4 text-xs text-white/30 text-center">No projects found</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>

             <button 
               onClick={handleDownloadZip}
               disabled={!selectedProjectId || isDownloading}
               className="w-full py-4 rounded-2xl bg-white/5 border border-primary/20 hover:bg-primary/10 transition-all flex items-center justify-center gap-3 text-sm font-bold disabled:opacity-50"
             >
               {isDownloading ? (
                 <Cpu className="animate-spin text-primary" size={18} />
               ) : (
                 <Download className="text-primary" size={18} />
               )}
               {isDownloading ? "Bundling..." : "Download ZIP"}
             </button>
          </div>
          
          {/* Logs */}
          <div className="glassmorphism p-6 rounded-3xl border border-white/5 h-1/2 bg-[#0a0a0f] flex flex-col overflow-hidden relative">
            <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-4">Deployment Logs</h2>
            <div className="flex-1 font-mono text-xs overflow-y-auto text-muted-foreground opacity-50 flex items-center justify-center">
              No active deployments found.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
