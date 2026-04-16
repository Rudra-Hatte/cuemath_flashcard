import express from "express";
import { Deck } from "../models/Deck.js";
import { Card } from "../models/Card.js";
import { generateCardsWithAi } from "../services/aiService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { subject, topic, sourceText } = req.body;
    if (!subject || !topic || !sourceText) {
      return res.status(400).json({ error: "subject, topic, sourceText are required" });
    }

    const deck = await Deck.create({ subject, topic, sourceText });
    return res.status(201).json(deck);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create deck", detail: error.message });
  }
});

router.get("/", async (_req, res) => {
  const decks = await Deck.find().sort({ createdAt: -1 }).lean();
  return res.json(decks);
});

router.get("/:deckId/cards", async (req, res) => {
  const cards = await Card.find({ deckId: req.params.deckId }).sort({ createdAt: 1 }).lean();
  return res.json(cards);
});

router.post("/generate", async (req, res) => {
  try {
    const { deckId } = req.body;
    if (!deckId) {
      return res.status(400).json({ error: "deckId is required" });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }

    const generated = await generateCardsWithAi({ topic: deck.topic, sourceText: deck.sourceText });

    await Card.deleteMany({ deckId: deck._id });

    const cards = await Card.insertMany(
      generated.map((card) => {
        const options = Array.isArray(card.options)
          ? card.options.filter((opt) => typeof opt === "string" && opt.trim()).map((opt) => opt.trim())
          : [];
        const hasValidCorrectIndex = Number.isInteger(card.correctOptionIndex)
          && card.correctOptionIndex >= 0
          && card.correctOptionIndex < options.length;
        const isMcq = Boolean(card.isMcq) || (options.length >= 2 && hasValidCorrectIndex);

        return {
          deckId: deck._id,
          type: card.type,
          concept: card.concept || deck.topic,
          question: card.question,
          answer: card.answer || (isMcq && hasValidCorrectIndex ? options[card.correctOptionIndex] : ""),
          steps: Array.isArray(card.steps) ? card.steps : [],
          hint: card.hint || "",
          commonError: card.commonError || "",
          explanation: card.explanation || "",
          isMcq,
          options,
          correctOptionIndex: isMcq && hasValidCorrectIndex ? card.correctOptionIndex : -1,
          difficulty: Number(card.difficulty || 3),
          tags: Array.isArray(card.tags) ? card.tags : []
        };
      })
    );

    return res.json({ count: cards.length, cards });
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate cards", detail: error.message });
  }
});

export default router;
