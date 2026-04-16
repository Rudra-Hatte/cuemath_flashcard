import mongoose from "mongoose";

const reviewEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: "Card", required: true, index: true },
    deckId: { type: mongoose.Schema.Types.ObjectId, ref: "Deck", required: true, index: true },
    isCorrect: { type: Boolean, required: true },
    confidence: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true
    },
    timeTakenSeconds: { type: Number, default: 0 },
    reviewMode: {
      type: String,
      enum: ["flashcard", "mcq"],
      default: "flashcard"
    },
    selectedOptionIndex: { type: Number, default: null },
    selectedOptionText: { type: String, default: "" },
    mistakeType: {
      type: String,
      enum: ["none", "concept", "calculation", "careless"],
      default: "none"
    }
  },
  { timestamps: true }
);

export const ReviewEvent = mongoose.model("ReviewEvent", reviewEventSchema);
