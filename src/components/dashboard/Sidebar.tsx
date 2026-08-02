"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Bot, 
  TerminalSquare, 
  FolderGit2, 
  Rocket, 
  Cpu, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: TerminalSquare, label: "Command Center" },
  { href: "/projects", icon: FolderGit2, label: "Projects" },
  { href: "/deployment", icon: Rocket, label: "Deployment" },
  { href: "/agents", icon: Bot, label: "AI Agents" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-screen bg-[var(--color-background)] border-r border-white/5 flex flex-col relative z-20 shrink-0"
    >
      {/* Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 relative">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center shrink-0">
            <Cpu size={18} className="text-primary animate-pulse" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent whitespace-nowrap"
            >
              AI Builder
            </motion.span>
          )}
        </div>
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute left-0 w-1 h-1/2 bg-primary rounded-r-md top-1/4"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon size={20} className={cn("shrink-0", isActive && "animate-glow")} />
              
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-14 px-2 py-1 bg-muted border border-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-xs text-white z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium whitespace-nowrap">Disconnect</span>}
        </Link>
      </div>
    </motion.aside>
  );
}
