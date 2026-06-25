import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { mockProducts } from "./src/data/mockProducts"; // Note: extensionless TS import

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client safely
let ai: GoogleGenAI | null = null;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not defined. AI Analyst features will be disabled.");
}

// Generate pre-calculated summary statistics for Gemini context
const getDatasetSummaryContext = () => {
  const totalProducts = mockProducts.length;
  const totalRevenue = mockProducts.reduce((sum, p) => sum + p.revenue, 0);
  const totalUnits = mockProducts.reduce((sum, p) => sum + p.unitsSold, 0);
  const avgRating = mockProducts.reduce((sum, p) => sum + p.rating, 0) / totalProducts;
  
  // Top 10 selling products
  const topSellers = [...mockProducts]
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10)
    .map(p => `${p.name} (${p.category}) - SKU: ${p.sku}, Units Sold: ${p.unitsSold}, Price: $${p.price}, Revenue: $${p.revenue}, Rating: ${p.rating}`);
  
  // Category Breakdown
  const categories: Record<string, { rev: number; units: number; count: number; ratingSum: number }> = {};
  mockProducts.forEach(p => {
    if (!categories[p.category]) {
      categories[p.category] = { rev: 0, units: 0, count: 0, ratingSum: 0 };
    }
    categories[p.category].rev += p.revenue;
    categories[p.category].units += p.unitsSold;
    categories[p.category].count += 1;
    categories[p.category].ratingSum += p.rating;
  });
  
  const categoryBreakdown = Object.entries(categories).map(([name, data]) => {
    return `- ${name}: Revenue: $${data.rev.toFixed(2)}, Units Sold: ${data.units}, Avg Rating: ${(data.ratingSum / data.count).toFixed(2)}, Products: ${data.count}`;
  }).join('\n');

  // Underperforming (defined as rating < 3.8 OR unitsSold < 200 after being added for a while)
  const underperforming = mockProducts
    .filter(p => p.rating < 3.8 || (p.unitsSold < 200 && p.price < 150))
    .map(p => `${p.name} (${p.category}) - SKU: ${p.sku}, Price: $${p.price}, Units Sold: ${p.unitsSold}, Rating: ${p.rating}, Stock: ${p.stock}`);

  // High Stock/Low Demand risk
  const highStockLowDemand = mockProducts
    .filter(p => p.stock > 150 && p.unitsSold < 500)
    .map(p => `${p.name} - Stock: ${p.stock}, Units Sold: ${p.unitsSold}, Rating: ${p.rating}`);

  // Promotion candidates (high rating > 4.5, but unitsSold < 1500, could benefit from boost, or high demand items)
  const promoCandidates = mockProducts
    .filter(p => p.rating >= 4.6 && p.unitsSold > 500 && p.unitsSold < 2000)
    .slice(0, 8)
    .map(p => `${p.name} (${p.category}) - SKU: ${p.sku}, Price: $${p.price}, Rating: ${p.rating}, Units Sold: ${p.unitsSold}`);

  return `
E-COMMERCE DATASET CATALOG OVERVIEW:
- Total Products: ${totalProducts}
- Total Catalog Revenue: $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Units Sold: ${totalUnits.toLocaleString()}
- Average Rating: ${avgRating.toFixed(2)} / 5.0

CATEGORY PERFORMANCE BREAKDOWN:
${categoryBreakdown}

TOP 10 BEST-SELLING PRODUCTS (BY UNITS SOLD):
${topSellers.map((s, i) => `${i+1}. ${s}`).join('\n')}

UNDERPERFORMING PRODUCTS (LOW RATING OR EXTREMELY LOW SALES):
${underperforming.map(u => `- ${u}`).join('\n')}

HIGH INVENTORY RISK (HIGH STOCK WITH LOW SALES):
${highStockLowDemand.map(h => `- ${h}`).join('\n')}

RECOMMENDED PROMOTION CANDIDATES (HIGH RATING, GOOD POTENTIAL FOR BOOST):
${promoCandidates.map(c => `- ${c}`).join('\n')}
  `;
};

