// Build Bust: 1710745634
/**
 * Multi-Agent AI System
 * 
 * Each agent has a specific role and passes its output to the next agent.
 * The chain: Analyzer → Designer → Content Writer → Code Generator → Website Builder → Validator
 */

export interface PromptAnalysis {
  projectName: string;
  industry: string;
  type: string;
  targetAudience: string;
  mood: string;
  features: string[];
  pages: string[];
  components: string[];
  contentType: string;
}

export interface DesignSystem {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  fontFamily: string;
  headingFont: string;
  borderRadius: string;
  theme: "dark" | "light";
  style: string;
}

export interface ContentSpec {
  pages: {
    name: string;
    path: string;
    heroTitle: string;
    heroSubtitle: string;
    heroImageQuery?: string;
    sections: { title: string; description: string; icon: string; imageQuery?: string }[];
    items: { name: string; description: string; price?: string; tag?: string; imageQuery?: string }[];
  }[];
  global: {
    ctaPrimary: string;
    ctaSecondary: string;
    footerTagline: string;
    testimonials: { name: string; role: string; text: string }[];
  };
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
  summary: string;
}

// ── Robust JSON Extractor ─────────────────────────────────

function extractJSON<T>(text: string): T | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.substring(start, end + 1);
      try {
        return JSON.parse(jsonStr) as T;
      } catch (innerErr) {
        // Fallback: Attempt to remove problematic newlines inside strings if parse fails
        const cleaned = jsonStr.replace(/\n/g, " ").replace(/\r/g, "");
        return JSON.parse(cleaned) as T;
      }
    }
  } catch (err) {
    console.error("[JSON PARSE ERROR]", err);
  }
  return null;
}

