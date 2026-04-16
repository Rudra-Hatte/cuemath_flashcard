import OpenAI from "openai";
import { env } from "../config/env.js";

const SYSTEM_PROMPT = `You are an expert math teacher. Create high-quality adaptive flashcards from source material.
Return strict JSON with key "cards" and each card containing:
- type: concept | step_problem | mistake | application | reverse
- concept
- question
- answer (for non-step card)
- steps (array for step_problem)
- hint
- commonError (for mistake cards)
- explanation
- difficulty (1-5)
- tags (array)
Generate 20 cards with mixed types and realistic math pedagogy.`;

function fallbackCards(topic, sourceText) {
  const snippet = sourceText.slice(0, 250);
  return [
    {
      type: "concept",
      concept: topic,
      question: `What is the core idea behind ${topic}?`,
      answer: `The core idea is to identify structure and apply the correct rules systematically.`,
      steps: [],
      hint: "Think about definition, formula, and when to use it.",
      commonError: "",
      explanation: `Use this source reminder: ${snippet}`,
      difficulty: 2,
      tags: [topic, "definition"]
    },
    {
      type: "step_problem",
      concept: topic,
      question: `Solve a representative ${topic} problem step by step.`,
      answer: "",
      steps: [
        "Identify knowns and unknowns.",
        "Write the governing equation.",
        "Substitute values and simplify carefully.",
        "Check units/signs and verify reasonableness."
      ],
      hint: "Do not skip algebraic simplification.",
      commonError: "",
      explanation: "Step discipline reduces careless errors.",
      difficulty: 3,
      tags: [topic, "process"]
    },
    {
      type: "mistake",
      concept: topic,
      question: `Common trap in ${topic}: what often goes wrong?`,
      answer: "Students often apply the right formula with sign or arithmetic mistakes.",
      steps: [],
      hint: "Track minus signs line by line.",
      commonError: "Sign handling in intermediate simplification.",
      explanation: "Re-check every distribution and subtraction.",
      difficulty: 3,
      tags: [topic, "mistake-pattern"]
    }
  ];
}

export async function generateCardsWithAi({ topic, sourceText }) {
  if (!env.openAiApiKey) {
    return fallbackCards(topic, sourceText);
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const userPrompt = `Topic: ${topic}\nSource:\n${sourceText.slice(0, 12000)}`;

  const completion = await client.chat.completions.create({
    model: env.openAiModel,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  });

  const raw = completion.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.cards) ? parsed.cards : fallbackCards(topic, sourceText);
}
