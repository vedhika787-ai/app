"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Mic, ArrowRight, ShieldCheck, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate Auth & Agent Initialization
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={cn(
        "relative w-[440px] p-8 rounded-3xl z-10",
        "glassmorphism shadow-[0_0_50px_rgba(139,92,246,0.15)]"
      )}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-glow" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-glow" style={{ animationDelay: '1.5s' }} />

      <div className="relative mb-10 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-[#1e1e2d] border border-white/5 shadow-[0_0_15px_rgba(139,92,246,0.3)] mb-4"
        >
          <Cpu className="text-primary w-8 h-8" />
        </motion.div>
        <h1 className="text-3xl font-bold font-sans text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          AI Command Center
        </h1>
        <p className="text-muted-foreground mt-2 text-sm tracking-wide">
          Initialize your multi-agent architecture.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6 relative">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest ml-1">
            Email or Roll Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-xl interactive-input bg-black/40 text-sm placeholder:text-muted-foreground/50 border-white/5 focus:ring-primary/50"
              placeholder="agent@ai-builder.com"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                title="Voice input"
            >
              <Mic size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Passphrase
            </label>
            <a href="#" className="text-xs text-primary/80 hover:text-primary transition-colors">
              Forgot?
            </a>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-xl interactive-input bg-black/40 text-sm placeholder:text-muted-foreground/50 border-white/5 focus:ring-primary/50"
            placeholder="••••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 mt-4 rounded-xl font-semibold bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center gap-2 interactive-button disabled:opacity-80"
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
              <span className="animate-pulse">Initializing AI System...</span>
            </>
          ) : (
            <>
              Establish Connection
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck size={14} className="opacity-50" />
        Secured by Multi-Agent Validation
      </div>
    </motion.div>
  );
}