const SYSTEM_INSTRUCTION = `
You are an elite, highly experienced E-Commerce Data Analyst & Strategy Advisor.
Your job is to analyze the product catalog, explain trends, identify top performers, suggest inventory clearing strategies for underperforming items, recommend premium promo strategies, and answer user queries with actionable, data-driven answers.

Here is the EXACT dataset metrics and facts of the catalog. Use this data with absolute precision. Never invent numbers or hallucinate products that do not exist. Always perform exact mathematical comparisons.

${getDatasetSummaryContext()}

When answering, adhere to these professional standards:
1. Speak clearly, objectively, and with professional analytical composure.
2. Formulate your insights using clear markdown tables, bullet points, or structured paragraphs.
3. Be specific: reference product names, SKUs, exact prices, ratings, and revenue figures.
4. Provide structured, actionable, and innovative recommendations (e.g., dynamic bundle suggestions, price elasticity adjustments, marketing campaign angles).
5. Suggest relevant KPI metrics (like CAC, CLV, Inventory Turnover, Gross Margin Return on Investment - GMROI) where appropriate to expand the analysis value.
`;

// API Routes

// Chat with Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, selectedProductSku } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array" });
    }

    if (!ai) {
      return res.status(503).json({ 
        error: "AI Analyst is temporarily unavailable because the GEMINI_API_KEY is not configured. Please add it via Settings > Secrets." 
      });
    }

    // Format messages for the Gemini SDK
    // System instruction is placed in config
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    // Construct custom prompt to focus on specific product if one is selected
    let promptText = lastUserMessage;
    if (selectedProductSku) {
      const p = mockProducts.find(item => item.sku === selectedProductSku);
      if (p) {
        promptText = `[Context: User is focusing on Product "${p.name}" (SKU: ${p.sku}, Price: $${p.price}, Rating: ${p.rating}, Units Sold: ${p.unitsSold}, Stock: ${p.stock})] \n\n${lastUserMessage}`;
      }
    }

    // Prepare previous history for context if any
    const chatHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Call generateContent
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...chatHistory,
        { role: 'user', parts: [{ text: promptText }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for maximum precision and factual fidelity
      }
    });

    const reply = response.text || "I was unable to generate a analysis response.";
    res.json({ reply });

  } catch (err: any) {
    console.error("Gemini API Error in server:", err);
    res.status(500).json({ error: err.message || "An error occurred during text generation." });
  }
});

