import express from "express";
import { Card } from "../models/Card.js";
import { Progress } from "../models/Progress.js";
import { ReviewEvent } from "../models/ReviewEvent.js";
import { buildConceptGraph } from "../services/conceptGraphService.js";

const router = express.Router();

router.get("/deck/:deckId", async (req, res) => {
  const { deckId } = req.params;
  const cards = await Card.find({ deckId }).lean();
  const cardIds = cards.map((c) => c._id);
  const progress = await Progress.find({ cardId: { $in: cardIds } }).lean();
  const reviews = await ReviewEvent.find({ deckId }).sort({ createdAt: -1 }).limit(1000).lean();

  const attempts = progress.reduce((sum, p) => sum + (p.totalAttempts || 0), 0);
  const correct = progress.reduce((sum, p) => sum + (p.correctAttempts || 0), 0);
  const accuracy = attempts ? Number(((correct / attempts) * 100).toFixed(1)) : 0;

  const mistakeSummary = reviews.reduce(
    (acc, review) => {
      if (!review.isCorrect) {
        acc[review.mistakeType] = (acc[review.mistakeType] || 0) + 1;
      }
      return acc;
    },
    { concept: 0, calculation: 0, careless: 0, none: 0 }
  );

  const conceptGraph = buildConceptGraph(cards);

  return res.json({
    totalCards: cards.length,
    attempts,
    correct,
    accuracy,
    mistakeSummary,
    conceptGraph
  });
});

export default router;
