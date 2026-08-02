import { AnimatedBackground } from "@/components/auth/AnimatedBackground";
import { LoginCard } from "@/components/auth/LoginCard";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-6 md:px-12 lg:px-24">
        {/* Left Side Content */}
        <div className="flex-1 text-left hidden md:block mt-24">
          <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-4 text-glow gradient-text">
            Build The Future <br />
            With AI Agents
          </h2>
          <p className="text-xl text-muted-foreground max-w-lg mb-8 opacity-80 mix-blend-screen">
            The world's first multi-agent platform designed to architect, code, design, and deploy full-stack applications through a single command sequence.
          </p>
          <div className="flex gap-4">
             <span className="px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs uppercase tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.2)]">
               Terminal Live
             </span>
             <span className="px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs uppercase tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(249,115,22,0.2)]">
               Agents Idle
             </span>
          </div>
        </div>

        {/* Right Side Content - Login Card */}
        <div className="flex-1 flex justify-center md:justify-end">
          <LoginCard />
        </div>
      </div>
    </main>
  );
}
