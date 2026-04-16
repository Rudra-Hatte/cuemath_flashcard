export function buildConceptGraph(cards) {
  const nodes = new Map();
  const edges = [];

  cards.forEach((card) => {
    const concept = card.concept || "General";
    if (!nodes.has(concept)) {
      nodes.set(concept, { id: concept, label: concept, count: 0 });
    }
    nodes.get(concept).count += 1;

    (card.tags || []).forEach((tag) => {
      if (!nodes.has(tag)) {
        nodes.set(tag, { id: tag, label: tag, count: 0 });
      }
      nodes.get(tag).count += 1;
      edges.push({ from: concept, to: tag, weight: 1 });
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}
