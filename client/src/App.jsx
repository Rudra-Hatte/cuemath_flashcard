import { useEffect, useMemo, useState } from "react";
import {
  createDeck,
  generateCards,
  getDeckAnalytics,
  getDueCards,
  listDecks,
  submitReview,
  uploadPdf
} from "./api";

const confidenceOptions = ["easy", "medium", "hard"];
const mistakeOptions = ["none", "concept", "calculation", "careless"];

export default function App() {
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("Quadratic Equations");
  const [pdfFile, setPdfFile] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [cards, setCards] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [timeStartedAt, setTimeStartedAt] = useState(Date.now());

  const currentCard = cards[currentIndex] || null;

  async function refreshDecks() {
    const all = await listDecks();
    setDecks(all);
    if (!selectedDeckId && all[0]) {
      setSelectedDeckId(all[0]._id);
    }
  }

  useEffect(() => {
    refreshDecks().catch((e) => setStatus(e.message));
  }, []);

  useEffect(() => {
    if (!selectedDeckId) {
      return;
    }

    Promise.all([getDueCards(selectedDeckId), getDeckAnalytics(selectedDeckId)])
      .then(([dueCards, stats]) => {
        setCards(dueCards);
        setAnalytics(stats);
        setCurrentIndex(0);
        setShowSolution(false);
        setTimeStartedAt(Date.now());
      })
      .catch((e) => setStatus(e.message));
  }, [selectedDeckId]);

  const typeCounts = useMemo(() => {
    return cards.reduce((acc, card) => {
      acc[card.type] = (acc[card.type] || 0) + 1;
      return acc;
    }, {});
  }, [cards]);

  async function onUploadAndCreateDeck() {
    try {
      setStatus("Uploading and extracting PDF text...");
      if (!pdfFile) {
        throw new Error("Please choose a PDF file first");
      }
      const result = await uploadPdf(pdfFile);
      setSourceText(result.text);

      setStatus("Creating deck...");
      const deck = await createDeck({
        subject,
        topic,
        sourceText: result.text
      });

      setSelectedDeckId(deck._id);
      await refreshDecks();
      setStatus("Deck created. Generate cards next.");
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function onGenerateCards() {
    try {
      if (!selectedDeckId) {
        throw new Error("Select or create a deck first");
      }
      setStatus("Generating multi-type cards...");
      await generateCards(selectedDeckId);
      const [dueCards, stats] = await Promise.all([
        getDueCards(selectedDeckId),
        getDeckAnalytics(selectedDeckId)
      ]);
      setCards(dueCards);
      setAnalytics(stats);
      setCurrentIndex(0);
      setShowSolution(false);
      setTimeStartedAt(Date.now());
      setStatus(`Generated ${dueCards.length} cards`);
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function onSubmitReview(confidence, mistakeType) {
    if (!currentCard) {
      return;
    }
    try {
      const elapsed = Math.round((Date.now() - timeStartedAt) / 1000);
      const isCorrect = confidence !== "hard";

      await submitReview({
        cardId: currentCard._id,
        isCorrect,
        confidence,
        timeTakenSeconds: elapsed,
        mistakeType: isCorrect ? "none" : mistakeType
      });

      const [dueCards, stats] = await Promise.all([
        getDueCards(selectedDeckId),
        getDeckAnalytics(selectedDeckId)
      ]);

      setCards(dueCards);
      setAnalytics(stats);
      setCurrentIndex((prev) => (prev + 1 >= dueCards.length ? 0 : prev + 1));
      setShowSolution(false);
      setTimeStartedAt(Date.now());
      setStatus("Review saved and schedule updated");
    } catch (e) {
      setStatus(e.message);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Cuemath Learning Engine</h1>
        <p>Math cards with process, mistakes, and adaptive scheduling.</p>
      </header>

      <section className="panel two-col">
        <div>
          <h2>Create Deck from PDF</h2>
          <label>Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          <label>Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} />
          <label>Upload PDF</label>
          <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          <button onClick={onUploadAndCreateDeck}>Upload + Create Deck</button>
          <button className="ghost" onClick={onGenerateCards}>Generate Multi-Type Cards</button>
        </div>

        <div>
          <h2>Decks</h2>
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
          >
            <option value="">Select deck</option>
            {decks.map((deck) => (
              <option key={deck._id} value={deck._id}>
                {deck.topic} ({deck.subject})
              </option>
            ))}
          </select>
          <p className="muted">Extracted text length: {sourceText.length}</p>
          <p className="status">Status: {status}</p>

          <h3>Card Mix</h3>
          <div className="chips">
            {Object.entries(typeCounts).map(([type, count]) => (
              <span key={type} className="chip">{type}: {count}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="panel two-col">
        <div>
          <h2>Practice Mode (Step Reveal)</h2>
          {!currentCard && <p>No cards due yet. Generate cards first.</p>}

          {currentCard && (
            <div className="card">
              <div className="card-head">
                <span>{currentCard.type}</span>
                <span>{currentCard.concept}</span>
              </div>
              <p className="question">{currentCard.question}</p>

              {currentCard.type === "step_problem" ? (
                <div className="steps">
                  {currentCard.steps.map((step, idx) => (
                    <p key={idx} className={showSolution ? "visible" : "hidden-step"}>
                      Step {idx + 1}: {step}
                    </p>
                  ))}
                </div>
              ) : (
                <p className={showSolution ? "answer visible" : "answer hidden-step"}>
                  {currentCard.answer}
                </p>
              )}

              {!showSolution ? (
                <button onClick={() => setShowSolution(true)}>Reveal Next Step / Answer</button>
              ) : (
                <div className="actions">
                  {confidenceOptions.map((confidence) => (
                    <button key={confidence} onClick={() => onSubmitReview(confidence, "none")}>{confidence}</button>
                  ))}
                  <select id="mistake-select" defaultValue="none">
                    {mistakeOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    className="danger"
                    onClick={() => {
                      const selected = document.getElementById("mistake-select");
                      const mistake = selected ? selected.value : "concept";
                      onSubmitReview("hard", mistake);
                    }}
                  >
                    Mark Wrong
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h2>Mastery Dashboard</h2>
          {!analytics && <p>No analytics yet.</p>}
          {analytics && (
            <>
              <div className="stats-grid">
                <div className="stat"><strong>{analytics.totalCards}</strong><span>Total Cards</span></div>
                <div className="stat"><strong>{analytics.attempts}</strong><span>Attempts</span></div>
                <div className="stat"><strong>{analytics.correct}</strong><span>Correct</span></div>
                <div className="stat"><strong>{analytics.accuracy}%</strong><span>Accuracy</span></div>
              </div>

              <h3>Mistake Intelligence</h3>
              <ul>
                <li>Concept errors: {analytics.mistakeSummary.concept}</li>
                <li>Calculation errors: {analytics.mistakeSummary.calculation}</li>
                <li>Careless errors: {analytics.mistakeSummary.careless}</li>
              </ul>

              <h3>Concept Graph Nodes</h3>
              <ul className="graph-list">
                {analytics.conceptGraph.nodes.slice(0, 8).map((node) => (
                  <li key={node.id}>{node.label} ({node.count})</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