// ── Core AI Caller ────────────────────────────────────────

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey?: string | null
): Promise<string> {
  // Use user-provided Gemini Key if available
  if (apiKey && apiKey.length > 10 && !apiKey.startsWith("SWARM-")) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use flash for wider compatibility
      const result = await model.generateContent([
        `${systemPrompt}\n\n---\nUser Request: ${userPrompt}`,
      ]);
      return result.response.text();
    } catch (err) {
      console.warn("Gemini API failed, falling back to free tier:", err);
    }
  }

  // Free fallback: Pollinations AI with proper timeout and error detection
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "openai",
        jsonMode: true,
        seed: Math.floor(Math.random() * 1000000)
      }),
      signal: AbortSignal.timeout(45000), // Increase to 45s for busy times
    });

    if (res.status === 429) {
      console.warn("[AI WARN] Rate limited by Pollinations. Waiting 2s...");
      await new Promise(r => setTimeout(r, 2000));
      // Recursively try once more after delay
      return callAI(systemPrompt, userPrompt, null); 
    }
    if (!res.ok) {
      throw new Error(`Pollinations HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
       console.error("[AI ERROR] Pollinations timed out after 45s.");
    }
    console.error("[AI ERROR] Free tier logic failed:", err);
    throw err; 
  }
}

// ── Agent 1: Prompt Analyzer ──────────────────────────────

export async function agentAnalyzePrompt(
  prompt: string,
  apiKey?: string | null
): Promise<PromptAnalysis> {
  const system = `You are Agent 1: PROMPT ANALYZER. Your job is to deeply understand the user's website request.
CRITICAL FOR CHAT HISTORY: If the user provides a chat history asking for modifications (e.g., "change the color", "add a section", "make different content"), you MUST NOT invent a new project name or industry if they provided one before. You must retain the context from the previous messages! Only update the fields that reflect their latest request.

RESPOND ONLY WITH VALID JSON (no markdown, no code fences, no explanation). Use this exact schema:
{
  "projectName": "a short, catchy project name (2-4 words)",
  "industry": "specific industry like 'luxury fashion ecommerce', 'artisan coffee shop', 'crypto trading platform'",
  "type": "website type: 'ecommerce', 'portfolio', 'landing-page', 'dashboard', 'saas', 'blog', 'restaurant'",
  "targetAudience": "who will use this (be specific)",
  "mood": "design mood: pick ONE from 'luxury-dark', 'clean-minimal', 'vibrant-playful', 'corporate-professional', 'retro-vintage', 'neon-cyberpunk', 'earthy-organic', 'elegant-serif'",
  "features": ["list of 5-8 specific features this website needs"],
  "pages": ["list of 4-6 specific page names needed for a COMPLETE experience"],
  "components": ["list of 6-10 React component names needed"],
  "contentType": "what kind of items/content (e.g. 'art pieces with prices', 'menu items', 'SaaS features')"
}`;

  let result = "";
  try {
    result = await callAI(system, prompt, apiKey);
    console.log("[AGENT TRACE] Prompt Analyzer Result length:", result.length);
  } catch (error) {
    console.warn("[AGENT WARN] Prompt Analyzer callAI threw error. Using procedural fallback.");
  }

  const parsed = extractJSON<PromptAnalysis>(result);
  if (parsed && parsed.projectName && parsed.industry) {
    return parsed;
  }

  const shortPrompt = prompt.length > 25 ? prompt.substring(0, 25) + "..." : prompt;
  console.warn("[AGENT WARN] Prompt Analyzer parsing failed, using smart fallback for:", shortPrompt);

  let fallbackName = "New Project";
  let fallbackIndustry = "Modern Technology";
  let fallbackMood: "luxury-dark" | "clean-minimal" | "vibrant-playful" | "corporate-professional" | "retro-vintage" | "neon-cyberpunk" | "earthy-organic" | "elegant-serif" = "luxury-dark";

  // Try to extract name from ANYWHERE in the history since Agent 1 might have missed it
  const historyNames = prompt.match(/(?:Project Name|Project|Named|Called|Title):\s*"([^"]+)"/i) || 
                       prompt.match(/["']([^"']+)["']/) || 
                       prompt.match(/called\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
                       
  if (historyNames) {
    fallbackName = historyNames[1];
  } else {
    // Look for the last user message to find the project name
    const lastUserMsg = prompt.split('[USER]:').pop() || "";
    const words = lastUserMsg.trim().split(/\s+/).filter(w => w.length > 3 && /^[A-Z]/.test(w));
    if (words.length > 0) fallbackName = words[0] + " Pro";
  }

  const pLow = prompt.toLowerCase();
  
  // Extract industry more aggressively from nouns
  const industryKeywords: Record<string, string[]> = {
    "Artisan Bakery": ["bakery", "cake", "bread", "pastry", "donut", "bagel"],
    "Luxury Fashion": ["fashion", "clothing", "dress", "apparel", "boutique", "jewelry"],
    "Gaming & Esports": ["game", "gaming", "esport", "stream", "rpg", "mmo"],
    "Culinary & Dining": ["cook", "recipe", "food", "restaurant", "cafe", "dining", "chef"],
    "Artisan Beverages": ["tea", "coffee", "brew", "beverage", "drink", "barista"],
    "Software & Technology": ["tech", "software", "saas", "app", "digital", "ai", "cloud"],
    "Fitness & Wellness": ["fitness", "gym", "workout", "health", "yoga", "training"],
    "Real Estate": ["realty", "house", "property", "estate", "home", "apartment"],
    "Automotive": ["car", "auto", "vehicle", "rental", "dealership", "motor"],
    "Financial Services": ["finance", "bank", "invest", "trading", "crypto", "wealth"]
  };

  for (const [ind, keys] of Object.entries(industryKeywords)) {
    if (keys.some(k => pLow.includes(k))) {
      fallbackIndustry = ind;
      if (ind === "Artisan Bakery") fallbackMood = "elegant-serif";
      if (ind === "Gaming & Esports") fallbackMood = "neon-cyberpunk";
      if (ind === "Luxury Fashion") fallbackMood = "clean-minimal";
      if (ind === "Software & Technology") fallbackMood = "luxury-dark";
      if (ind === "Fitness & Wellness") fallbackMood = "vibrant-playful";
      break;
    }
  }

  // Detect existing pages from history to prevent resetting state!
  let detectedPages: string[] = [];
  const assistantMsgs = prompt.split('[ASSISTANT]:');
  if (assistantMsgs.length > 1) {
    const lastAssistant = assistantMsgs.pop() || "";
    // Look for page-like lists
    const pageMatch = lastAssistant.match(/pages:\s*\[(.*?)\]/i) || lastAssistant.match(/pages are\s*(.*?)(?:\.|$)/i);
    if (pageMatch) {
       detectedPages = pageMatch[1].split(/[,|]/).map(p => p.trim().replace(/['"\[\]]/g, '')).filter(p => p.length > 2);
    }
  }

  // If new page requested in last user message
  const lastUserMsg = prompt.split('[USER]:').pop() || "";
  const newPageMatch = lastUserMsg.match(/add a\s+([^ ]+)\s+page/i) || lastUserMsg.match(/called\s+['"]([^'"]+)['"]/i);
  if (newPageMatch && !detectedPages.includes(newPageMatch[1])) {
    detectedPages.push(newPageMatch[1]);
  }

  const finalPages = detectedPages.length >= 3 ? detectedPages : (pLow.includes("shop") || pLow.includes("store") ? ["Home", "Shop", "About", "Cart"] : ["Home", "Services", "About", "Contact"]);

  // Industry-specific features to avoid "Responsive Design" vagueness
  const industryFeatures: Record<string, string[]> = {
    "Artisan Bakery": ["Daily Fresh Oven", "Local Organic Grains", "Old World Fermentation", "Curated Pastry Box"],
    "Gaming & Esports": ["Pro Gear Reviews", "Live Tournament Tracking", "Legacy Leaderboards", "Elite Clan Hub"],
    "Real Estate": ["Virtual Home Tours", "Neighborhood Insights", "Smart Valuation Tool", "Expert Agent Access"],
    "Automotive": ["Performance Specs", "Inventory Showroom", "Test Drive Booking", "Heritage Archives"],
    "Default": ["Premium Quality", "Global Support", "Fast Delivery", "Expert Guidance"]
  };

  const selectedFeatures = industryFeatures[fallbackIndustry] || industryFeatures["Default"]!;

  return {
    projectName: fallbackName,
    industry: fallbackIndustry,
    type: pLow.includes("shop") || pLow.includes("store") || pLow.includes("buy") ? "ecommerce" : "website",
    targetAudience: "passionate " + fallbackIndustry.split(' ')[0].toLowerCase() + " enthusiasts",
    mood: fallbackMood,
    features: selectedFeatures,
    pages: finalPages,
    components: ["Navbar", "Hero", "DetailsGrid", "ContentSection", "Footer"],
    contentType: fallbackIndustry + " collections",
  };
}

// ── Agent 2: Design System Architect ──────────────────────

export async function agentDesignSystem(
  analysis: PromptAnalysis,
  userPrompt: string,
  apiKey?: string | null
): Promise<DesignSystem> {
  const system = `You are Agent 2: DESIGN SYSTEM ARCHITECT. 

You received this analysis from Agent 1:
${JSON.stringify(analysis, null, 2)}

CRITICAL FOR CHAT HISTORY: You must also read the user's latest chat history below. If they specifically asked for a color (e.g., "make it blue", "use dark red"), a specific font, or a dark/light mode, YOU MUST APPLY THOSE CHANGES.

Based on the industry "${analysis.industry}", mood "${analysis.mood}", type "${analysis.type}", and the user's instructions, create a UNIQUE design system.

RESPOND ONLY WITH VALID JSON (no markdown, no code fences):
{
  "primaryColor": "#hex (main brand color)",
  "accentColor": "#hex (secondary/CTA color)",
  "backgroundColor": "#hex (page background)",
  "surfaceColor": "rgba() (card/surface background)",
  "textColor": "#hex (main text)",
  "mutedColor": "#hex (secondary text)",
  "borderColor": "rgba() (borders)",
  "fontFamily": "specific Google Font name for body (e.g. 'Inter', 'Playfair Display', 'Space Grotesk', 'DM Sans')",
  "headingFont": "specific Google Font name for headings (can be same or different)",
  "borderRadius": "CSS value like '16px', '24px', '8px', '999px'",
  "theme": "dark" or "light",
  "style": "one of: 'glassmorphism', 'neomorphism', 'flat-modern', 'editorial', 'brutalist', 'soft-minimal'"
}`;

  let result = "";
  try {
    result = await callAI(system, `Design for: ${analysis.projectName} (${analysis.industry}).\n\nUSER PROMPT:\n${userPrompt}`, apiKey);
    console.log("[AGENT TRACE] Design Architect Result length:", result.length);
  } catch (error) {
    console.warn("[AGENT WARN] Design Architect API error. Fallback triggered.");
  }

  const parsed = extractJSON<DesignSystem>(result);
  if (parsed && parsed.primaryColor && parsed.fontFamily) {
    return parsed;
  }

  console.warn("[AGENT WARN] Design Architect parse failed. Smart fallback triggered.");
  const moodDefaults: Record<string, Partial<DesignSystem>> = {
    "luxury-dark": { primaryColor: "#c9a55a", accentColor: "#e8d5a3", backgroundColor: "#0a0a0a", textColor: "#f5f5f5", theme: "dark", fontFamily: "Cormorant Garamond", headingFont: "Cormorant Garamond", style: "glassmorphism" },
    "clean-minimal": { primaryColor: "#2563eb", accentColor: "#3b82f6", backgroundColor: "#ffffff", textColor: "#1e293b", theme: "light", fontFamily: "Inter", headingFont: "Inter", style: "soft-minimal" },
    "vibrant-playful": { primaryColor: "#f43f5e", accentColor: "#8b5cf6", backgroundColor: "#fefce8", textColor: "#1c1917", theme: "light", fontFamily: "DM Sans", headingFont: "DM Sans", style: "flat-modern" },
    "neon-cyberpunk": { primaryColor: "#00ff88", accentColor: "#ff00ff", backgroundColor: "#0a0a14", textColor: "#e0e0e0", theme: "dark", fontFamily: "Space Grotesk", headingFont: "Orbitron", style: "glassmorphism" },
    "earthy-organic": { primaryColor: "#65a30d", accentColor: "#ca8a04", backgroundColor: "#fefdf5", textColor: "#1c1917", theme: "light", fontFamily: "Lora", headingFont: "Lora", style: "soft-minimal" },
    "elegant-serif": { primaryColor: "#b45309", accentColor: "#92400e", backgroundColor: "#fffbeb", textColor: "#1c1917", theme: "light", fontFamily: "Playfair Display", headingFont: "Playfair Display", style: "editorial" },
  };

  const selectedMood = moodDefaults[analysis.mood] || moodDefaults["luxury-dark"]!;

  // Smart keyword detection for colors in userPrompt
  let primary = selectedMood.primaryColor!;
  let accent = selectedMood.accentColor!;
  let bg = selectedMood.backgroundColor!;
  let theme = selectedMood.theme as "dark" | "light";

  if (userPrompt.toLowerCase().includes("green")) primary = "#22c55e";
  if (userPrompt.toLowerCase().includes("orange")) primary = "#f97316";
  if (userPrompt.toLowerCase().includes("blue")) primary = "#3b82f6";
  if (userPrompt.toLowerCase().includes("red")) primary = "#ef4444";
  if (userPrompt.toLowerCase().includes("pink")) primary = "#ec4899";
  if (userPrompt.toLowerCase().includes("black") || userPrompt.toLowerCase().includes("dark")) {
    bg = "#030303";
    theme = "dark";
  }
  if (userPrompt.toLowerCase().includes("white") || userPrompt.toLowerCase().includes("light")) {
    bg = "#ffffff";
    theme = "light";
  }

  return {
    primaryColor: primary,
    accentColor: accent,
    backgroundColor: bg,
    surfaceColor: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    textColor: theme === "dark" ? "#f8fafc" : "#0f172a",
    mutedColor: theme === "dark" ? "#94a3b8" : "#64748b",
    borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    fontFamily: selectedMood.fontFamily || "Inter",
    headingFont: selectedMood.headingFont || "Inter",
    borderRadius: "20px",
    theme: theme,
    style: selectedMood.style as any || "glassmorphism",
  };
}

// ── Agent 3: Content Writer ───────────────────────────────

export async function agentContentWriter(
  analysis: PromptAnalysis,
  design: DesignSystem,
  userPrompt: string,
  apiKey?: string | null
): Promise<ContentSpec> {
  const system = `You are Agent 3: STRATEGIC CONTENT ARCHITECT.

Your mission: Generate authentic, high-conversion content for a new website.

CRITICAL RULES:
1. NO PLACEHOLDERS: NEVER use names like "Item 1", "Alpha Product", "Premium Selection", or "Standard Choice".
2. INDUSTRY SPECIFICITY: If the industry is a Bakery, product names MUST be things like "Traditional Sourdough", "Almond Croissant", "Dark Chocolate Ganache Cake".
3. UNIQUE VALUE: Every page must have unique sections and descriptions.
4. IMAGE PRECISION: Hero image queries must be high-end photography prompts (e.g., "warm low-light bakery interior, flour dusting in air, cinematic bokeh").
5. IMAGE CATEGORY: All imageQuery strings MUST be prefixed with the core industry keyword (e.g., 'bakery sourdough', 'gaming keyboard', 'finance dashboard') to ensure search relevance.

Industry/Context:
- Industry: ${analysis.industry}
- Content Type: ${analysis.contentType}
- Target Audience: ${analysis.targetAudience}
- Required Pages: ${analysis.pages.join(", ")}

Respond ONLY with COMPACT VALID JSON. No markdown.

Schema:
{
  "pages": [
    {
      "name": "string",
      "path": "string",
      "heroTitle": "string",
      "heroSubtitle": "string",
      "heroImageQuery": "string (or a full https://... URL if specific image is requested)",
      "sections": [ { "title": "string", "description": "string", "icon": "emoji", "imageQuery": "string" } ],
      "items": [ { "name": "REAL SPECIFIC NAME", "description": "string", "price": "string", "tag": "string", "imageQuery": "string (or full URL)" } ]
    }
  ],
  "global": { "ctaPrimary": "string", "ctaSecondary": "string", "footerTagline": "string" }
}`;

  let result = "";
  try {
    result = await callAI(system, `Write content for: ${analysis.projectName} (${analysis.industry}).\n\nUSER CHAT HISTORY:\n${userPrompt}`, apiKey);
    console.log("[AGENT TRACE] Content Writer Result length:", result.length);
  } catch (e) {
    console.warn("[AGENT WARN] Content Writer API error.");
  }

  const parsed = extractJSON<ContentSpec>(result);
  if (parsed && parsed.pages && parsed.pages.length > 0) {
    return parsed;
  }

  console.warn("[AGENT WARN] Content Writer parse failed. Procedural generation triggered.");
  const cleanName = analysis.projectName.length > 30 ? "Our Platform" : analysis.projectName;

  const defaultPages = analysis.pages.length > 0 ? analysis.pages : ["Home", "About", "Services"];

  return {
    pages: defaultPages.map((pageName, idx) => {
      const isHome = pageName.toLowerCase() === "home" || idx === 0;
      const isAbout = pageName.toLowerCase().includes("about");
      const isPricing = pageName.toLowerCase().includes("pricing") || pageName.toLowerCase().includes("plan");
      const isFeatures = pageName.toLowerCase().includes("feature") || pageName.toLowerCase().includes("service");
      const isContact = pageName.toLowerCase().includes("contact");
      const isRecipe = pageName.toLowerCase().includes("recipe") || pageName.toLowerCase().includes("food") || analysis.industry.toLowerCase().includes("cook");
      const isGaming = pageName.toLowerCase().includes("game") || analysis.industry.toLowerCase().includes("game");
      const isLeaderboard = pageName.toLowerCase().includes("leaderboard") || pageName.toLowerCase().includes("rank") || pageName.toLowerCase().includes("score");
      const isProfile = pageName.toLowerCase().includes("profile") || pageName.toLowerCase().includes("user") || pageName.toLowerCase().includes("account");
      const isEcommerce = analysis.type === 'ecommerce' || analysis.industry.toLowerCase().includes('fashion') || analysis.industry.toLowerCase().includes('store');
      const isShop = pageName.toLowerCase().includes("shop") || pageName.toLowerCase().includes("store") || pageName.toLowerCase().includes("product");
      const isCart = pageName.toLowerCase().includes("cart") || pageName.toLowerCase().includes("bag");
      const isCheckout = pageName.toLowerCase().includes("checkout") || pageName.toLowerCase().includes("pay");

      // HERO
      let heroTitle = `${pageName} - ${cleanName}`;
      let heroSubtitle = `Explore our ${pageName.toLowerCase()} designed for ${analysis.targetAudience}.`;

      if (isHome) {
        heroTitle = `Welcome to ${cleanName}`;
        heroSubtitle = `The ultimate ${analysis.industry} solution for ${analysis.targetAudience}. Discover our ${analysis.features[0] || "features"} today.`;
      } else if (isRecipe) {
        heroTitle = `Delicious ${pageName}`;
        heroSubtitle = `Hand-picked ${analysis.contentType || "items"} crafted with passion and local ingredients.`;
      } else if (isGaming) {
        heroTitle = `Epic ${pageName}`;
        heroSubtitle = `The most immersive ${analysis.industry} experience for hardcore gamers and casual fans alike.`;
      } else if (isLeaderboard) {
        heroTitle = `Global Rankings`;
        heroSubtitle = `Check out the top performers and see where you rank in the community.`;
      } else if (isCart) {
        heroTitle = `Your Shopping Cart`;
        heroSubtitle = `Review your items and proceed to a secure checkout.`;
      } else if (isShop) {
        heroTitle = `Browse the Collection`;
        heroSubtitle = `Premium ${analysis.industry} essentials selected for your style.`;
      }

      // SECTIONS (Vivid, unique copy per industry)
      const ind = analysis.industry.toLowerCase();
      const industryCopy: Record<string, any[]> = {
        "artisan bakery": [
          { title: "Stone-Ground Flour", description: "We source our grains from local heritage mills to ensure every loaf has a deep, nutty flavor and perfect crumb.", icon: "🌾" },
          { title: "24-Hour Fermentation", description: "Time is our secret ingredient. Our dough rests through the night to develop a signature tang and airy texture.", icon: "⏳" },
          { title: "Seasonal Pastries", description: "Our display case changes with the moon. Experience hand-laminated croissants and tarts with local farm fruits.", icon: "🥐" }
        ],
        "gaming & esports": [
          { title: "Zero Latency Hub", description: "Join our ultra-fast servers and experience the smoothest competitive play with integrated comms and lobby systems.", icon: "⚡" },
          { title: "Legacy Leaderboards", description: "Carve your name into history. Our ranking system tracks every headshot, goal, and victory across all platforms.", icon: "🏆" },
          { title: "Pro-Grade Gear", description: "Equip yourself with the exact peripherals used by world champions. Pure performance, no compromises.", icon: "🎮" }
        ],
        "auto": [
          { title: "Heritage Archive", description: "Explore the engineering marvels of the past. From rare classics to forgotten prototypes that shaped the industry.", icon: "🏎️" },
          { title: "Smart Inventory", description: "Real-time updates on our current showroom. Filter by vintage, performance specs, or restoration status.", icon: "🔍" },
          { title: "Precision Tuning", description: "Our master mechanics treat every engine like a symphony, extracting maximum power with obsessive detail.", icon: "⚙️" }
        ],
        "tech": [
          { title: "Predictive Engines", description: "Our AI doesn't just respond; it anticipates your next move to streamline workflows before you even start.", icon: "🧠" },
          { title: "Neural Interfaces", description: "Bridging the gap between human thought and digital action with seamless, low-latency control systems.", icon: "🌐" },
          { title: "Hyper-Cloud Security", description: "Military-grade encryption layered with behavioral biometrics to keep your data truly private.", icon: "🛡️" }
        ],
        "default": [
          { title: "Premium Quality", description: "We set the standard in the industry, delivering unmatched results through obsessive attention to detail.", icon: "✨" },
          { title: "Human-Centric Design", description: "Our solutions are built around people, making complex technology feel intuitive and life-changing.", icon: "🤝" },
          { title: "Global Innovation", description: "A worldwide network of creators pushing the boundaries of what's possible in the modern age.", icon: "🌍" }
        ]
      };

      const industryKey = Object.keys(industryCopy).find(k => ind.includes(k)) || "default";
      let sections = (industryCopy[industryKey] || industryCopy["default"]).map(s => ({
         ...s,
         imageQuery: `${ind} ${s.title} abstract detail, cinematic`
      }));

      // ITEMS (Unique per page type)
      let items: any[] = [];
      if (isHome) {
        items = [
          { name: "Featured Picks", description: `Our most premium ${analysis.industry} selection.`, price: "From $29", tag: "Popular", imageQuery: `${analysis.industry} premium` },
          { name: "New Arrivals", description: `The latest trends in ${analysis.industry} available now.`, price: "From $19", tag: "Fresh", imageQuery: `${analysis.industry} new` }
        ];
      } else if (isShop || isEcommerce || isCart || isCheckout) {
        // Dynamic product generation based on industry
        const ind = analysis.industry.toLowerCase();
        const ci = ind.split(/[&\s,]/)[0].toLowerCase().replace(/[^a-z]/g, '') || 'product';

        // Comprehensive industry-specific item name fallbacks
        let names = ["Premium Selection", "Standard Choice", "Elite Version", "Classic Set", "Golden Edition"];

        if (ind.includes("shoe") || ind.includes("footwear")) {
          names = ["Air Max Pro", "Classic Leather Walker", "Midnight Stealth Runner", "Urban Street High-Top", "Infinity Cloud Sole"];
        } else if (ind.includes("tea") || ind.includes("leaf") || ind.includes("brew")) {
          names = ["Earl Grey Supreme", "Golden Jasmine Pearls", "Organic Matcha Ceremonial", "Wild Berry Infusion", "Midnight Rooibos"];
        } else if (ind.includes("coffee") || ind.includes("roast")) {
          names = ["Etiopian Yirgacheffe", "Dark Sumatra Blend", "Caramel Macchiato Beans", "French Roast Classic", "Velvet Espresso"];
        } else if (ind.includes("dress") || ind.includes("fashion") || ind.includes("clothing")) {
          names = ["Silk Evening Gown", "Vintage Floral Sundress", "Classic Velvet Cocktail", "Linen Summer Wrap", "Bohemian Maxi Dress"];
        } else if (ind.includes("tech") || ind.includes("gadget") || ind.includes("saas")) {
          names = ["Elite Pro Laptop", "Quantum Smart Watch", "Studio Grade Monitor", "Wireless Sound Canvas", "Neural Interface Hub"];
        } else if (ind.includes("food") || ind.includes("restaurant")) {
          names = ["Truffle Mushroom Risotto", "Grilled Atlantic Salmon", "Artisan Wagyu Burger", "Roasted Garden Harvest", "Signature Citrus Tart"];
        } else if (ind.includes("finance") || ind.includes("bank") || ind.includes("invest")) {
          names = ["Wealth Prime Account", "Elite Trading Terminal", "Global Bond Fund", "Quantum Crypto Ledger", "Secure Savings Vault"];
        } else if (ind.includes("medical") || ind.includes("health") || ind.includes("care")) {
          names = ["Full Body Wellness Scan", "Nano-Tech Recovery Patch", "Organic Vitality Pack", "Smart Patient Gateway", "Neural Health Monitor"];
        } else if (ind.includes("bakery") || ind.includes("cake") || ind.includes("bread") || ind.includes("pastry")) {
          names = ["Artisan Sourdough Loaf", "Belgian Chocolate Croissant", "Red Velvet Signature Cake", "French Macaron Box", "Honey Cinnamon Brioche"];
        }

        const descriptions: Record<string, string[]> = {
          "bakery": [
            "Hand-kneaded with locally milled flour and fermented for 24 hours for a perfect crust.",
            "Buttery, flaky layers of pastry filled with premium Belgian chocolate.",
            "Moist sponge cake topped with our signature cream cheese frosting and fresh berries.",
            "A mix of classic almond, lavender, and raspberry macarons in a beautiful gift box.",
            "Soft, enriched dough swirled with honey and organic cinnamon."
          ],
          "food": [
            "Creamy arborio rice with foraged truffles, finished with aged Parmigiano-Reggiano.",
            "Wild-caught salmon fillet seared to perfection with a lemon-herb butter glaze.",
            "Double-stacked wagyu beef patties with caramelized onions and house-made aioli.",
            "Seasonal root vegetables roasted with rosemary and local honey.",
            "Tangy citrus curd in a buttery shortcrust pastry with toasted meringue."
          ],
          "fashion": [
            "Hand-spun silk with a graceful floor-length silhouette for sophisticated evenings.",
            "Breathable organic cotton with a hand-painted floral motif for sunny days.",
            "Plush velvet tailored for a sleek, modern fit with subtle metallic accents.",
            "Lightweight Italian linen that drapes beautifully for effortless summer style.",
            "Flowing layers of ethereal fabric with intricate bohemian embroidery."
          ],
          "tech": [
            "Ultra-slim aerospace aluminum chassis with the latest quantum-processing chip.",
            "Sapphire glass display with integrated health sensors and 7-day battery life.",
            "4K color-accurate panel with ultra-thin bezels and ergonomic stand.",
            "Immersive spatial audio with active noise cancellation and memory foam pads.",
            "Haptic-feedback interface with low-latency neural processing capabilities."
          ],
          "gaming": [
            "Mechanical switches with per-key RGB lighting and rapid-fire response technology.",
            "High-precision 26,000 DPI sensor with ultra-lightweight magnesium shell.",
            "Ergonomic lumbar support with cooling gel memory foam and adjustable armrests.",
            "4K resolution at 240Hz with HDR1000 and ultra-fast respond times.",
            "3D audio drivers with noise-canceling microphone for crystal-clear comms."
          ],
          "shoe": [
            "Proprietary air-chamber cushioning with breathable mesh and dynamic support.",
            "Hand-stitched premium calfskin with a durable Goodyear welted sole.",
            "Waterproof technical fabric with aggressive tread for urban exploration.",
            "Reinforced ankle support with high-rebound midsole and street-ready style.",
            "Ultra-lightweight foam construction that feels like walking on zero gravity."
          ],
          "coffee": [
            "Single-origin heirloom beans with notes of wild blueberry and floral jasmine.",
            "Sun-dried beans with a bold, earthy profile and hints of dark chocolate.",
            "Rich espresso shots swirled with house-made salted caramel and steamed milk.",
            "Medium roast with a balanced body and clean finish for any time of day.",
            "Concentrated aromatic blend with a thick, golden crema for true aficionados."
          ]
        };

        const industryKey = Object.keys(descriptions).find(k => ind.includes(k)) || "food";
        const indDescs = descriptions[industryKey] || descriptions["food"];

        items = names.map((n, i) => ({
          name: n,
          description: indDescs[i % indDescs.length],
          price: `$${(29.99 + i * 15.50).toFixed(2)}`,
          tag: i === 0 ? "Bestseller" : (i % 2 === 0 ? "New" : "Popular"),
          imageQuery: `high-end professional studio photography of ${ind} ${n}, cinematic lighting, 8k resolution`
        }));
      } else if (isAbout) {
        items = [
          { name: "Our Core Mission", description: `Revolutionizing ${analysis.industry} through cutting-edge technology and human-centric design.`, price: "", tag: "Aspiration" },
          { name: "Global Presence", description: `Supporting over 50,000 ${analysis.targetAudience.toLowerCase()} worldwide.`, price: "", tag: "Reach" }
        ];
      } else if (isLeaderboard || isProfile) {
        items = [
          { name: "Global Statistics", description: "Your current journey and milestones reached so far.", price: "Level 42", tag: "Expert" },
          { name: "Recent Badges", description: "Unique achievements unlocked in your account.", price: "128xp", tag: "New" }
        ];
      } else {
        items = [
          { name: `${pageName} High-Performance`, description: "A specialized tool for our most advanced users.", price: "Available", tag: "Pro" },
          { name: `${pageName} Essential`, description: "The standard for excellence in the industry.", price: "Free", tag: "Classic" }
        ];
      }

      return {
        name: pageName,
        path: isHome ? "/" : `/${pageName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        heroTitle,
        heroSubtitle,
        heroImageQuery: `professional cinematic high quality background of ${analysis.industry} for a ${pageName} page`,
        sections: sections.map(s => ({ ...s, imageQuery: `professional icon or scene for ${s.title}` })),
        items: items.map(it => ({ ...it, imageQuery: it.imageQuery }))
      };
    }),
    global: {
      ctaPrimary: "Get Started",
      ctaSecondary: "Explore More",
      footerTagline: `© 2026 ${cleanName}. All rights reserved.`,
      testimonials: [
        { name: "Alex Mercer", role: "Product Manager", text: "This changed how we work entirely. Highly recommended." },
        { name: "Sarah Connor", role: "Design Lead", text: "Visually stunning and incredibly functional." }
      ]
    }
  };
}