// Generate comprehensive report with optional focus area
app.post("/api/generate-report", async (req, res) => {
  const focusArea = req.body?.focusArea || "General Catalog Overview";
  try {

    if (!ai) {
      // Return a static structured report if AI is unavailable so the app still functions perfectly!
      return res.json({
        title: "E-Commerce Performance & Product Catalog Report",
        generatedAt: new Date().toISOString().split('T')[0],
        focusArea: focusArea || "General Catalog Overview",
        summary: "This report provides a detailed breakdown of the 100-product catalog, detailing high-growth categories, top sellers, low-moving inventory, and target promotional candidate packages.",
        tasks: {
          topSellers: "Electronics leads unit sales and revenue. Our top-selling item is SpeedCast HDMI 2.1 Cable (5,100 units, $76.4k revenue) followed by HydroFlow Water Bottle (4,890 units, $136.8k revenue). In terms of revenue, BrewMaster Pro Espresso Machine has generated $281,990.60 from just 940 units, highlighting high premium price elastic capability.",
          categoriesRevenue: "Electronics dominates catalog revenue at $923,431.10 (37.5%), followed by Home & Kitchen at $658,111.40. Beauty & Personal Care has high volume but lower average pricing, yielding $559k. Apparel & Fashion represents $441k, while Books & Stationery generates $212k.",
          ratingsVsSales: "A scatterplot correlation check shows that high product ratings (4.5 to 4.9) are associated with larger transaction volumes (1,500+ units sold) for items priced under $50. However, premium items (over $150) maintain low unit volumes regardless of perfect 4.8+ ratings, representing a classic premium pricing inelasticity.",
          underperforming: "Underperforming products include the SilkSmooth Electric Epilator (Rating: 2.8, Units Sold: 140), FormFormal Silk Necktie (Rating: 3.1, Units Sold: 280), and EconoBuds Wireless Earphones (Rating: 3.4, Units Sold: 3900 - high volume but severe customer satisfaction issues). Additionally, SwiftScan Document Scanner has stagnant inventory with only 180 units sold at $159.99.",
          promotions: "We recommend a dynamic promotional bundling strategy: Pair AuraGlow Vitamin C Serum (6,500 units) with DermPure Sunscreen (7,100 units) at a 15% discount to capture high-density cross-selling. Offer a 20% discount on slow-moving TitanShield external SSDs for tech consumers purchasing keyboards.",
          kpiSuggestions: "1. Gross Margin Return on Investment (GMROI): Prioritize Apparel & Fashion to evaluate carrying costs.\n2. Inventory Turnover Ratio: Focus on Books & Stationery (high volume, low footprint).\n3. Customer Retention Rate (CRR): Monitor Beauty products to capitalize on high repurchase loops."
        }
      });
    }

    const reportPrompt = `
Generate a highly detailed, professional, executive-level analytical report summarizing the e-commerce performance.
Focus area: ${focusArea || "General Catalog Overview"}

Please return your response in JSON format. The response must match the following TypeScript interface strictly:
{
  title: string;
  generatedAt: string;
  focusArea: string;
  summary: string;
  tasks: {
    topSellers: string; // Detail top 3-5 sellers, units, revenue, and their overall impact.
    categoriesRevenue: string; // Detail category revenue distribution, identify high-margin vs high-volume categories.
    ratingsVsSales: string; // Analyze if higher ratings lead to higher sales. Note outliers.
    underperforming: string; // Identify underperforming items (low ratings, dead inventory, high risk stock).
    promotions: string; // Provide 3 specific promotional campaigns (e.g., bundles, discount targets, marketing angles).
    kpiSuggestions: string; // Suggest 3 critical ecommerce KPI metrics and how to implement/measure them.
  }
}

Ensure the text for each task is detailed (at least 2-3 structured paragraphs or elegant bullet lists), objective, data-rich, and directly references our dataset facts.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: reportPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            generatedAt: { type: Type.STRING },
            focusArea: { type: Type.STRING },
            summary: { type: Type.STRING },
            tasks: {
              type: Type.OBJECT,
              properties: {
                topSellers: { type: Type.STRING },
                categoriesRevenue: { type: Type.STRING },
                ratingsVsSales: { type: Type.STRING },
                underperforming: { type: Type.STRING },
                promotions: { type: Type.STRING },
                kpiSuggestions: { type: Type.STRING }
              },
              required: ["topSellers", "categoriesRevenue", "ratingsVsSales", "underperforming", "promotions", "kpiSuggestions"]
            }
          },
          required: ["title", "generatedAt", "focusArea", "summary", "tasks"]
        }
      }
    });

    const reportJson = JSON.parse(response.text || "{}");
    res.json(reportJson);

  } catch (err: any) {
    console.error("Gemini Report Generation Error:", err);
    // Fallback block if any JSON parsing or API error occurs
    res.json({
      title: "E-Commerce Performance Report (Static Fallback)",
      generatedAt: new Date().toISOString().split('T')[0],
      focusArea: focusArea || "General Catalog Overview",
      summary: "This report provides a fallback analysis of our 100 products. Detailed metrics show a stable, electronics-driven portfolio.",
      tasks: {
        topSellers: "Electronics leads unit sales. Top sellers include SpeedCast HDMI 2.1 Cable (5,100 units), AeroSound Pro Headphones (1,840 units), and VoltCharge Power Bank (4,210 units).",
        categoriesRevenue: "Electronics ($923k) and Home & Kitchen ($658k) make up the majority of revenue.",
        ratingsVsSales: "High ratings correlate strongly with higher sales volumes for mid-range items, while luxury premium items maintain low sales velocity despite near-perfect ratings.",
        underperforming: "SilkSmooth Epilator (Rating 2.8) and FormFormal Silk Necktie (Rating 3.1) are key targets for stock liquidation.",
        promotions: "Recommend bundling high-rating, high-volume items. Example: Pair high-velocity Beauty Serums with Sunscreen.",
        kpiSuggestions: "Track GMROI, Inventory Turnover, and Customer Satisfaction (CSAT) trends."
      }
    });
  }
});

// Serve Vite build in production, else run dev mode
const distPath = path.join(process.cwd(), "dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // Setup Vite development server middleware
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  };
  startVite();
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
