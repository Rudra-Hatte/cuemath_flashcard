import express from "express";
import { Progress } from "../models/Progress.js";
import { Card } from "../models/Card.js";
import { ReviewEvent } from "../models/ReviewEvent.js";
import { computeNextSm2State } from "../services/sm2Service.js";

const router = express.Router();

router.post("/submit", async (req, res) => {
  try {
    const { cardId, isCorrect, confidence, timeTakenSeconds, mistakeType } = req.body;
    if (!cardId || typeof isCorrect !== "boolean" || !confidence) {
      return res.status(400).json({
        error: "cardId, isCorrect(boolean), confidence(easy|medium|hard) are required"
      });
    }

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    const existing = await Progress.findOne({ cardId });
    const next = computeNextSm2State({
      prev: existing,
      isCorrect,
      confidence,
      timeTakenSeconds: Number(timeTakenSeconds || 0),
      mistakeType: mistakeType || "none"
    });

    const progress = await Progress.findOneAndUpdate(
      { cardId },
      {
        cardId,
        repetitions: next.repetitions,
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: new Date(),
        $inc: {
          totalAttempts: 1,
          correctAttempts: isCorrect ? 1 : 0
        }
      },
      { upsert: true, new: true }
    );

    await ReviewEvent.create({
      cardId,
      deckId: card.deckId,
      isCorrect,
      confidence,
      timeTakenSeconds: Number(timeTakenSeconds || 0),
      mistakeType: mistakeType || "none"
    });

    return res.json({ progress });
  } catch (error) {
    return res.status(500).json({ error: "Failed to submit review", detail: error.message });
  }
});

router.get("/due/:deckId", async (req, res) => {
  const cards = await Card.find({ deckId: req.params.deckId }).lean();
  const cardIds = cards.map((c) => c._id);
  const progressRows = await Progress.find({ cardId: { $in: cardIds } }).lean();
  const progressByCard = new Map(progressRows.map((p) => [String(p.cardId), p]));
  const now = new Date();

  const ranked = cards
    .map((card) => {
      const p = progressByCard.get(String(card._id));
      const due = !p || new Date(p.nextReviewAt) <= now;
      const urgency = !p
        ? 2
        : p.nextReviewAt <= now
          ? 1
          : 0;

      return {
        ...card,
        due,
        urgency,
        progress: p || null
      };
    })
    .sort((a, b) => b.urgency - a.urgency || a.difficulty - b.difficulty);

  return res.json(ranked);
});

export default router;