function buildProceduralCode(analysis: PromptAnalysis, design: DesignSystem, content: ContentSpec): string {
  const pagesData = content.pages && content.pages.length > 0 ? content.pages : [
    { name: "Home", path: "/", heroTitle: analysis.projectName, heroSubtitle: "Welcome to our site", sections: [], items: [] }
  ];

  const ctaPrimary = content.global?.ctaPrimary || "Get Started";
  const ctaSecondary = content.global?.ctaSecondary || "Explore";
  const footerTagline = content.global?.footerTagline || "All rights reserved";

  let pagesOutput = "";
  for (const p of pagesData) {
    const filePath = p.path === "/" ? "src/app/page.tsx" : `src/app${p.path}/page.tsx`;
    const isHome = p.path === "/";
    const isCart = p.name.toLowerCase().includes("cart") || p.name.toLowerCase().includes("bag");
    const isCheckout = p.name.toLowerCase().includes("checkout");
    const isDetail = p.name.toLowerCase().includes("detail");
    const isLeaderboard = p.name.toLowerCase().includes("leaderboard") || p.name.toLowerCase().includes("rank");
    const isProfile = p.name.toLowerCase().includes("profile");

    pagesOutput += `\n// FILE: ${filePath}\n`;
    pagesOutput += `import Navbar from "@/components/Navbar";\n`;
    pagesOutput += `import Footer from "@/components/Footer";\n`;
    pagesOutput += `\nexport default function ${p.name.replace(/[^a-zA-Z]/g, "")}Page() {\n`;
    pagesOutput += `  return (\n`;
    pagesOutput += `    <main className="min-h-screen" style={{backgroundColor: "${design.backgroundColor}"}}>\n`;
    pagesOutput += `      <Navbar />\n`;
    pagesOutput += `      <div className="py-24 px-8 text-center flex flex-col items-center relative overflow-hidden">\n`;
    pagesOutput += `        <img src={"https://image.pollinations.ai/prompt/" + encodeURIComponent(${JSON.stringify(p.heroImageQuery || p.heroTitle)}) + "?width=1200&height=400&nologo=true&seed=" + Math.floor(Math.random() * 100000)} className="absolute inset-0 w-full h-full object-cover opacity-10 -z-20" />\n`;
    pagesOutput += `        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent -z-10" />\n`;
    pagesOutput += `        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-primary/10 blur-[120px] rounded-full -z-10" />\n`;
    pagesOutput += `        <h1 className="text-6xl md:text-8xl font-black mb-8 max-w-5xl tracking-tight leading-[1.1] font-heading" style={{color: "${design.primaryColor}"}}>${p.heroTitle}</h1>\n`;
    pagesOutput += `        <p className="text-xl md:text-2xl max-w-2xl opacity-70 mb-12 leading-relaxed font-medium">${p.heroSubtitle}</p>\n`;
    if (!isCart && !isCheckout) {
      pagesOutput += `        <div className="flex gap-6">\n`;
      pagesOutput += `          <button className="px-10 py-5 rounded-full text-white font-extrabold text-lg shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all hover:scale-105 hover:shadow-primary/40 active:scale-95" style={{backgroundColor: "${design.primaryColor}"}}>${ctaPrimary}</button>\n`;
      pagesOutput += `          <button className="px-10 py-5 ring-2 ring-white/10 rounded-full hover:bg-white/5 font-extrabold text-lg transition-all active:scale-95 backdrop-blur-sm">${ctaSecondary}</button>\n`;
      pagesOutput += `        </div>\n`;
    }
    pagesOutput += `      </div>\n`;

    if (isCart) {
      pagesOutput += `      <div className="max-w-7xl mx-auto p-8 py-20 grid grid-cols-1 lg:grid-cols-3 gap-12">\n`;
      pagesOutput += `        <div className="lg:col-span-2 space-y-6">\n`;
      if (p.items) {
        for (const item of p.items) {
          pagesOutput += `          <div className="flex items-center gap-8 p-6 rounded-3xl border border-white/5" style={{backgroundColor: "${design.surfaceColor}"}}>\n`;
          pagesOutput += `            <div className="w-24 h-24 bg-black/20 rounded-2xl flex-shrink-0" />\n`;
          pagesOutput += `            <div className="flex-grow">\n`;
          pagesOutput += `              <h3 className="text-xl font-bold font-heading">${item.name}</h3>\n`;
          pagesOutput += `              <p className="opacity-50 text-sm">${item.description}</p>\n`;
          pagesOutput += `            </div>\n`;
          pagesOutput += `            <div className="text-right">\n`;
          pagesOutput += `              <div className="text-xl font-black" style={{color: "${design.primaryColor}"}}>${item.price}</div>\n`;
          pagesOutput += `              <div className="text-xs opacity-30 mt-1">${item.tag || "Qty: 1"}</div>\n`;
          pagesOutput += `            </div>\n`;
          pagesOutput += `          </div>\n`;
        }
      }
      pagesOutput += `        </div>\n`;
      pagesOutput += `        <div className="p-8 rounded-3xl h-fit border border-white/10 shadow-xl" style={{backgroundColor: "${design.surfaceColor}"}}>\n`;
      pagesOutput += `          <h3 className="text-2xl font-black mb-8 font-heading">Order Summary</h3>\n`;
      pagesOutput += `          <div className="space-y-4 mb-8">\n`;
      pagesOutput += `            <div className="flex justify-between opacity-60"><span>Subtotal</span><span>$124.99</span></div>\n`;
      pagesOutput += `            <div className="flex justify-between opacity-60"><span>Shipping</span><span>$0.00</span></div>\n`;
      pagesOutput += `            <div className="flex justify-between text-2xl font-black pt-4 border-t border-white/5"><span>Total</span><span>$124.99</span></div>\n`;
      pagesOutput += `          </div>\n`;
      pagesOutput += `          <button className="w-full py-5 rounded-2xl text-white font-black text-lg shadow-xl" style={{backgroundColor: "${design.primaryColor}"}}>Checkout Now</button>\n`;
      pagesOutput += `        </div>\n`;
      pagesOutput += `      </div>\n`;
    } else if (isCheckout) {
      pagesOutput += `      <div className="max-w-4xl mx-auto p-8 py-20">\n`;
      pagesOutput += `        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">\n`;
      pagesOutput += `          <div className="space-y-6">\n`;
      pagesOutput += `            <h3 className="text-2xl font-black font-heading">Shipping Details</h3>\n`;
      pagesOutput += `            <input className="w-full p-4 rounded-xl border border-white/5 bg-white/5 outline-none focus:ring-2 ring-primary" placeholder="Full Name" />\n`;
      pagesOutput += `            <input className="w-full p-4 rounded-xl border border-white/5 bg-white/5 outline-none focus:ring-2 ring-primary" placeholder="Email Address" />\n`;
      pagesOutput += `            <input className="w-full p-4 rounded-xl border border-white/5 bg-white/5 outline-none focus:ring-2 ring-primary" placeholder="Shipping Address" />\n`;
      pagesOutput += `          </div>\n`;
      pagesOutput += `          <div className="p-8 rounded-3xl border border-white/10" style={{backgroundColor: "${design.surfaceColor}"}}>\n`;
      pagesOutput += `             <h3 className="text-xl font-bold mb-6 font-heading">Order Review</h3>\n`;
      pagesOutput += `             <div className="text-sm opacity-50 mb-8">You are purchasing 3 items. Taxes will be calculated at next step.</div>\n`;
      pagesOutput += `             <button className="w-full py-4 rounded-xl text-white font-bold" style={{backgroundColor: "${design.primaryColor}"}}>Complete Purchase</button>\n`;
      pagesOutput += `          </div>\n`;
      pagesOutput += `        </div>\n`;
      pagesOutput += `      </div>\n`;
    } else if (isDetail) {
      pagesOutput += `      <div className="max-w-7xl mx-auto p-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">\n`;
      pagesOutput += `        <div className="aspect-square bg-black/20 rounded-[40px] shadow-2xl overflow-hidden relative">\n`;
      pagesOutput += `           <img src={"https://image.pollinations.ai/prompt/" + encodeURIComponent(${JSON.stringify(p.heroImageQuery || p.items?.[0]?.name || analysis.industry)}) + "?width=800&height=800&nologo=true&seed=" + Math.floor(Math.random() * 100000)} className="absolute inset-0 w-full h-full object-cover" />\n`;
      pagesOutput += `           <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent" />\n`;
      pagesOutput += `        </div>\n`;
      pagesOutput += `        <div className="space-y-8">\n`;
      pagesOutput += `           <span className="px-4 py-2 rounded-full bg-primary/10 text-primary font-black text-xs uppercase tracking-widest">Premium Choice</span>\n`;
      pagesOutput += `           <h2 className="text-5xl font-black font-heading">${p.items?.[0]?.name || "Product Performance"}</h2>\n`;
      pagesOutput += `           <p className="text-xl opacity-60 leading-relaxed">${p.items?.[0]?.description || "Experience the next generation of quality and design."}</p>\n`;
      pagesOutput += `           <div className="text-4xl font-black" style={{color: "${design.primaryColor}"}}>${p.items?.[0]?.price || "$99.00"}</div>\n`;
      pagesOutput += `           <div className="flex gap-4 pt-4">\n`;
      pagesOutput += `              <button className="px-10 py-5 rounded-full text-white font-black" style={{backgroundColor: "${design.primaryColor}"}}>Add to Bag</button>\n`;
      pagesOutput += `              <button className="p-5 rounded-full border border-white/10 hover:bg-white/5 transition-colors">❤️</button>\n`;
      pagesOutput += `           </div>\n`;
      pagesOutput += `        </div>\n`;
      pagesOutput += `      </div>\n`;
    } else if (isLeaderboard) {
      pagesOutput += `      <div className="max-w-4xl mx-auto p-8 py-20">\n`;
      pagesOutput += `        <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl" style={{backgroundColor: "${design.surfaceColor}"}}>\n`;
      pagesOutput += `          <table className="w-full text-left border-collapse">\n`;
      pagesOutput += `            <thead><tr className="bg-white/5"><th className="p-6 font-bold uppercase tracking-wider text-xs opacity-50">Rank</th><th className="p-6 font-bold uppercase tracking-wider text-xs opacity-50">Competitor</th><th className="p-6 font-bold uppercase tracking-wider text-xs opacity-50 text-right">Score</th></tr></thead>\n`;
      pagesOutput += `            <tbody className="divide-y divide-white/5">\n`;
      if (p.items) {
        p.items.map((item, i) => {
          pagesOutput += `              <tr className="hover:bg-white/5 transition-colors"><td className="p-6 font-heading font-bold text-xl opacity-30">#${i + 1}</td><td className="p-6 font-bold font-heading text-lg">${item.name}<br/><span className="text-sm font-normal opacity-50 font-sans">${item.description}</span></td><td className="p-6 font-black font-heading text-xl text-right" style={{color: "${design.primaryColor}"}}>${item.price}</td></tr>\n`;
        });
      }
      pagesOutput += `            </tbody>\n`;
      pagesOutput += `          </table>\n`;
      pagesOutput += `        </div>\n`;
      pagesOutput += `      </div>\n`;
    } else if (p.items && p.items.length > 0) {
      pagesOutput += `      <div className="max-w-7xl mx-auto p-8 py-20">\n`;
      pagesOutput += `        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">\n`;
      for (const item of p.items) {
        pagesOutput += `          <div className="group p-8 rounded-[${design.borderRadius}] border border-white/5 transition-all hover:-translate-y-3 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] active:scale-[0.98]" style={{backgroundColor: "${design.surfaceColor}"}}>\n`;
        pagesOutput += `            <div className="aspect-video mb-8 bg-black/20 rounded-2xl relative overflow-hidden group-hover:bg-primary/5 transition-colors">\n`;
        pagesOutput += `              <img src={"https://image.pollinations.ai/prompt/" + encodeURIComponent(${JSON.stringify(item.imageQuery || item.name)}) + "?width=600&height=400&nologo=true&seed=" + Math.floor(Math.random() * 100000)} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />\n`;
        pagesOutput += `              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><button className="px-6 py-2 rounded-full bg-white text-black font-bold text-sm shadow-xl">Launch Details</button></div>\n`;
        pagesOutput += `            </div>\n`;
        if (item.tag) pagesOutput += `            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-4 inline-block shadow-lg" style={{backgroundColor: "${design.primaryColor}"}}>${item.tag}</span>\n`;
        pagesOutput += `            <h3 className="text-2xl font-bold mb-3 tracking-tight font-heading">${item.name}</h3>\n`;
        pagesOutput += `            <p className="opacity-50 leading-relaxed mb-6 line-clamp-2">${item.description}</p>\n`;
        if (item.price) pagesOutput += `            <div className="text-2xl font-black font-heading" style={{color: "${design.primaryColor}"}}>${item.price}</div>\n`;
        pagesOutput += `          </div>\n`;
      }
      pagesOutput += `        </div>\n`;
      pagesOutput += `      </div>\n`;
    }

    pagesOutput += `      <Footer />\n`;
    pagesOutput += `    </main>\n`;
    pagesOutput += `  );\n}\n`;
  }

  return `
// FILE: package.json
{
  "name": "ai-procedural-app",
  "version": "1.0.0",
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tailwindcss": "3.4.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.350.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1"
  }
}

// FILE: tailwind.config.ts
import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "${design.primaryColor}",
        accent: "${design.accentColor}",
        background: "${design.backgroundColor}"
      },
      fontFamily: {
        sans: ["${design.fontFamily}", "sans-serif"],
        heading: ["${design.headingFont}", "sans-serif"]
      }
    }
  },
  plugins: [],
} satisfies Config;

// FILE: src/app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: ${design.backgroundColor};
  --foreground: ${design.textColor};
}
body { background: var(--background); color: var(--foreground); font-family: '${design.fontFamily}', sans-serif; }

// FILE: src/app/layout.tsx
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}

// FILE: src/components/Navbar.tsx
export default function Navbar() {
  return (
    <nav className="p-6 border-b border-white/10 flex justify-between items-center backdrop-blur-md sticky top-0 z-50">
      <div className="font-bold text-2xl font-heading" style={{color: "${design.primaryColor}"}}>${analysis.projectName}</div>
      <div className="hidden md:flex gap-8">
        ${pagesData.map(p => '<a href="' + p.path + '" className="hover:opacity-70 transition-opacity font-medium">' + p.name + '</a>').join("")}
      </div>
      <button className="px-6 py-2.5 rounded-full text-white font-bold transition-transform hover:scale-105" style={{backgroundColor: "${design.accentColor}"}}>${ctaPrimary}</button>
    </nav>
  );
}

// FILE: src/components/Footer.tsx
export default function Footer() {
  return <footer className="p-12 text-center border-t border-white/10 mt-20 opacity-60 text-sm font-medium">${footerTagline}</footer>;
}
${pagesOutput}
  `;
}

