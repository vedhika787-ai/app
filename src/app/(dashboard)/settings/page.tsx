"use client";

import { motion } from "framer-motion";
import { User, KeyRound, Monitor, Shield, Save, Zap, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

interface ApiKeyFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  isSet: boolean;
}

function ApiKeyField({ label, placeholder, value, onChange, isSet }: ApiKeyFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pl-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {label}
        </label>
        {isSet && (
          <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase tracking-widest">
            <CheckCircle2 size={10} /> Active
          </span>
        )}
      </div>
      <input
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all text-sm font-medium font-mono text-white/80 placeholder:text-white/20"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Agent X");
  const [email, setEmail] = useState("commander@ai-builder.com");
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success">("idle");

  useEffect(() => {
    setGeminiKey(sessionStorage.getItem("gemini_api_key") || "");
    setAnthropicKey(sessionStorage.getItem("anthropic_api_key") || "");
    setOpenaiKey(sessionStorage.getItem("openai_api_key") || "");
    setDisplayName(sessionStorage.getItem("display_name") || "Agent X");
    setEmail(sessionStorage.getItem("user_email") || "commander@ai-builder.com");
  }, []);

  const handleSave = () => {
    setStatus("saving");
    if (geminiKey) sessionStorage.setItem("gemini_api_key", geminiKey);
    if (anthropicKey) sessionStorage.setItem("anthropic_api_key", anthropicKey);
    if (openaiKey) sessionStorage.setItem("openai_api_key", openaiKey);
    sessionStorage.setItem("display_name", displayName);
    sessionStorage.setItem("user_email", email);
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2500);
    }, 800);
  };

  const handleAutoGenerate = () => {
    const rand = () => Math.random().toString(36).substring(2, 10).toUpperCase();
    const gKey = `SWARM-GEMINI-${rand()}-AUTO`;
    const aKey = `SWARM-CLAUDE-${rand()}-AUTO`;
    const oKey = `SWARM-OPENAI-${rand()}-AUTO`;
    setGeminiKey(gKey);
    setAnthropicKey(aKey);
    setOpenaiKey(oKey);
    sessionStorage.setItem("gemini_api_key", gKey);
    sessionStorage.setItem("anthropic_api_key", aKey);
    sessionStorage.setItem("openai_api_key", oKey);
    setStatus("success");
    setTimeout(() => setStatus("idle"), 2500);
  };

  const keyIsSet = (k: string) => k.length > 10;

  return (
    <div className="p-8 max-w-4xl mx-auto h-full animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-sans text-glow gradient-text">System Configuration</h1>
          <p className="text-muted-foreground mt-1">Manage your profile, API provider keys, and preferences.</p>
        </div>
        <button
          onClick={handleAutoGenerate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-all uppercase tracking-widest"
        >
          <Zap size={14} /> Auto-Generate Swarm Keys
        </button>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphism p-8 rounded-3xl border border-white/5"
        >
          <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-6">
            <User className="text-primary w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Commander Profile</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all text-sm font-medium text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Primary Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all text-sm font-medium text-white"
              />
            </div>
          </div>
        </motion.section>

        {/* API Keys */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glassmorphism p-8 rounded-3xl border border-white/5"
        >
          <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-6">
            <KeyRound className="text-primary w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold text-white">Neural Provider API Keys</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Keys are stored in your browser session. Click "Auto-Generate" to enable simulation mode.</p>
            </div>
          </div>
          <div className="space-y-5">
            <ApiKeyField
              label="OpenAI API Key"
              placeholder="sk-..."
              value={openaiKey}
              onChange={setOpenaiKey}
              isSet={keyIsSet(openaiKey)}
            />
            <ApiKeyField
              label="Anthropic / Claude API Key"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={setAnthropicKey}
              isSet={keyIsSet(anthropicKey)}
            />
            <ApiKeyField
              label="Google Gemini API Key"
              placeholder="AI-..."
              value={geminiKey}
              onChange={setGeminiKey}
              isSet={keyIsSet(geminiKey)}
            />
          </div>
        </motion.section>

        {/* Dark Mode Info */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glassmorphism p-6 rounded-3xl border border-white/5 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shrink-0">
              <Monitor size={20} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-0.5">Dark Protocol Enforced</h3>
              <p className="text-sm text-muted-foreground">Immersive dark mode is locked in for optimal neural interface performance.</p>
            </div>
          </div>
          <Shield className="w-6 h-6 text-primary opacity-50 shrink-0" />
        </motion.section>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-end pt-2 pb-8"
        >
          <button
            onClick={handleSave}
            disabled={status !== "idle"}
            className="px-8 py-3.5 bg-gradient-to-r from-primary to-accent rounded-xl text-white font-bold tracking-wide flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all active:scale-95 disabled:opacity-60 hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
          >
            {status === "success"
              ? <><CheckCircle2 size={18} /> Config Saved!</>
              : status === "saving"
              ? <><Save size={18} /> Saving...</>
              : <><Save size={18} /> Save Core Config</>
            }
          </button>
        </motion.div>
      </div>
    </div>
  );
}
