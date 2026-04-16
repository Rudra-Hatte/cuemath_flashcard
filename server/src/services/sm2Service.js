const CONFIDENCE_TO_QUALITY = {
  easy: 5,
  medium: 4,
  hard: 2
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function computeNextSm2State({
  prev,
  isCorrect,
  confidence,
  timeTakenSeconds,
  mistakeType
}) {
  const previous = prev || {
    repetitions: 0,
    intervalDays: 1,
    easeFactor: 2.5
  };

  let quality = CONFIDENCE_TO_QUALITY[confidence] ?? 3;

  if (!isCorrect) {
    quality = 1;
  }

  if (timeTakenSeconds > 120) {
    quality -= 1;
  }

  if (mistakeType && mistakeType !== "none") {
    quality -= 1;
  }

  quality = clamp(quality, 0, 5);

  let repetitions = previous.repetitions;
  let intervalDays = previous.intervalDays;
  let easeFactor = previous.easeFactor;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = clamp(easeFactor, 1.3, 2.8);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return {
    repetitions,
    intervalDays,
    easeFactor,
    nextReviewAt
  };
}
