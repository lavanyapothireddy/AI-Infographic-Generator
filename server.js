require("dotenv").config();
console.log("GROQ KEY:", process.env.GROQ_API_KEY);
const express = require("express");
const cors = require("cors");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ─── THEME CONFIGS ────────────────────────────────────────────────────────────
const THEMES = {
  corporate: {
    bg: "#0f172a",
    card: "#1e293b",
    accent: "#3b82f6",
    accent2: "#06b6d4",
    text: "#f1f5f9",
    muted: "#94a3b8",
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
    headerGrad: "linear-gradient(90deg, #3b82f6, #06b6d4)",
    shadow: "0 4px 24px rgba(59,130,246,0.15)",
  },
  vibrant: {
    bg: "#0d0d0d",
    card: "#1a0533",
    accent: "#f72585",
    accent2: "#7209b7",
    text: "#ffffff",
    muted: "#c77dff",
    gradient: "linear-gradient(135deg, #10002b 0%, #0d0d0d 100%)",
    headerGrad: "linear-gradient(90deg, #f72585, #7209b7)",
    shadow: "0 4px 24px rgba(247,37,133,0.2)",
  },
  nature: {
    bg: "#052e16",
    card: "#064e3b",
    accent: "#34d399",
    accent2: "#a3e635",
    text: "#ecfdf5",
    muted: "#6ee7b7",
    gradient: "linear-gradient(135deg, #064e3b 0%, #052e16 100%)",
    headerGrad: "linear-gradient(90deg, #34d399, #a3e635)",
    shadow: "0 4px 24px rgba(52,211,153,0.15)",
  },
  sunset: {
    bg: "#1c0a00",
    card: "#431407",
    accent: "#fb923c",
    accent2: "#fbbf24",
    text: "#fff7ed",
    muted: "#fdba74",
    gradient: "linear-gradient(135deg, #431407 0%, #1c0a00 100%)",
    headerGrad: "linear-gradient(90deg, #fb923c, #fbbf24)",
    shadow: "0 4px 24px rgba(251,146,60,0.2)",
  },
  minimal: {
    bg: "#fafafa",
    card: "#ffffff",
    accent: "#111827",
    accent2: "#374151",
    text: "#111827",
    muted: "#6b7280",
    gradient: "linear-gradient(135deg, #f3f4f6 0%, #fafafa 100%)",
    headerGrad: "linear-gradient(90deg, #111827, #374151)",
    shadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
};

// ─── ICON MAP ─────────────────────────────────────────────────────────────────
const ICONS = {
  data: "📊", stats: "📈", chart: "📉", money: "💰", finance: "🏦",
  health: "🏥", medical: "💊", heart: "❤️", brain: "🧠", science: "🔬",
  tech: "💻", ai: "🤖", cloud: "☁️", security: "🔐", code: "⌨️",
  education: "🎓", book: "📚", idea: "💡", research: "🔍", learn: "📖",
  business: "💼", team: "👥", growth: "🚀", target: "🎯", award: "🏆",
  environment: "🌍", energy: "⚡", recycle: "♻️", water: "💧", tree: "🌳",
  food: "🍎", nutrition: "🥗", fitness: "🏋️", sport: "⚽", travel: "✈️",
  default: "✦",
};

function getIcon(text) {
  const t = text.toLowerCase();
  for (const [key, icon] of Object.entries(ICONS)) {
    if (t.includes(key)) return icon;
  }
  return ICONS.default;
}


// ─── AI GENERATION ROUTE ─────────────────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  const { topic, style = "corporate", pointCount = 6, audience = "general" } = req.body;

  if (!topic) return res.status(400).json({ error: "Topic is required" });

  const theme = THEMES[style] || THEMES.corporate;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert infographic content creator. Generate structured, insightful infographic content in valid JSON only. No markdown, no explanation — pure JSON.`,
        },
        {
          role: "user",
          content: `Create an infographic about: "${topic}"
Target audience: ${audience}
Number of key points: ${pointCount}

Return ONLY this JSON structure:
{
  "title": "Compelling infographic title (max 8 words)",
  "subtitle": "One powerful insight sentence about ${topic}",
  "introduction": "2-3 sentence overview that hooks the reader",
  "keyPoints": [
    {
      "icon_keyword": "one keyword from: data,stats,money,health,tech,education,business,growth,target,environment,food,science,ai,security",
      "title": "Short bold point title",
      "description": "2 sentence explanation with a specific fact or number",
      "stat": "A specific number or percentage (e.g. 73% or $2.4B or 10x)"
    }
  ],
  "quickFacts": ["Fact 1 with number", "Fact 2 with number", "Fact 3 with number"],
  "callToAction": "One memorable takeaway sentence",
  "sources": "Brief source hint (e.g. 'Data: WHO 2024, World Bank')"
}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1800,
    });

    let raw = completion.choices[0]?.message?.content || "{}";

    // Clean JSON from any markdown fences
    raw = raw.replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON. Please try again." });
    }

    // ─── BUILD HTML INFOGRAPHIC ──────────────────────────────────────────────
    const points = (data.keyPoints || []).slice(0, pointCount);
    const facts = (data.quickFacts || []).slice(0, 4);

    const pointsHTML = points.map((p, i) => {
      const icon = getIcon(p.icon_keyword || p.title || "");
      return `
        <div class="point-card" style="animation-delay:${0.1 * i}s">
          <div class="point-header">
            <span class="point-icon">${icon}</span>
            <span class="point-stat">${p.stat || ""}</span>
          </div>
          <h3 class="point-title">${p.title || ""}</h3>
          <p class="point-desc">${p.description || ""}</p>
        </div>`;
    }).join("");

    const factsHTML = facts.map(f => `
      <div class="fact-item">
        <span class="fact-bullet">◆</span>
        <span>${f}</span>
      </div>`).join("");

    const infographicHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${data.title || topic} — Infographic</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:${theme.bg};--card:${theme.card};--accent:${theme.accent};
    --accent2:${theme.accent2};--text:${theme.text};--muted:${theme.muted};
    --shadow:${theme.shadow};
  }
  body{
    background:${theme.gradient};
    color:var(--text);
    font-family:'DM Sans',sans-serif;
    min-height:100vh;
    padding:2rem 1rem 4rem;
  }
  .infographic{
    max-width:900px;margin:0 auto;
    display:flex;flex-direction:column;gap:1.5rem;
  }

  /* HEADER */
  .header{
    background:var(--card);
    border-radius:20px;
    padding:2.5rem 2.5rem 2rem;
    position:relative;overflow:hidden;
    box-shadow:var(--shadow);
    border:1px solid rgba(255,255,255,0.07);
  }
  .header::before{
    content:'';position:absolute;top:0;left:0;right:0;height:4px;
    background:${theme.headerGrad};
  }
  .header-tag{
    display:inline-block;
    background:${theme.headerGrad};
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    font-family:'Syne',sans-serif;font-size:.75rem;font-weight:700;
    letter-spacing:.2em;text-transform:uppercase;margin-bottom:.75rem;
  }
  .header h1{
    font-family:'Syne',sans-serif;font-size:clamp(1.6rem,4vw,2.6rem);
    font-weight:800;line-height:1.15;margin-bottom:.75rem;
  }
  .header .subtitle{
    font-size:1.05rem;color:var(--muted);font-weight:300;
    max-width:600px;line-height:1.6;
  }
  .header-deco{
    position:absolute;right:-20px;top:-20px;width:180px;height:180px;
    background:${theme.headerGrad};border-radius:50%;opacity:0.06;
    pointer-events:none;
  }

  /* INTRO */
  .intro{
    background:var(--card);border-radius:16px;padding:1.75rem 2rem;
    border-left:4px solid var(--accent);box-shadow:var(--shadow);
    font-size:1rem;line-height:1.75;color:var(--muted);
    border:1px solid rgba(255,255,255,0.06);
    border-left:4px solid var(--accent);
  }

  /* GRID */
  .points-grid{
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
    gap:1rem;
  }
  .point-card{
    background:var(--card);border-radius:16px;padding:1.5rem;
    box-shadow:var(--shadow);
    border:1px solid rgba(255,255,255,0.07);
    transition:transform .2s ease;
    animation:fadeUp .5s both;
  }
  .point-card:hover{transform:translateY(-4px)}
  .point-header{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:.85rem;
  }
  .point-icon{font-size:1.8rem;line-height:1}
  .point-stat{
    font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
    background:${theme.headerGrad};
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  }
  .point-title{
    font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;
    margin-bottom:.5rem;line-height:1.3;
  }
  .point-desc{font-size:.875rem;color:var(--muted);line-height:1.65}

  /* FACTS BAR */
  .facts{
    background:var(--card);border-radius:16px;padding:1.75rem 2rem;
    box-shadow:var(--shadow);border:1px solid rgba(255,255,255,0.07);
  }
  .facts-title{
    font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;
    letter-spacing:.2em;text-transform:uppercase;
    color:var(--accent);margin-bottom:1.1rem;
  }
  .facts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.6rem}
  .fact-item{display:flex;align-items:flex-start;gap:.6rem;font-size:.875rem;color:var(--muted)}
  .fact-bullet{color:var(--accent);flex-shrink:0;margin-top:2px;font-size:.6rem}

  /* CTA */
  .cta{
    background:${theme.headerGrad};
    border-radius:16px;padding:1.75rem 2rem;text-align:center;
    box-shadow:var(--shadow);
  }
  .cta p{
    font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;
    color:#fff;line-height:1.5;
  }

  /* FOOTER */
  .footer{
    text-align:center;font-size:.75rem;color:var(--muted);opacity:.6;
    padding-top:.5rem;
  }

  @keyframes fadeUp{
    from{opacity:0;transform:translateY(20px)}
    to{opacity:1;transform:translateY(0)}
  }

  /* Print / PNG export */
  @media print{
    body{background:var(--bg)!important;-webkit-print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="infographic">
  <div class="header">
    <div class="header-deco"></div>
    <div class="header-tag">📊 AI Infographic</div>
    <h1>${data.title || topic}</h1>
    <p class="subtitle">${data.subtitle || ""}</p>
  </div>

  ${data.introduction ? `<div class="intro">${data.introduction}</div>` : ""}

  <div class="points-grid">${pointsHTML}</div>

  ${facts.length ? `
  <div class="facts">
    <div class="facts-title">⚡ Quick Facts</div>
    <div class="facts-grid">${factsHTML}</div>
  </div>` : ""}

  ${data.callToAction ? `
  <div class="cta">
    <p>💡 ${data.callToAction}</p>
  </div>` : ""}

  <div class="footer">${data.sources || ""} · Generated by AI Infographic Generator</div>
</div>
</body>
</html>`;

    res.json({
      success: true,
      infographicHTML,
      data,
      theme: style,
    });
  } catch (err) {
    console.error("Groq error:", err.message);
    res.status(500).json({ error: "AI generation failed. Check your GROQ_API_KEY." });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
});

// ─── SERVE FRONTEND ───────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 AI Infographic Generator running on http://localhost:${PORT}`);
});
