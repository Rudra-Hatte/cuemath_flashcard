import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
  {
    deckId: { type: mongoose.Schema.Types.ObjectId, ref: "Deck", required: true, index: true },
    type: {
      type: String,
      enum: ["concept", "step_problem", "mistake", "application", "reverse"],
      required: true
    },
    concept: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
    steps: { type: [String], default: [] },
    hint: { type: String, default: "" },
    commonError: { type: String, default: "" },
    explanation: { type: String, default: "" },
    difficulty: { type: Number, default: 3, min: 1, max: 5 },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);

export const Card = mongoose.model("Card", cardSchema);
