"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Network, ShieldAlert, Cpu, Settings2, Link2, Search, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const AGENTS = [
  { id: "gemini", name: "Gemini Pro", role: "Planner Agent", status: "Active", docs: "https://ai.google.dev", color: "from-blue-500 to-cyan-400" },
  { id: "claude", name: "Claude 3.5 Sonnet", role: "Developer Agent", status: "Active", docs: "https://anthropic.com", color: "from-amber-500 to-orange-400" },
  { id: "gpt4", name: "GPT-4o", role: "Auto-Debug Agent", status: "Active", docs: "https://openai.com", color: "from-emerald-500 to-teal-400" },
];

export default function AgentsPage() {
  const router = useRouter();

  return (
    <div className="p-8 max-w-7xl mx-auto h-full animate-in fade-in duration-700">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-sans text-glow gradient-text">Neural Agents Swarm</h1>
          <p className="text-muted-foreground mt-1">Manage API integrations and roles for your AI workforce.</p>
        </div>
        
        <div className="relative w-full md:w-64">
           <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
           <input 
             type="text" 
             placeholder="Search agents..." 
             className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary transition-colors"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AGENTS.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glassmorphism p-6 rounded-3xl border border-white/5 hover:border-primary/20 transition-all duration-300 relative overflow-hidden group"
          >
            <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-50 transition-opacity group-hover:opacity-100", agent.color)} />
            
            <div className="flex justify-between items-start mb-4">
               <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                 <Bot size={24} className="text-white/80" />
               </div>
               <span className={cn(
                 "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border",
                 agent.status === 'Active' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
               )}>
                 <CheckCircle2 size={12} />
                 {agent.status}
               </span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{agent.name}</h3>
            <p className="text-sm text-muted-foreground font-medium mb-6">Role: {agent.role}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-xs">
                 <span className="text-white/40 flex items-center gap-2"><Network size={14} /> Connection</span>
                 <span className="text-primary font-medium">API Gateway Active</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                 <span className="text-white/40 flex items-center gap-2"><ShieldAlert size={14} /> Permissions</span>
                 <span className="text-white/80 font-medium">Full R/W Access</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                 <span className="text-white/40 flex items-center gap-2"><Cpu size={14} /> Model Context</span>
                 <span className="text-white/80 font-medium">128k Tokens</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
              <a 
                href={agent.docs} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/5"
              >
                <Link2 size={14} /> Docs
              </a>
              <button 
                onClick={() => router.push("/settings")}
                className="flex-1 py-2 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Settings2 size={14} /> Configure
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
