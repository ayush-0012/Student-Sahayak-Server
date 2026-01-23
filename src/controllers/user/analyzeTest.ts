import { Request, Response } from "express";
import OpenAI from "openai";

interface AnswerObject {
  question: string;
  phase: string;
  answer: string;
}

interface AnalyzeTestRequest {
  answers: AnswerObject[];
}

// Gemini removed — using GROQ/OpenAI-compatible client only

// Initialize GROQ/OpenAI-compatible client (used for Groq's OpenAI-compatible API)
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
});

// Call GROQ via the OpenAI-compatible client. Uses `responses.create` as in
// Groq docs. Set env `GROQ_API_KEY` and optionally `GROQ_MODEL`.
async function callGroq(prompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error("Groq not configured");

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  const resp = await groqClient.responses.create({
    model,
    input: prompt,
  });

  // Preferred: `output_text` (simple), otherwise attempt to extract common shapes
  // `resp` can be large/structured — handle gracefully
  // @ts-ignore - runtime shape varies
  if (
    (resp as any).output_text &&
    typeof (resp as any).output_text === "string"
  ) {
    return (resp as any).output_text;
  }

  const out = (resp as any).output;
  if (Array.isArray(out) && out[0]) {
    const first = out[0];
    if (typeof first === "string") return first;
    if (
      first?.content &&
      Array.isArray(first.content) &&
      first.content[0]?.text
    )
      return first.content[0].text;
    if (first?.text) return first.text;
  }

  // Fallback: stringify the response
  try {
    return JSON.stringify(resp);
  } catch {
    return String(resp);
  }
}

export const analyzeTest = async (req: Request, res: Response) => {
  try {
    console.log("📥 Received analyze-test request");
    const { answers } = req.body as AnalyzeTestRequest;
    console.log(`📊 Number of answers received: ${answers?.length || 0}`);

    // Validate request
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      console.log("❌ Validation failed: Invalid answers array");
      return res.status(400).json({
        error: "Invalid request. 'answers' array is required.",
      });
    }

    // Check if GROQ API key is configured
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ API key is not configured.",
      });
    }

    // Format the answers for the prompt
    const formattedAnswers = answers
      .map(
        (qa, index) =>
          `${index + 1}. Phase: ${qa.phase}\n   Q: ${qa.question}\n   A: ${qa.answer}`
      )
      .join("\n\n");

    // Create the prompt for Gemini
    const prompt = `You are a brutally honest reality-check analyst for students preparing for competitive exams. Your job is to analyze their study habits and give them a wake-up call if needed.

The student has answered 17 critical questions about their preparation across 4 phases:
1. The Routine & Efficiency Trap
2. The Physical & Mental Decay
3. The Strategic Failure
4. The Heavy Hits (Emotional Closer)

Here are the student's responses:

${formattedAnswers}

Based on these answers, provide a harsh, honest reality check in 3-4 paragraphs. Your response should:

1. **Identify the core problems**: Point out the specific areas where they're failing or lying to themselves
2. **Connect the dots**: Show how their habits are interconnected and creating a vicious cycle
3. **Reality check**: Be brutally honest about where they stand and what will happen if they don't change
4. **Urgency**: Make them feel the weight of time slipping away and opportunities being lost

Write in a direct, no-nonsense tone that cuts through self-deception. Use "you" to address them directly. Make it personal, uncomfortable, and impossible to ignore. The goal is to shake them out of complacency, not to comfort them.

Do NOT:
- Sugarcoat anything
- Give generic motivational advice
- Use phrases like "it's okay" or "you can do it"
- List out actionable steps (save that for later)

Focus on making them confront the truth about their current situation. Write 3-4 paragraphs only.`;

    // Use GROQ/OpenAI-compatible client to generate content
    console.log("🤖 Calling GROQ API...");
    const message = await callGroq(prompt);
    console.log("✅ GROQ response received");
    console.log("─".repeat(50));
    console.log(message);
    console.log("─".repeat(50));

    // Return the response
    return res.status(200).json({ message: message });
  } catch (error: any) {
    console.error("❌ Error analyzing test:", error);
    console.error("Error details:", error.message);
    const errMsg = error?.message || "Unknown error";

    // Detect quota / rate-limit errors from Gemini and return a clear message
    if (
      errMsg.toLowerCase().includes("quota") ||
      errMsg.includes("Too Many Requests")
    ) {
      return res.status(503).json({
        message:
          "AI service quota exceeded. Please try again in a few minutes.",
        error: "Gemini quota exceeded",
        details: errMsg,
      });
    }

    return res.status(500).json({
      message: "Failed to analyze test responses.",
      error: "Analyze test failed",
      details: errMsg,
    });
  }
};
