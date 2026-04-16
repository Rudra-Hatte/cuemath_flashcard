export function computeMistakePriority(mistakeType, isCorrect) {
  if (isCorrect) {
    return 0;
  }

  if (mistakeType === "concept") {
    return 3;
  }

  if (mistakeType === "calculation") {
    return 2;
  }

  if (mistakeType === "careless") {
    return 1;
  }

  return 1;
}