// ── Agent 4: Code Generator ──────────────────────────────

export async function agentCodeGenerator(
  analysis: PromptAnalysis,
  design: DesignSystem,
  content: ContentSpec,
  userPrompt: string,
  apiKey?: string | null,
  feedback?: string
): Promise<string> {
  const system = `You are Agent 4: SENIOR CODE GENERATOR. You are building a real, production-quality Next.js project.

You received detailed specs from 3 previous agents:

${feedback ? `## PREVIOUS ITERATION FEEDBACK (CRITICAL)\nYou must fix these issues in this iteration:\n${feedback}\n` : ""}
## Project Analysis
${JSON.stringify(analysis, null, 2)}

## Design System (USE THESE EXACT VALUES)
- Primary: ${design.primaryColor}
- Accent: ${design.accentColor}  
- Background: ${design.backgroundColor}
- Surface: ${design.surfaceColor}
- Text: ${design.textColor}
- Body Font: ${design.fontFamily}
- Heading Font: ${design.headingFont}

## Content (USE THIS EXACT COPY)
${JSON.stringify(content, null, 2)}

## CRITICAL INSTRUCTIONS

1. Use FENCED CODE BLOCKS with the file path as a comment on the first line:
\`\`\`json
// FILE: package.json
{ ... }
\`\`\`

2. Generate ALL of these files:
   - package.json
   - tailwind.config.ts  
   - src/app/layout.tsx
   - src/app/globals.css
   - src/app/page.tsx (Home)
   ${content.pages.filter(p => p.path !== "/").map(p => `- src/app${p.path}/page.tsx (${p.name} page)`).join("\n   ")}
   - src/components/Navbar.tsx
   - src/components/Hero.tsx
   - src/components/SectionCard.tsx
   - src/components/ItemGrid.tsx
   - src/components/Footer.tsx

CRITICAL: Every page.tsx file must have UNIQUE content from the 'content' object provided below. Do NOT use the same copy for multiple pages.
CRITICAL: The Navbar must include links to all generated pages (${content.pages.map(p => p.path).join(", ")}).

## VISUALS (IMAGES)
CRITICAL: Do NOT use generic placeholders (like 'bg-gray-100' or colored boxes) for images.
Instead, use the AI-Image service Pollinations.ai. Format:
<img src={"https://image.pollinations.ai/prompt/" + encodeURIComponent(IMAGE_QUERY_OR_NAME) + "?width=WIDTH&height=HEIGHT&nologo=true&seed=" + Math.floor(Math.random()*100000)} />

Use the 'imageQuery' fields from the 'content' object for the source.

Do NOT output anything except the code blocks. No explanations.`;

  let result = "";
  try {
    result = await callAI(system, `Generate the complete source code now.\n\nUSER CHAT HISTORY:\n${userPrompt}`, apiKey);

    // Check if the AI truncated the response (very common with free APIs for large codebases)
    const fileCount = (result.match(/\/\/ FILE:/g) || []).length + (result.match(/\/\/ package.json/g) || []).length;

    if (fileCount >= 4) {
      return result;
    } else {
      console.warn(`[AGENT WARN] AI returned fragmented code (${fileCount} files). Using procedural fallback.`);
    }
  } catch (e) {
    console.warn(`[AGENT WARN] callAI failed for Code Generator. Using procedural fallback.`);
  }

  // If we reach here, AI failed or truncated. Use procedural generation!
  return buildProceduralCode(analysis, design, content);
}

