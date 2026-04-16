import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: "Card", required: true, unique: true },
    repetitions: { type: Number, default: 0 },
    intervalDays: { type: Number, default: 1 },
    easeFactor: { type: Number, default: 2.5 },
    nextReviewAt: { type: Date, default: () => new Date() },
    lastReviewedAt: { type: Date, default: null },
    totalAttempts: { type: Number, default: 0 },
    correctAttempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Progress = mongoose.model("Progress", progressSchema);
