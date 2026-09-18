import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // CORS Headers (Frontend ko block hone se bachane ke liye)
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY missing" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { prompt, contents, model } = req.body || {};
    const inputContent = contents || prompt || "Provide legal assistance under BNS.";

    // FIX 1: 8-Second Vercel Timeout Prevention
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new Error("VERCEL_TIMEOUT_PREVENTION")), 8000);
    });

    // FIX 2: Correct Model Name (gemini-1.5-flash)
    const apiCallPromise = ai.models.generateContent({
      model: model === "gemini-2.5-flash" ? "gemini-1.5-flash" : (model || "gemini-1.5-flash"),
      contents: inputContent,
    });

    // Race condition: Jo pehle complete hoga (API ya Timeout)
    const response: any = await Promise.race([apiCallPromise, timeoutPromise]);

    return res.status(200).json({
      text: response.text,
      candidates: response.candidates,
      result: response.text
    });

  } catch (error: any) {
    console.error("Generate Content Error:", error.message);

    // FIX 3: Timeout hone par crash nahi hoga, safe JSON message jayega
    if (error.message === "VERCEL_TIMEOUT_PREVENTION") {
      const busyMessage = "⚠️ **सर्वर अतिव्यस्त है (Server Busy)**\n\nअभी AI सर्वर पर बहुत अधिक लोड है या Vercel Timeout हो गया है। कृपया 1-2 मिनट बाद दोबारा प्रयास करें।";
      return res.status(200).json({
        text: busyMessage,
        result: busyMessage,
        error: "Timeout"
      });
    }

    return res.status(500).json({ error: error.message });
  }
}