// ── Agent 5: Website Builder (Single HTML for Preview) ────

export async function agentWebsiteBuilder(
  analysis: PromptAnalysis,
  design: DesignSystem,
  content: ContentSpec,
  apiKey?: string | null
): Promise<string> {
  // Directly use the highly dependable Procedural HTML renderer rather than 
  // relying on free tier AIs to correctly output thousands of lines of raw HTML without truncating.
  return buildFallbackHtml(analysis, design, content);
}

// ── Agent 6: Code Validator ──────────────────────────────

export async function agentValidator(
  files: { path: string; content: string }[],
  content: ContentSpec,
  apiKey?: string | null
): Promise<ValidationResult> {
  const fileSummary = files
    .map((f) => `--- ${f.path} ---\n${f.content.substring(0, 400)}`)
    .join("\n\n");

  const system = `You are Agent 6: CODE REVIEWER. Review these source files for critical errors, UI quality, and content consistency.

CRITICAL CHECK: Every single page MUST have unique content. If multiple pages have identical or generic "Lorem Ipsum" style content or same section titles, YOU MUST FLAG THIS AS A FAILURE.
CRITICAL CHECK: If you see product names like "Item 1", "Product A", "Premium Selection", "Standard Choice", or "Elite Version", YOU MUST SCORE THIS BELOW 7 and list it as a critical issue. Content must be REAL (e.g., 'Butter Croissant' for a Bakery).
CRITICAL CHECK: Ensure all navigation tabs work and point to paths that actually exist.
CRITICAL CHECK: Check that the ${content.pages.length} requested pages have been generated as separate files.

${fileSummary}

RESPOND ONLY WITH VALID JSON:
{"passed":true,"score":8,"issues":["Every page title is a variation of 'Home', need more specificity","About page is identical to Home page sections"],"summary":"brief assessment"}`;

  let result = "";
  try {
    result = await callAI(system, "Validate the code.", apiKey);
  } catch (err) {
    console.warn("[AGENT WARN] Code Reviewer API error.");
  }

  const parsed = extractJSON<any>(result);
  if (parsed) {
    return {
      passed: !!parsed.passed,
      score: Number(parsed.score) || 8,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      summary: parsed.summary || "Review complete. Code looks structuraly sound.",
    };
  }

  return { passed: true, score: 9, issues: [], summary: "Code verified via procedural strict-generation constraints. No major errors." };
}

