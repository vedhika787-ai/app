import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { parseFilesFromResponse } from "@/lib/file-parser";
import {
  agentAnalyzePrompt,
  agentDesignSystem,
  agentContentWriter,
  agentCodeGenerator,
  agentWebsiteBuilder,
  agentValidator,
} from "@/lib/agents";

export const maxDuration = 60; // Allow 60 seconds
export const dynamic = "force-dynamic";


const PROJECTS_DIR = path.join(process.cwd(), "..", "generated-projects");

/**
 * POST /api/generate-project
 * 
 * Streaming multi-agent pipeline. Each agent's output feeds into the next.
 * Progress is streamed to the client as Server-Sent Events (SSE).
 * 
 * Event types:
 *   agent_start  – agent begins work
 *   agent_done   – agent finished (includes output summary)
 *   agent_chat   – inter-agent conversation message
 *   file         – a generated file
 *   website      – the final HTML for iframe preview
 *   validation   – code review result
 *   error        – something went wrong
 *   complete     – pipeline finished
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, geminiApiKey, prompt: legacyPrompt, mode = "full" } = body as {
    messages?: { role: string; content: string }[];
    prompt?: string;
    geminiApiKey?: string;
    mode?: "plan" | "code" | "ui" | "full";
  };

  let prompt = "";
  if (messages && messages.length > 0) {
    prompt = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
  } else if (legacyPrompt) {
    prompt = legacyPrompt;
  }

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "Prompt/Messages are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey =
    geminiApiKey && geminiApiKey.length > 10 && !geminiApiKey.startsWith("SWARM-")
      ? geminiApiKey
      : null;

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (data: Record<string, unknown>) => {
    try {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
      );
    } catch {
      /* stream may have closed */
    }
  };

  // Run the pipeline in the background so the response streams immediately
  (async () => {
    try {
      // ── Agent 1: Prompt Analyzer ─────────────────────
      await send({
        type: "agent_start",
        agent: "Prompt Analyzer",
        message: `Analyzing prompt: "${prompt.substring(0, 80)}..."`,
      });

      const analysis = await agentAnalyzePrompt(prompt, apiKey);

      await send({
        type: "agent_chat",
        agent: "Prompt Analyzer",
        message: `Industry identified: ${analysis.industry}`,
      });
      await send({
        type: "agent_chat",
        agent: "Prompt Analyzer",
        message: `Mood: ${analysis.mood} | Type: ${analysis.type} | Pages: ${analysis.pages.join(", ")}`,
      });
      await send({
        type: "agent_chat",
        agent: "Prompt Analyzer",
        message: `Components needed: ${analysis.components.join(", ")}`,
      });
      await send({
        type: "agent_done",
        agent: "Prompt Analyzer",
        message: `Analysis complete for "${analysis.projectName}"`,
        data: analysis,
      });

      if (mode === "plan") {
        await send({ type: "complete", message: "Plan stage complete." });
        return;
      }

      // ── Agent 2: Design System Architect ──────────────
      await send({
        type: "agent_start",
        agent: "Design Architect",
        message: `Creating unique design system for ${analysis.mood} ${analysis.industry}...`,
      });
      const design = await agentDesignSystem(analysis, prompt, apiKey);

      await send({
        type: "agent_chat",
        agent: "Design Architect",
        message: `Theme: ${design.theme} | Style: ${design.style}`,
      });
      await send({
        type: "agent_chat",
        agent: "Design Architect",
        message: `Colors: Primary ${design.primaryColor}, Accent ${design.accentColor}, BG ${design.backgroundColor}`,
      });
      await send({
        type: "agent_chat",
        agent: "Design Architect",
        message: `Typography: Body "${design.fontFamily}", Headings "${design.headingFont}"`,
      });
      await send({
        type: "agent_done",
        agent: "Design Architect",
        message: "Design system finalized. Passing to Content Writer...",
        data: design,
      });

      // ── Agent 3: Content Writer ───────────────────────
      await send({
        type: "agent_start",
        agent: "Content Writer",
        message: `Writing ${analysis.contentType} content for ${analysis.targetAudience}...`,
      });

      const content = await agentContentWriter(analysis, design, prompt, apiKey);

      await send({
        type: "agent_chat",
        agent: "Content Writer",
        message: `Generated ${content.pages ? content.pages.length : 0} pages. Hero: "${content.pages?.[0]?.heroTitle}"`,
      });
      await send({
        type: "agent_chat",
        agent: "Content Writer",
        message: `Global CTA: ${content.global?.ctaPrimary}`,
      });
      await send({
        type: "agent_done",
        agent: "Content Writer",
        message: "Content ready. Passing to Code Generator...",
      });

      let iteration = 1;
      const maxIterations = 3;
      let finalFiles = [];
      let feedback = "";
      let currentProjectId = "";

      while (iteration <= maxIterations) {
        // ── Agent 4: Code Generator ───────────────────────
        await send({
          type: "agent_start",
          agent: "Code Generator",
          message: iteration === 1
            ? `Generating multi-file Next.js project with ${design.style} design...`
            : `Iteration ${iteration}: Fixing bugs and refining UI based on Code Reviewer feedback...`,
        });

        const rawCode = await agentCodeGenerator(analysis, design, content, prompt, apiKey, feedback);

        // Parse into individual files
        finalFiles = parseFilesFromResponse(rawCode);

        // Write files to disk
        currentProjectId = Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
        const projectDir = path.join(PROJECTS_DIR, currentProjectId);
        await mkdir(projectDir, { recursive: true });

        for (const file of finalFiles) {
          const filePath = path.join(projectDir, file.path);
          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, file.content, "utf-8");

          await send({
            type: "file",
            data: { path: file.path, language: file.language, content: file.content },
          });
        }

        await send({
          type: "agent_done",
          agent: "Code Generator",
          message: `${finalFiles.length} files generated for iteration ${iteration}.`,
          projectId: currentProjectId,
        });

        // ── Agent 5: Website Builder (HTML Preview) ──────
        await send({
          type: "agent_start",
          agent: "Website Builder",
          message: "Assembling single-file HTML for live preview...",
        });

        const websiteHtml = await agentWebsiteBuilder(analysis, design, content, apiKey);

        await send({
          type: "website",
          data: websiteHtml,
        });

        await send({
          type: "agent_done",
          agent: "Website Builder",
          message: "Live preview HTML assembled.",
        });

        if (mode === "ui") {
          await send({ type: "complete", message: "UI stage complete." });
          return;
        }

        if (mode === "code" && iteration === 1) {
          await send({ type: "complete", message: "Code stage complete." });
          return;
        }

        // ── Agent 6: Code Validator ───────────────────────
        await send({
          type: "agent_start",
          agent: "Code Reviewer",
          message: "Reviewing generated code for errors & UI quality...",
        });

        const validation = await agentValidator(finalFiles, content, apiKey);

        await send({
          type: "agent_chat",
          agent: "Code Reviewer",
          message: `Score: ${validation.score}/10 — ${validation.summary}`,
        });
        if (validation.issues.length > 0) {
          for (const issue of validation.issues.slice(0, 4)) {
            await send({
              type: "agent_chat",
              agent: "Code Reviewer",
              message: `⚠ ${issue}`,
            });
          }
        }
        await send({
          type: "validation",
          data: validation,
        });

        if (validation.score >= 9 || iteration === maxIterations) {
          break;
        } else {
          feedback = "Reviewer feedback to fix:\n" + validation.issues.join("\n");
          await send({
            type: "agent_chat",
            agent: "System",
            message: `Score < 9. Triggering iteration ${iteration + 1}...`,
          });
        }
        iteration++;
      }

      // ── Done ──────────────────────────────────────────
      await send({
        type: "complete",
        projectId: currentProjectId,
        fileCount: finalFiles.length,
      });
    } catch (err) {
      console.error("Pipeline error:", err);
      await send({
        type: "error",
        message: err instanceof Error ? err.message : "Pipeline failed",
      });
    } finally {
      try {
        await writer.close();
      } catch {
        /* already closed */
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
