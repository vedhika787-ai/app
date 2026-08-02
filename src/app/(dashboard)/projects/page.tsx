"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FolderGit2, Calendar, GitFork, ArrowDownToLine, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  status: "Deployed" | "Draft" | "Generating";
  version: string;
  date: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const savedProjects = sessionStorage.getItem("user_projects");
    if (savedProjects) {
      try { setProjects(JSON.parse(savedProjects)); } catch {}
    }
  }, []);

  const handleNewProject = () => {
    router.push("/dashboard");
  };

  const handleDelete = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    sessionStorage.setItem("user_projects", JSON.stringify(updated));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full animate-in fade-in duration-700">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-sans text-glow gradient-text">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor your AI-generated architectures.</p>
        </div>
        <button
          onClick={handleNewProject}
          className="px-5 py-2.5 bg-primary/20 text-primary border border-primary/50 rounded-xl hover:bg-primary/30 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.2)] font-medium flex items-center gap-2"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphism p-16 rounded-3xl border border-white/5 text-center"
        >
          <FolderGit2 size={48} className="text-muted-foreground mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-bold text-white/80 mb-2">No Projects Yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Head to the Command Center, enter a prompt, and click "Engage" to generate your first AI-powered project.
          </p>
          <button
            onClick={handleNewProject}
            className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.4)]"
          >
            Go to Command Center
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => router.push(`/dashboard?id=${project.id}`)}
              className="glassmorphism p-6 rounded-3xl border border-white/5 hover:border-primary/30 transition-all duration-300 group shadow-[0_4px_30px_rgba(0,0,0,0.1)] relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 left-0 w-1/2 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1e1e2d] border border-white/10 flex items-center justify-center shrink-0">
                  <FolderGit2 className={cn("w-6 h-6", project.status === 'Generating' ? 'text-secondary animate-pulse' : 'text-primary animate-glow')} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white leading-tight">{project.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                      project.status === 'Deployed' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                      project.status === 'Draft' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      "bg-secondary/10 text-secondary border-secondary/20"
                    )}>
                      {project.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{project.version}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                <Calendar size={14} />
                <span>Created: {project.date}</span>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                <button
                  title="Fork"
                  className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors flex-1 flex justify-center"
                >
                  <GitFork size={18} />
                </button>
                <button
                  title="Download"
                  className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors flex-1 flex justify-center"
                >
                  <ArrowDownToLine size={18} />
                </button>
                <button
                  title="Delete"
                  onClick={() => handleDelete(project.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors flex-1 flex justify-center"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
