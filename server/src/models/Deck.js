import mongoose from "mongoose";

const deckSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    sourceText: { type: String, required: true }
  },
  { timestamps: true }
);

export const Deck = mongoose.model("Deck", deckSchema);