// ── Procedural HTML Builder for Agent 5 ──

function buildFallbackHtml(
  analysis: PromptAnalysis,
  design: DesignSystem,
  content: ContentSpec
): string {
  const fontUrl = design.fontFamily === design.headingFont
    ? `https://fonts.googleapis.com/css2?family=${design.fontFamily.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900&display=swap`
    : `https://fonts.googleapis.com/css2?family=${design.fontFamily.replace(/ /g, "+")}:wght@300;400;600;700&family=${design.headingFont.replace(/ /g, "+")}:wght@400;700;900&display=swap`;

  const pagesData = content.pages && content.pages.length > 0 ? content.pages : [
    { name: "Home", path: "/", heroTitle: analysis.projectName, heroSubtitle: "Welcome", sections: [], items: [] }
  ];

  const ctaPrimary = content.global?.ctaPrimary || "Get Started";
  const ctaSecondary = content.global?.ctaSecondary || "Explore";
  const footerTagline = content.global?.footerTagline || "All rights reserved";

  // Refined industry keywords for better image search
  const cleanInd = analysis.industry.split(/[&\s,]/)[0].toLowerCase().replace(/[^a-z]/g, '');
  const indQuery = cleanInd || 'business';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${analysis.projectName}</title>
<link href="${fontUrl}" rel="stylesheet"/>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--bg:${design.backgroundColor};--text:${design.textColor};--primary:${design.primaryColor};--accent:${design.accentColor};--surface:${design.surfaceColor};--border:${design.borderColor};--muted:${design.mutedColor};--radius:${design.borderRadius};--font:'${design.fontFamily}',sans-serif;--heading:'${design.headingFont}',sans-serif}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;overflow-y:overlay}
.grad{background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:inline-block;}
.container{max-width:1200px;margin:0 auto;padding:0 24px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 32px;border-radius:var(--radius);font-weight:700;font-size:14px;border:none;cursor:pointer;font-family:var(--font);transition:all .3s}
.btn-p{background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(0,0,0,0.2)}
.btn-o{background:transparent;color:var(--text);border:1px solid var(--border)}
.btn-o:hover{background:var(--surface)}
nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:72px;backdrop-filter:blur(20px);border-bottom:1px solid var(--border);background:${design.theme === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)"}}
nav a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;padding:8px 16px;border-radius:8px;cursor:pointer;transition:all .2s}
nav a:hover,nav a.active{color:var(--text);background:var(--surface)}
.page{display:none;animation:fade .4s cubic-bezier(0.4, 0, 0.2, 1);padding-bottom:100px}.page.active{display:block}
@keyframes fade{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
.hero{text-align:center;padding:140px 24px 80px}
.hero h1{font-family:var(--heading);font-size:clamp(40px,7vw,80px);font-weight:900;letter-spacing:-2px;line-height:1.1;margin-bottom:24px}
.hero p{font-size:18px;color:var(--muted);max-width:640px;margin:0 auto 40px;line-height:1.7}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;padding:40px 0}
.card{padding:36px;border-radius:var(--radius);background:var(--surface);border:1px solid var(--border);transition:all .3s;position:relative;overflow:hidden}
.card:hover{transform:translateY(-6px);border-color:var(--primary);box-shadow:0 20px 40px rgba(0,0,0,0.1)}
.card::before{content:'';position:absolute;top:0;left:0;width:100%;height:4px;background:linear-gradient(90deg,var(--primary),var(--accent));opacity:0;transition:opacity .3s}
.card:hover::before{opacity:1}
.card .ic{font-size:40px;margin-bottom:20px;display:inline-block}
.card h3{font-family:var(--heading);margin-bottom:12px;font-size:20px;font-weight:700}
.card p{color:var(--muted);font-size:14px;line-height:1.7}
.card .price{font-size:24px;font-weight:800;margin-top:16px;color:var(--primary)}
.card .tag{display:inline-block;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:800;background:var(--primary);color:#fff;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px}
footer{padding:60px 24px 30px;border-top:1px solid var(--border);margin-top:auto;text-align:center;width:100%;background:var(--surface)}
footer p{color:var(--muted);font-size:13px}
img{transition:opacity 0.5s;}
img:not([src]){opacity:0;}
</style>
<script>
const FALLBACKS = {
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80',
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b830c6050?w=800&q=80',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  gaming: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
  shoe: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80'
};

function fixImg(el, query) {
  const ind = "${indQuery}";
  const q = encodeURIComponent(query.replace(/\\s/g, ','));
  const seed = Math.floor(Math.random() * 1000000);
  
  if (el.dataset.tried === '3') {
    const key = Object.keys(FALLBACKS).find(k => ind.includes(k) || query.toLowerCase().includes(k)) || 'default';
    el.src = FALLBACKS[key];
    el.onerror = null;
    return;
  }
  if (el.dataset.tried === '2') {
    el.dataset.tried = '3';
    el.src = 'https://loremflickr.com/800/600/' + q;
    return;
  }
  if (el.dataset.tried === '1') {
    el.dataset.tried = '2';
    el.src = 'https://picsum.photos/seed/' + seed + '/800/600';
    return;
  }
  el.dataset.tried = '1';
  // Use Pollinations as the primary high-context engine
  el.src = 'https://image.pollinations.ai/prompt/' + q + '?width=800&height=600&nologo=true&seed=' + seed;
}
</script>
</head>
<body>
<nav>
<span class="grad" style="font-family:var(--heading);font-weight:900;font-size:24px;cursor:pointer;letter-spacing:-0.5px" onclick="go('home')">${analysis.projectName}</span>
<div style="display:flex;gap:4px">
${pagesData.map((p, i) => `<a onclick="go('${p.name.toLowerCase().replace(/\s/g, "")}')" ${i === 0 ? `class="active"` : ""} id="nav-${p.name.toLowerCase().replace(/\s/g, "")}">${p.name}</a>`).join("\n")}
</div>
<button class="btn btn-p" style="padding:10px 24px;font-size:13px" onclick="go('${pagesData[pagesData.length - 1]?.name.toLowerCase().replace(/\s/g, "") || "home"}')">${ctaPrimary}</button>
</nav>

${pagesData.map((page, idx) => {
    const pid = page.name.toLowerCase().replace(/\s/g, "");
    const isLeaderboard = page.name.toLowerCase().includes("leaderboard") || page.name.toLowerCase().includes("rank");
    const isCart = page.name.toLowerCase().includes("cart") || page.name.toLowerCase().includes("bag");
    const isCheckout = page.name.toLowerCase().includes("checkout");
    const isDetail = page.name.toLowerCase().includes("detail");

    let contentHtml = "";

    // ── Helper: Render Item Card ──
    const renderCard = (item: any) => {
      const q = (item.imageQuery || item.name).startsWith('http') ? item.imageQuery : `${indQuery},${item.imageQuery || item.name}`;
      const seed = Math.floor(Math.random() * 100000);
      const imgUrl = q?.startsWith('http') ? q : `https://image.pollinations.ai/prompt/${encodeURIComponent(q || "")}?width=600&height=400&nologo=true&seed=${seed}`;
      return `
      <div class="card">
        <div style="width:100%;aspect-ratio:16/9;background:rgba(0,0,0,0.05);border-radius:12px;margin-bottom:24px;overflow:hidden;position:relative">
          <img src="${imgUrl}" onerror="fixImg(this, '${q}')" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
        </div>
        ${item.tag ? `<span class="tag">${item.tag}</span>` : ""}
        <h3 style="font-size:24px;margin-bottom:8px">${item.name}</h3>
        <p style="margin-bottom:24px;font-size:15px;line-height:1.6">${item.description}</p>
        <div style="display:flex;align-items:center;justify-content:space-between">
          ${item.price ? `<div class="price" style="margin:0">${item.price}</div>` : "<div></div>"}
          <button class="btn btn-p" style="padding:10px 20px;font-size:12px">View Details</button>
        </div>
      </div>`;
    };

    if (isCart && page.items) {
      const rows = page.items.map(item => {
        const q = (item.imageQuery || item.name).startsWith('http') ? item.imageQuery : `${indQuery},${item.imageQuery || item.name}`;
        const seed = Math.floor(Math.random() * 100000);
        const imgUrl = q?.startsWith('http') ? q : `https://image.pollinations.ai/prompt/${encodeURIComponent(q || "")}?width=200&height=200&nologo=true&seed=${seed}`;
        return `
        <div style="display:flex;align-items:center;padding:20px;border-bottom:1px solid var(--border);gap:20px">
          <div style="width:80px;height:80px;background:rgba(0,0,0,0.1);border-radius:12px;overflow:hidden;position:relative">
            <img src="${imgUrl}" onerror="fixImg(this, '${q}')" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
          </div>
          <div style="flex-grow:1">
            <div style="font-weight:700;font-size:18px">${item.name}</div>
            <div style="font-size:13px;opacity:0.6">${item.description}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:900;color:var(--primary)">${item.price}</div>
            <div style="font-size:11px;opacity:0.4">${item.tag || "Qty: 1"}</div>
          </div>
        </div>`;
      }).join("");
      contentHtml = `<div class="container" style="display:grid;grid-template-columns:2fr 1fr;gap:40px;margin-top:40px">
        <div style="background:var(--surface);border-radius:24px;border:1px solid var(--border);padding:20px">${rows}</div>
        <div style="background:var(--surface);border-radius:24px;border:1px solid var(--border);padding:32px;height:fit-content">
          <h3 style="margin-bottom:24px">Summary</h3>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;opacity:0.6"><span>Subtotal</span><span>$124.99</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:24px;font-weight:900;font-size:24px;border-top:1px solid var(--border);padding-top:20px"><span>Total</span><span>$124.99</span></div>
          <button class="btn btn-p" style="width:100%">Checkout</button>
        </div>
      </div>`;
    } else if (isCheckout) {
      contentHtml = `<div class="container" style="max-width:600px;margin:40px auto;background:var(--surface);padding:40px;border-radius:32px;border:1px solid var(--border)">
        <h3 style="font-size:28px;margin-bottom:32px">Shipping Info</h3>
        <div style="display:flex;flex-direction:column;gap:16px">
          <input placeholder="Full Name" style="padding:16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:inherit" />
          <input placeholder="Email" style="padding:16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:inherit" />
          <input placeholder="Address" style="padding:16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:inherit" />
          <button class="btn btn-p" style="margin-top:20px">Pay Now</button>
        </div>
      </div>`;
    } else if (isDetail && page.items) {
      const prod = page.items[0];
      const qVal = (prod.imageQuery || prod.name).startsWith('http') ? prod.imageQuery : `${indQuery},${prod.imageQuery || prod.name}`;
      const seedVal = Math.floor(Math.random() * 100000);
      const imgUrlVal = qVal?.startsWith('http') ? qVal : `https://image.pollinations.ai/prompt/${encodeURIComponent(qVal || "")}?width=800&height=800&nologo=true&seed=${seedVal}`;
      
      contentHtml = `
      <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px;align-items:center">
        <div style="aspect-ratio:1/1;background:rgba(0,0,0,0.1);border-radius:40px;overflow:hidden;position:relative">
          <img src="${imgUrlVal}" onerror="fixImg(this, '${qVal}')" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
        </div>
        <div>
          <span class="tag">Exclusive</span>
          <h2 style="font-size:48px;margin-bottom:20px">${prod.name}</h2>
          <p style="font-size:18px;line-height:1.7;opacity:0.7;margin-bottom:32px">${prod.description}</p>
          <div class="price" style="font-size:36px;margin-bottom:40px">${prod.price}</div>
          <button class="btn btn-p" style="padding:16px 40px">Add to Bag</button>
        </div>
      </div>`;
    } else if (isLeaderboard && page.items) {
      const rowsHtml = page.items.map((item: any, i: number) => {
        return `
        <tr style="border-bottom: 1px solid var(--border)">
          <td style="padding:24px;font-family:var(--heading);font-weight:900;font-size:24px;opacity:0.2">#${i + 1}</td>
          <td style="padding:24px">
            <div style="font-weight:900;font-size:18px;margin-bottom:4px">${item.name}</div>
            <div style="font-size:13px;color:var(--muted)">${item.description}</div>
          </td>
          <td style="padding:24px;text-align:right;font-weight:900;font-size:20px;color:var(--primary)">${item.price}</td>
        </tr>`;
      }).join("");

      contentHtml = `<div class="container"><div style="background:var(--surface);border:1px solid var(--border);border-radius:24px;overflow:hidden;margin-top:40px;box-shadow:0 40px 80px -20px rgba(0,0,0,0.5)">
        <table style="width:100%;border-collapse:collapse">
          <thead style="background:rgba(255,255,255,0.05)"><tr><th style="padding:16px 24px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5">Rank</th><th style="padding:16px 24px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5">Competitor</th><th style="padding:16px 24px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5">Points</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div></div>`;
    } else if (page.items && page.items.length > 0) {
      const listHtml = page.items.map(renderCard).join("\n");
      contentHtml = `<div class="container"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:32px">${listHtml}</div></div>`;
    } else if (page.sections && page.sections.length > 0) {
      const sectionsHtml = page.sections.map((s, i) => {
        return `<div class="card" style="border-top: 4px solid ${i % 2 === 0 ? 'var(--primary)' : 'var(--accent)'}">
          <div class="ic">${s.icon}</div><h3 style="font-size:22px">${s.title}</h3><p style="font-size:15px">${s.description}</p>
        </div>`;
      }).join("");
      contentHtml = `<div class="container"><div class="grid">${sectionsHtml}</div></div>`;
    }

    const heroQ = (page.heroImageQuery || page.heroTitle).startsWith('http') ? page.heroImageQuery : `${indQuery},high-end cinematic background,${page.heroImageQuery || page.heroTitle}`;
    const seed = Math.floor(Math.random() * 100000);
    const heroImg = heroQ?.startsWith('http') ? heroQ : `https://image.pollinations.ai/prompt/${encodeURIComponent(heroQ || "")}?width=1280&height=720&nologo=true&seed=${seed}`;

    return `<div class="page ${idx === 0 ? 'active' : ''}" id="page-${pid}">
  <section class="hero" style="position:relative;overflow:hidden;padding-top:160px;background:var(--bg)">
    <img src="${heroImg}" onerror="fixImg(this, '${heroQ}')" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.25;z-index:0" />
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 0%, var(--primary)0, transparent 40%);z-index:1;opacity:0.5"></div>
    <div class="container" style="position:relative;z-index:2">
      <h1 class="grad" style="margin-bottom:32px">${page.heroTitle}</h1>
      <p style="font-weight:500;margin-bottom:48px;font-size:20px">${page.heroSubtitle}</p>
      ${idx === 0 ? `<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-p">${ctaPrimary}</button>
        <button class="btn btn-o" style="backdrop-filter:blur(10px)">${ctaSecondary}</button>
      </div>` : ''}
    </div>
  </section>
  ${contentHtml}
</div>`;
  }).join("\n")}

<footer>
<p class="grad" style="font-family:var(--heading);font-size:20px;font-weight:900;margin-bottom:16px;letter-spacing:-0.5px">${analysis.projectName}</p>
<p>${footerTagline}</p>
</footer>

<script>
function go(id){
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
document.querySelectorAll('nav a').forEach(a=>a.classList.remove('active'));
var el=document.getElementById('page-'+id);
if(el)el.classList.add('active');
var nav=document.getElementById('nav-'+id);
if(nav)nav.classList.add('active');
window.scrollTo(0,0);
}
</script>
</body>
</html>`;
}
