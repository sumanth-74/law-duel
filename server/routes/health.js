import express from "express";
import OpenAI from "openai";

const router = express.Router();

router.get("/health/openai", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "Missing OPENAI_API_KEY" });
    }
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Simple test to verify OpenAI connectivity
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5
    });
    
    return res.json({ 
      ok: true, 
      text: resp.choices[0].message.content?.slice(0, 20) || "ok",
      model: resp.model
    });
  } catch (e) {
    console.error("OpenAI health check failed:", e);
    return res.status(e.status || 500).json({ 
      ok: false, 
      status: e.status, 
      error: e.message, 
      detail: e.response?.data 
    });
  }
});

export default router;