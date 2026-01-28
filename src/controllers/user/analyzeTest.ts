import { Request, Response } from "express";
import OpenAI from "openai";

interface AnswerObject {
  question: string;
  block: string;
  answer: string;
  points: number;
}

interface AnalyzeTestRequest {
  answers: AnswerObject[];
  totalScore: number;
  maxScore: number;
  percentage: string;
  status: string;
}

// Initialize GROQ/OpenAI-compatible client
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
});

// Call GROQ via the OpenAI-compatible client
async function callGroq(prompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error("Groq not configured");

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  const resp = await groqClient.responses.create({
    model,
    input: prompt,
  });

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

  try {
    return JSON.stringify(resp);
  } catch {
    return String(resp);
  }
}

export const analyzeTest = async (req: Request, res: Response) => {
  try {
    console.log("📥 Received analyze-test request");
    const { answers, totalScore, maxScore, percentage, status } =
      req.body as AnalyzeTestRequest;
    console.log(`📊 Number of answers received: ${answers?.length || 0}`);
    console.log(`🎯 Score: ${totalScore}/${maxScore} (${percentage}%)`);
    console.log(`📈 Status: ${status}`);

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

    // Analyze answers by block
    const blockAnalysis: {
      [key: string]: { total: number; scored: number; questions: number };
    } = {};

    answers.forEach((qa) => {
      if (!blockAnalysis[qa.block]) {
        blockAnalysis[qa.block] = { total: 0, scored: 0, questions: 0 };
      }
      blockAnalysis[qa.block].scored += qa.points;
      blockAnalysis[qa.block].total += 5; // Max points per question
      blockAnalysis[qa.block].questions += 1;
    });

    // Find weakest areas (blocks with lowest percentage)
    const weakAreas = Object.entries(blockAnalysis)
      .map(([block, data]) => ({
        block,
        percentage: ((data.scored / data.total) * 100).toFixed(0),
        scored: data.scored,
        total: data.total,
      }))
      .sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage))
      .slice(0, 3);

    // Format weak areas for prompt
    const weakAreasText = weakAreas
      .map(
        (area) =>
          `- ${area.block}: ${area.scored}/${area.total} (${area.percentage}%)`
      )
      .join("\n");

    // Format specific low-scoring answers
    const criticalAnswers = answers
      .filter((qa) => qa.points === 0)
      .slice(0, 5)
      .map((qa) => `• ${qa.question}\n  Answer: ${qa.answer}`)
      .join("\n\n");

    // Create the prompt for AI
    const prompt = `You are analyzing a student's preparation DNA test for competitive exams. They scored ${totalScore}/${maxScore} (${percentage}%), which categorizes them as "${status}".

SCORE BREAKDOWN BY BLOCK:
${Object.entries(blockAnalysis)
  .map(
    ([block, data]) =>
      `${block}: ${data.scored}/${data.total} (${((data.scored / data.total) * 100).toFixed(0)}%)`
  )
  .join("\n")}

WEAKEST AREAS:
${weakAreasText}

${
  criticalAnswers
    ? `CRITICAL GAPS (0-point answers):
${criticalAnswers}`
    : ""
}

Based on this data, provide a brutally honest, personalized reality check in 3-4 paragraphs:

1. **The Hard Truth**: Point out their specific weaknesses based on the blocks where they scored lowest. Be direct about what these gaps mean for their exam chances.

2. **The Hidden Pattern**: Connect the dots between their weak areas. Show how these deficiencies create a vicious cycle that's sabotaging their preparation.

3. **The Reality of Time**: Make them understand the urgency. With their current score category of "${status}", what does their future look like if nothing changes?

4. **The Wake-Up Call**: End with a stark comparison - where they are vs. where the top 1% operates. Make it impossible to ignore the gap.

Write in a direct, no-nonsense Hindi-English mix tone that Indian students relate to. Use "you" to address them. Be brutally honest but not demotivating - the goal is to shock them into action, not crush their spirit.

Do NOT:
- Give generic advice
- List solutions (that comes later)
- Use motivational clichés
- Sugarcoat the reality

Focus on making them FEEL the weight of their current situation through specific insights from their test responses. Keep it to 3-4 powerful paragraphs.`;

    console.log("🤖 Calling GROQ API...");
    const message = await callGroq(prompt);
    console.log("✅ GROQ response received");
    console.log("─".repeat(50));
    console.log(message);
    console.log("─".repeat(50));

    // Return the response
    return res.status(200).json({
      message: message,
      score: {
        total: totalScore,
        max: maxScore,
        percentage: percentage,
        status: status,
      },
      blockAnalysis: Object.entries(blockAnalysis).map(([block, data]) => ({
        block,
        scored: data.scored,
        total: data.total,
        percentage: ((data.scored / data.total) * 100).toFixed(0),
      })),
    });
  } catch (error: any) {
    console.error("❌ Error analyzing test:", error);
    console.error("Error details:", error.message);
    const errMsg = error?.message || "Unknown error";

    if (
      errMsg.toLowerCase().includes("quota") ||
      errMsg.includes("Too Many Requests")
    ) {
      return res.status(503).json({
        message:
          "AI service quota exceeded. Please try again in a few minutes.",
        error: "API quota exceeded",
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
