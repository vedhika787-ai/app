"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Brain,
  Palette,
  PenLine,
  Code,
  MonitorPlay,
  Eye,
  Bot,
  User,
  Layout,
  Zap,
  FolderGit2,
  Mic,
  MicOff,
  Keyboard,
  ChevronDown,
  AudioLines,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────

interface GeneratedFile {
  path: string;
  language: string;
  content: string;
}

interface ValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
  summary: string;
}

interface LogEntry {
  id: number;
  agent: string;
  text: string;
  status: "pending" | "active" | "success" | "error";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ── Constants ─────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  System: "text-white/40",
  "Prompt Analyzer": "text-cyan-400",
  "Design Architect": "text-pink-400",
  "Content Writer": "text-amber-400",
  "Code Generator": "text-green-400",
  "Website Builder": "text-purple-400",
  "Code Reviewer": "text-yellow-400",
};

const AGENT_ICONS: Record<string, typeof Brain> = {
  "Prompt Analyzer": Brain,
  "Design Architect": Palette,
  "Content Writer": PenLine,
  "Code Generator": Code,
  "Website Builder": MonitorPlay,
  "Code Reviewer": Eye,
};

// ── Component ─────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Hello! I am your AI Builder Manager. Describe the website you want to build, and I will orchestrate a team of specialized agents to design, write, code, and review it for you.",
    },
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [websiteHtml, setWebsiteHtml] = useState<string>("");
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  
  // New States for Results
  const [activeTab, setActiveTab] = useState<"plan" | "code" | "ui" | "logs">("logs");
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [designData, setDesignData] = useState<any>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [buildMode, setBuildMode] = useState<"plan" | "code" | "ui" | "full">("full");

  // Voice States
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setPrompt(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
          addLog("System", `Voice error: ${event.error}`, "error");
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      addLog("System", "Voice capture stopped.", "success");
    } else {
      setPrompt("");
      recognitionRef.current.start();
      setIsRecording(true);
      addLog("System", "Listening to your idea...", "active");
    }
  };

  // Auto-scroll chats
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (
    agent: string,
    text: string,
    status: LogEntry["status"] = "active"
  ) => {
    setLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), agent, text, status },
    ]);
  };

  // Logic to load project if ID present in session or URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("id");
    if (projectId) {
      const saved = sessionStorage.getItem(`project_data_${projectId}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.messages) setMessages(data.messages);
          if (data.websiteHtml) setWebsiteHtml(data.websiteHtml || "");
          if (data.analysisData) setAnalysisData(data.analysisData);
          if (data.designData) setDesignData(data.designData);
          if (data.generatedFiles) setGeneratedFiles(data.generatedFiles || []);
          
          // Also sync to general "last" keys so Full Preview works correctly
          sessionStorage.setItem("lastGeneratedWebsite", data.websiteHtml || "");
          sessionStorage.setItem("lastGeneratedFiles", JSON.stringify(data.generatedFiles || []));
          sessionStorage.setItem("lastGeneratedPlan", JSON.stringify(data.analysisData || null));
          
          setActiveTab(data.websiteHtml ? "ui" : "plan");
          addLog("System", `Loaded project: ${data.analysisData?.projectName || "Unknown"}`, "success");
        } catch (e) {
          console.error("Failed to load project", e);
        }
      }
    }
  }, []);

  const saveProject = (id: string, name: string, data: { messages: any, websiteHtml: string, analysisData: any, generatedFiles: any }) => {
    const saved = sessionStorage.getItem("user_projects");
    let projects = [];
    if (saved) {
      try { projects = JSON.parse(saved); } catch {}
    }
    
    // Check if already exists
    const existingIndex = projects.findIndex((p: any) => p.id === id);
    const projectSummary = {
      id,
      name,
      status: "Draft",
      version: "v1.0",
      date: new Date().toLocaleDateString(),
    };

    if (existingIndex > -1) {
      projects[existingIndex] = projectSummary;
    } else {
      projects.unshift(projectSummary);
    }

    sessionStorage.setItem("user_projects", JSON.stringify(projects));
    sessionStorage.setItem(`project_data_${id}`, JSON.stringify(data));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    const currentPrompt = prompt;
    if (!initialPrompt) setInitialPrompt(currentPrompt);
    setPrompt("");

    const newMessages = [
      ...messages,
      { id: Date.now().toString(), role: "user" as const, content: currentPrompt },
    ];
    setMessages(newMessages);

    setIsGenerating(true);
    setLogs([]);
    setWebsiteHtml("");
    setValidation(null);
    setActiveAgent(null);
    setAnalysisData(null);
    setDesignData(null);
    setGeneratedFiles([]);
    setSelectedFileIndex(0);
    setActiveTab("logs");

    const geminiKey =
      typeof window !== "undefined"
        ? sessionStorage.getItem("gemini_api_key") || ""
        : "";

    addLog("System", "Initializing multi-agent pipeline...");

    try {
      const res = await fetch("/api/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages, 
          geminiApiKey: geminiKey,
          mode: buildMode 
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collectedFiles: GeneratedFile[] = [];
      let latestAnalysisData: any = null;
      let latestWebsiteHtml: string = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(part.slice(6));

            switch (event.type) {
              case "agent_start":
                setActiveAgent(event.agent);
                addLog(event.agent, event.message, "active");
                break;

              case "agent_chat":
                addLog(event.agent, event.message, "active");
                break;

              case "agent_done":
                addLog(event.agent, event.message, "success");
                if (event.agent === "Prompt Analyzer") {
                  setAnalysisData(event.data);
                  latestAnalysisData = event.data;
                  // Initial save as soon as we have a name/plan
                  const pid = Date.now().toString();
                  saveProject(pid, event.data.projectName, {
                    messages: newMessages,
                    websiteHtml: "",
                    analysisData: event.data,
                    generatedFiles: []
                  });
                }
                if (event.agent === "Design Architect") setDesignData(event.data);
                break;

              case "file":
                const file = event.data as GeneratedFile;
                collectedFiles.push(file);
                setGeneratedFiles(prev => [...prev, file]);
                break;

              case "website":
                const html = event.data as string;
                setWebsiteHtml(html);
                latestWebsiteHtml = html;
                addLog("Website Builder", "Live preview HTML ready.", "success");
                break;

              case "validation":
                setValidation(event.data as ValidationResult);
                break;

              case "error":
                addLog("System", `Error: ${event.message}`, "error");
                break;

              case "complete":
                addLog(
                  "System",
                  `Pipeline complete. ${event.fileCount || collectedFiles.length} files generated.`,
                  "success"
                );
                setActiveAgent(null);
                
                if (buildMode === "plan") setActiveTab("plan");
                else if (buildMode === "ui" || buildMode === "full") setActiveTab("ui");
                else setActiveTab("code");

                // Save final state
                const pid = event.projectId || Date.now().toString();
                let projName = latestAnalysisData?.projectName;
                
                // If AI was generic, try to snatch from first prompt
                if (!projName || projName.toLowerCase().includes("project") || projName.toLowerCase().includes("new")) {
                  const firstMsg = newMessages?.[1]?.content || ""; // Index 0 is assistant, 1 is first user prompt
                  const nameMatch = firstMsg.match(/["']([^"']+)["']/) || 
                                   firstMsg.match(/called\s+([A-Z][0-9a-z]+(?:\s+[A-Z][0-9a-z]+)*)/i) ||
                                   firstMsg.match(/named\s+([A-Z][0-9a-z]+(?:\s+[A-Z][0-9a-z]+)*)/i);
                  projName = nameMatch ? nameMatch[1] : (firstMsg.split(' ').filter(w => w.length > 3)[0] || "Neural") + " Project";
                }

                saveProject(pid, projName, {
                  messages: [
                    ...newMessages,
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: `Success! The agents have finished building your website. You can view it in the preview panel. Request changes if you'd like the agents to iterate on it.`,
                    }
                  ],
                  websiteHtml: latestWebsiteHtml,
                  analysisData: latestAnalysisData,
                  generatedFiles: collectedFiles.length > 0 ? collectedFiles : []
                });
                
                // Add final assistant message
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: `Success! The agents have finished building your website. You can view it in the preview panel. Request changes if you'd like the agents to iterate on it.`,
                  },
                ]);
                break;
            }
          } catch {
            /* ignore unparseable chunk */
          }
        }
      }

      if (collectedFiles.length > 0) {
        sessionStorage.setItem(
          "lastGeneratedFiles",
          JSON.stringify(collectedFiles)
        );
        const allCode = collectedFiles
          .map((f) => `// FILE: ${f.path}\n${f.content}`)
          .join("\n\n// ====================================================\n\n");
        sessionStorage.setItem("lastGeneratedCode", allCode);
      }
    } catch (err) {
      addLog(
        "System",
        `Fatal error: ${err instanceof Error ? err.message : "Pipeline crashed"}`,
        "error"
      );
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Sorry, an error occurred during generation: ${err instanceof Error ? err.message : "Unknown error"}.`,
        },
      ]);
    } finally {
      setIsGenerating(false);
      setActiveAgent(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#030308] overflow-hidden p-4 gap-4 animate-in fade-in duration-500">
      
      {/* ── LEFT PANEL: CHAT ── */}
      <div className="w-[380px] shrink-0 flex flex-col bg-[#0a0a0f] border border-white/5 rounded-3xl relative shadow-[0_0_30px_rgba(139,92,246,0.05)] overflow-hidden">
        
        {/* Chat Header */}
        <div className="h-16 shrink-0 border-b border-white/5 flex items-center px-6 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center p-0.5">
              <div className="w-full h-full bg-[#0a0a0f] rounded-full flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/90">Builder Manager</h2>
              <p className="text-[10px] text-green-400 font-medium tracking-wider uppercase">Online</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-sm shadow-[0_4px_15px_rgba(139,92,246,0.3)]"
                    : "bg-white/5 text-white/80 border border-white/5 rounded-bl-sm shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white/[0.01] border-t border-white/5 space-y-4">
          
          {/* Build Mode Selector */}
          <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            {[
              { id: 'plan', label: 'Plan Only' },
              { id: 'ui', label: 'UI Draft' },
              { id: 'code', label: 'Code Only' },
              { id: 'full', label: 'Agent Build' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setBuildMode(m.id as any)}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  buildMode === m.id 
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] scale-[1.02]" 
                    : "text-white/20 hover:text-white/40 hover:bg-white/5"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="relative flex flex-col bg-[#05050a] border border-white/10 rounded-2xl focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-inner overflow-hidden">
            {/* Input Header/Toggle */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {inputMode === "voice" ? "Voice Dictation" : "Text Input"}
              </span>
              <button 
                onClick={() => {
                  if (isRecording) toggleRecording();
                  setInputMode(inputMode === "text" ? "voice" : "text");
                }}
                className="flex items-center gap-2 p-1 px-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
              >
                {inputMode === "text" ? (
                   <Mic size={12} className="text-primary" />
                ) : (
                   <Keyboard size={12} className="text-accent" />
                )}
                <span className="text-[10px] font-bold text-white/60">
                   Switch to {inputMode === "text" ? "Voice" : "Text"}
                </span>
              </button>
            </div>

            <div className="flex items-center">
              {inputMode === "text" ? (
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your idea..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none p-4 max-h-32 min-h-[52px]"
                  disabled={isGenerating}
                  rows={1}
                />
              ) : (
                <div className="flex-1 p-4 flex items-center gap-4">
                  <button 
                    onClick={toggleRecording}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
                      isRecording 
                        ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse" 
                        : "bg-white/10 border border-white/10 hover:bg-white/20"
                    )}
                  >
                    {isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-primary" />}
                  </button>
                  <div className="flex-1 overflow-hidden">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      prompt ? "text-white" : "text-white/30 italic"
                    )}>
                      {prompt || (isRecording ? "Listening..." : "Click mic to speak...")}
                    </p>
                    {isRecording && (
                      <div className="flex gap-1 items-center mt-1">
                        <div className="w-1 h-3 bg-primary rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                        <div className="w-1 h-5 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-4 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  if (isRecording) toggleRecording();
                  handleGenerate();
                }}
                disabled={!prompt.trim() || isGenerating}
                className="mx-4 p-2.5 bg-gradient-to-r from-primary to-accent rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: LIVE PREVIEW & OVERLAYS ── */}
      <div className="flex-1 relative bg-[#06060c] border border-white/5 rounded-3xl overflow-hidden shadow-inner flex flex-col">
        
        {/* Top bar of Right Panel - TABS */}
        <div className="h-14 border-b border-white/5 bg-white/[0.03] flex items-center justify-between px-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "logs", label: "Agent Logs", icon: Zap },
              { id: "plan", label: "Architect Plan", icon: Brain },
              { id: "code", label: "Source Code", icon: Code },
              { id: "ui", label: "Live UI", icon: monitorPlayIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
                    : "text-white/40 hover:text-white/60 hover:bg-white/5"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
          
          {websiteHtml && !isGenerating && (
            <button 
              onClick={() => {
                sessionStorage.setItem("lastGeneratedWebsite", websiteHtml);
                sessionStorage.setItem("lastGeneratedFiles", JSON.stringify(generatedFiles));
                sessionStorage.setItem("lastGeneratedPlan", JSON.stringify(analysisData));
                router.push('/preview');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20"
            >
              <Eye size={14} /> Full Preview
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          
          {/* TAB: LOGS */}
          {activeTab === "logs" && (
            <div className="absolute inset-0 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-[#0a0a0f] gap-4">
              {logs.length === 0 && !isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <Bot size={48} className="mb-4" />
                  <p className="text-sm font-mono">Waiting for neural engagement...</p>
                </div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4 font-mono text-[11px] items-start animate-in slide-in-from-left-2">
                  <span className={cn("w-32 shrink-0 font-black text-right", AGENT_COLORS[log.agent])}>[{log.agent}]</span>
                  <span className="text-white/60 flex-1 leading-relaxed">{log.text}</span>
                  {log.status === "active" && <Cpu size={12} className="text-primary animate-spin mt-1" />}
                  {log.status === "success" && <CheckCircle2 size={12} className="text-green-500 mt-1" />}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}

          {/* TAB: PLAN */}
          {activeTab === "plan" && (
            <div className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar bg-[#0a0a0f]">
              {analysisData ? (
                <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
                  <div>
                    <h2 className="text-3xl font-black mb-2 text-glow gradient-text">{analysisData.projectName}</h2>
                    <p className="text-white/40 font-mono text-sm tracking-widest">{analysisData.industry} / {analysisData.mood}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5 shadow-xl">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                        <Layout size={14} /> Architecture
                      </h4>
                      <p className="text-white/70 text-sm leading-relaxed mb-4">{analysisData.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {analysisData.pages.map((p: string) => (
                          <span key={p} className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-white/60">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5 shadow-xl">
                      <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-4 flex items-center gap-2">
                        <Cpu size={14} /> Components
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {analysisData.components.map((c: string) => (
                          <div key={c} className="p-2 bg-white/5 rounded-xl border border-white/5 text-[10px] text-white/80 font-mono">{c}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-30">
                  <Brain size={48} className="mb-4" />
                  <p className="text-sm font-mono tracking-widest uppercase">No Architecture Plan Data Yet</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: CODE */}
          {activeTab === "code" && (
            <div className="absolute inset-0 flex flex-col bg-[#050508]">
              {generatedFiles.length > 0 ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Code Toolbar */}
                  <div className="h-10 border-b border-white/5 bg-white/[0.02] flex items-center justify-between px-4 text-xs font-mono">
                    <span className="text-white/60 font-bold">{generatedFiles[selectedFileIndex]?.path || "source code"}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const content = generatedFiles[selectedFileIndex]?.content || "";
                          navigator.clipboard.writeText(content);
                          alert("Code copied to clipboard!");
                        }}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-white/80 transition-colors text-[10px] font-bold"
                      >
                        Copy File
                      </button>
                      <button
                        onClick={() => {
                          const allCode = generatedFiles.map(f => `// FILE: ${f.path}\n${f.content}`).join("\n\n// ==========================================\n\n");
                          const blob = new Blob([allCode], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "source-code.txt";
                          a.click();
                        }}
                        className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg transition-colors text-[10px] font-bold"
                      >
                        Export All (.txt)
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 flex overflow-hidden">
                    <div className="w-56 shrink-0 border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/40">
                      {generatedFiles.map((f, i) => (
                        <button 
                          key={i} 
                          onClick={() => setSelectedFileIndex(i)}
                          className={cn(
                            "w-full text-left px-4 py-3 text-[10px] font-mono border-b border-white/5 transition-colors flex items-center gap-2",
                            selectedFileIndex === i ? "bg-primary/10 text-primary font-bold" : "text-white/40 hover:bg-white/5"
                          )}
                        >
                          <FolderGit2 size={12} className={selectedFileIndex === i ? "text-primary" : "text-primary/40"} /> {f.path}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 overflow-auto p-6 font-mono text-[11px] text-white/70 leading-relaxed bg-[#0a0a0f]">
                      <pre><code>{`// FILE: ${generatedFiles[selectedFileIndex]?.path || 'source code'}\n\n${generatedFiles[selectedFileIndex]?.content || "Initializing tree..."}`}</code></pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-8">
                  <Code size={48} className="mb-4 text-primary animate-pulse" />
                  <p className="text-sm font-mono mb-2">Awaiting neural compilation...</p>
                  <p className="text-xs text-white/50 max-w-sm">Enter a prompt on the left and click 'Engage' to generate full-stack source code.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: UI */}
          {activeTab === "ui" && (
            <div className="absolute inset-0 flex flex-col bg-[#050508]">
               {websiteHtml ? (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  {/* UI Preview Top Control Bar */}
                  <div className="h-10 border-b border-white/5 bg-white/[0.02] flex items-center justify-between px-4 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-green-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                      Live Sandbox Active
                    </span>
                    <button
                      onClick={() => {
                        sessionStorage.setItem("lastGeneratedWebsite", websiteHtml);
                        sessionStorage.setItem("lastGeneratedFiles", JSON.stringify(generatedFiles));
                        sessionStorage.setItem("lastGeneratedPlan", JSON.stringify(analysisData));
                        router.push('/preview');
                      }}
                      className="px-3 py-1 bg-gradient-to-r from-primary to-accent text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-md"
                    >
                      <Eye size={12} /> Open Fullscreen
                    </button>
                  </div>
                  <iframe
                    srcDoc={websiteHtml}
                    className={cn(
                      "w-full flex-1 border-none bg-white",
                      isGenerating ? "opacity-30 blur-sm pointer-events-none" : "opacity-100 blur-0"
                    )}
                    sandbox="allow-scripts allow-same-origin"
                    title="Generated Website Preview"
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#0a0a0f] opacity-40">
                  <Layout size={48} className="mb-4 text-primary animate-pulse" />
                  <p className="text-sm font-mono mb-2">Engage the model to generate visuals</p>
                  <p className="text-xs text-white/50 max-w-sm">Type your website request and click 'Engage' to view your generated website live in this pane.</p>
                </div>
              )}
            </div>
          )}

          {/* Generating Modal Overlay */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-8 right-8 w-[320px] bg-[#0a0a0f]/95 backdrop-blur-xl border border-primary/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
              >
                <div className="p-4 bg-primary/10 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Processing...</span>
                  </div>
                  {validation && <span className="text-[10px] font-mono text-primary">{validation.score}/10 SQ</span>}
                </div>
                <div className="p-4 space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {logs.slice(-3).map(log => (
                    <div key={log.id} className="text-[10px] font-mono opacity-80 flex gap-2">
                      <span className={cn("font-bold shrink-0", AGENT_COLORS[log.agent])}>[{log.agent[0]}]</span>
                      <span className="text-white/60 truncate">{log.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const monitorPlayIcon = MonitorPlay;
