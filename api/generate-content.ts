import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY missing" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { prompt, contents, model } = req.body || {};
    const inputContent = contents || prompt || "Provide legal assistance under BNS.";

    const response = await ai.models.generateContent({
      model: model || "gemini-2.5-flash",
      contents: inputContent,
    });

    return res.status(200).json({
      text: response.text,
      candidates: response.candidates,
      result: response.text
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
