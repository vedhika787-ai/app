/**
 * AI utility — simplified.
 * 
 * The heavy lifting is now done by the multi-agent pipeline in /api/generate-project.
 * This module only keeps generateProjectPlan for backward compat and generateFullWebsite
 * as a direct client import (used only if the API route isn't available).
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Key helpers ───────────────────────────────────────────

type Provider = "gemini" | "openai" | "anthropic";

const AGENT_PROVIDER_MAP: Record<string, Provider> = {
  "Gemini Pro High": "gemini",
  "Gemini Pro Low": "gemini",
  "Gemini High": "gemini",
  "Gemini Low": "gemini",
  "Gemini Pro": "gemini",
  "Gemini": "gemini",
  "Figma AI": "gemini",
  "Draftly.ai": "gemini",
  "Claude Sonnet Latest": "anthropic",
  "Claude Sonnet": "anthropic",
};

const SESSION_KEY_MAP: Record<Provider, string> = {
  gemini: "gemini_api_key",
  openai: "openai_api_key",
  anthropic: "anthropic_api_key",
};

function getProviderKey(agentLabel?: string): string | null {
  if (typeof window === "undefined") return null;
  const provider = agentLabel
    ? AGENT_PROVIDER_MAP[agentLabel] || "gemini"
    : "gemini";
  const key = sessionStorage.getItem(SESSION_KEY_MAP[provider]) || "";
  if (!key || key.length < 10 || key.startsWith("SWARM-")) return null;
  return key;
}

function getGenAI(agentLabel?: string): GoogleGenerativeAI | null {
  const key = getProviderKey(agentLabel);
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

async function callPollinationsAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai",
    }),
  });
  return await response.text();
}

// ── generateProjectPlan ───────────────────────────────────

export async function generateProjectPlan(
  prompt: string,
  _model?: string,
  agentLabel?: string
): Promise<string> {
  const systemPrompt = `You are a senior software architect. Generate a detailed project plan for the following project.

Include:
1. Project Overview
2. Tech Stack Recommendations
3. Page/Route Structure
4. Component Architecture
5. Data Models
6. API Endpoints (if applicable)
7. Deployment Strategy

Be specific and detailed. Tailor everything to the user's prompt.`;

  // Try Gemini first
  const genAI = getGenAI(agentLabel);
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent([
        `${systemPrompt}\n\nProject: ${prompt}`,
      ]);
      return result.response.text();
    } catch {
      // fall through
    }
  }

  // Pollinations fallback
  try {
    return await callPollinationsAI(systemPrompt, prompt);
  } catch {
    // Minimal fallback
    return `# Project Plan: ${prompt}\n\n## Tech Stack\n- Next.js 14 (App Router)\n- React 18\n- Tailwind CSS\n- Framer Motion\n\n## Pages\n- Home\n- About\n- Services/Products\n- Contact\n\n## Key Features\n- Responsive design\n- Animated transitions\n- Modern UI components\n\n_Plan generated in offline mode._`;
  }
}

// ── generateCode (kept for backward compat) ───────────────

export async function generateCode(
  prompt: string,
  _model?: string,
  agentLabel?: string
): Promise<string> {
  const systemPrompt = `Generate a complete Next.js App Router project for: "${prompt}".
Output each file with a "// FILE: path" header. Include package.json, layout.tsx, globals.css, page.tsx, and at least 4 component files.
Use Tailwind CSS. Make the design premium and unique to the prompt.`;

  const genAI = getGenAI(agentLabel);
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent([
        `${systemPrompt}\n\nProject: ${prompt}`,
      ]);
      return result.response.text();
    } catch {
      // fall through
    }
  }

  try {
    return await callPollinationsAI(systemPrompt, prompt);
  } catch {
    return `// Code generation unavailable. Please check your network connection.`;
  }
}

// ── generateFullWebsite (direct HTML, used as fallback) ───

export async function generateFullWebsite(
  prompt: string,
  _model?: string,
  _agentLabel?: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.("Website Builder: Starting HTML generation...");

  const systemPrompt = `Generate a COMPLETE, single-file HTML document for: "${prompt}".

Include:
- <!DOCTYPE html> and all required tags
- Tailwind CSS via CDN
- Google Fonts import (choose fonts that match the project's mood)
- Inline React via CDN with Babel
- Multiple page sections (hero, features/products, about, contact, footer)
- Responsive design
- Animations
- Colors and fonts specific to the project type

Do NOT wrap in markdown. Output raw HTML only.`;

  const genAI = getGenAI(_agentLabel);
  if (genAI) {
    try {
      onProgress?.("Website Builder: Using Gemini API...");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent([
        `${systemPrompt}\n\nProject: ${prompt}`,
      ]);
      const text = result.response.text();
      const html = text.match(/<!DOCTYPE html>[\s\S]*/i);
      if (html && html[0].length > 500) return html[0];
    } catch {
      // fall through
    }
  }

  try {
    onProgress?.("Website Builder: Using Pollinations AI...");
    const result = await callPollinationsAI(systemPrompt, prompt);
    const html = result.match(/<!DOCTYPE html>[\s\S]*/i);
    if (html && html[0].length > 500) return html[0];
  } catch {
    // fall through
  }

  onProgress?.("Website Builder: Using local builder...");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${prompt}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet"/>
<style>body{font-family:'Inter',sans-serif;background:#0a0a0f;color:#e2e8f0;margin:0}</style>
</head>
<body>
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px">
<div>
<h1 style="font-size:48px;font-weight:800;margin-bottom:16px;background:linear-gradient(135deg,#8b5cf6,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${prompt}</h1>
<p style="color:#94a3b8;font-size:18px;max-width:600px;margin:0 auto 32px">This preview is a placeholder. The full multi-agent pipeline generates a complete, interactive website with unique design.</p>
<p style="color:#475569;font-size:14px">Run a Full Build from the dashboard to generate the real preview.</p>
</div>
</div>
</body>
</html>`;
}
