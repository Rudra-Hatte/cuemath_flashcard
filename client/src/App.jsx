import { useEffect, useMemo, useRef, useState } from "react";
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
const TOUR_STORAGE_KEY = "cuemath-tour-completed";
const tourSteps = [
  {
    key: "workflow",
    title: "How This App Works",
    description: "You will always follow 3 steps: Upload chapter, generate cards, then practice with confidence ratings."
  },
  {
    key: "create",
    title: "Step 1: Build Your Deck",
    description: "Fill subject and topic, upload one chapter PDF, then click Upload + Create Deck."
  },
  {
    key: "workspace",
    title: "Step 2: Generate Cards",
    description: "Choose your deck and click Step 2 to generate mixed card types from your uploaded material."
  },
  {
    key: "practice",
    title: "Step 3: Practice With Reveal",
    description: "Try solving first, then reveal. Use easy/medium/hard honestly so the scheduler adapts correctly."
  },
  {
    key: "dashboard",
    title: "Track Weak Areas",
    description: "Watch mistake patterns and concept mastery. This tells you exactly what to revise next."
  }
];

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
  const [selectedMistakeType, setSelectedMistakeType] = useState("concept");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [mcqFeedback, setMcqFeedback] = useState(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [celebrationType, setCelebrationType] = useState("");
  const celebrationTimerRef = useRef(null);

  const workflowRef = useRef(null);
  const createRef = useRef(null);
  const workspaceRef = useRef(null);
  const practiceRef = useRef(null);
  const dashboardRef = useRef(null);

  const currentCard = cards[currentIndex] || null;
  const hasDeck = Boolean(selectedDeckId);
  const hasCards = cards.length > 0;
  const setupProgress = useMemo(() => {
    if (hasCards) {
      return 3;
    }
    if (hasDeck) {
      return 2;
    }
    if (pdfFile || sourceText.length > 0) {
      return 1;
    }
    return 0;
  }, [hasCards, hasDeck, pdfFile, sourceText.length]);

  const targetByKey = useMemo(
    () => ({
      workflow: workflowRef,
      create: createRef,
      workspace: workspaceRef,
      practice: practiceRef,
      dashboard: dashboardRef
    }),
    []
  );

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
    const isCompleted = window.localStorage.getItem(TOUR_STORAGE_KEY) === "true";
    if (!isCompleted) {
      const timer = window.setTimeout(() => {
        setTourIndex(0);
        setTourOpen(true);
      }, 500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
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
        setSelectedOptionIndex(null);
        setMcqFeedback(null);
        setTimeStartedAt(Date.now());
      })
      .catch((e) => setStatus(e.message));
  }, [selectedDeckId]);

  useEffect(() => {
    if (!tourOpen) {
      return;
    }

    const currentStep = tourSteps[tourIndex];
    const targetRef = targetByKey[currentStep.key];
    const element = targetRef?.current;

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const updateRect = () => {
      if (!element) {
        setHighlightRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setHighlightRect({
        top: Math.max(rect.top - 10, 8),
        left: Math.max(rect.left - 10, 8),
        width: rect.width + 20,
        height: rect.height + 20
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [tourIndex, tourOpen, targetByKey]);

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
      setSelectedOptionIndex(null);
      setMcqFeedback(null);
      setTimeStartedAt(Date.now());
      setStatus(`Generated ${dueCards.length} cards`);
      triggerCelebration("cards");
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function onSubmitReview(confidence, mistakeType, overrides = {}) {
    if (!currentCard) {
      return;
    }
    try {
      const elapsed = Math.round((Date.now() - timeStartedAt) / 1000);
      const resolvedIsCorrect =
        typeof overrides.isCorrect === "boolean"
          ? overrides.isCorrect
          : confidence !== "hard";

      await submitReview({
        cardId: currentCard._id,
        isCorrect: resolvedIsCorrect,
        confidence,
        timeTakenSeconds: overrides.timeTakenSeconds ?? elapsed,
        mistakeType: resolvedIsCorrect ? "none" : mistakeType,
        reviewMode: overrides.reviewMode || "flashcard",
        selectedOptionIndex:
          Number.isInteger(overrides.selectedOptionIndex) ? overrides.selectedOptionIndex : undefined,
        selectedOptionText: overrides.selectedOptionText || ""
      });

      const [dueCards, stats] = await Promise.all([
        getDueCards(selectedDeckId),
        getDeckAnalytics(selectedDeckId)
      ]);

      setCards(dueCards);
      setAnalytics(stats);
      setCurrentIndex((prev) => (prev + 1 >= dueCards.length ? 0 : prev + 1));
      setShowSolution(false);
      setSelectedMistakeType("concept");
      setSelectedOptionIndex(null);
      setMcqFeedback(null);
      setTimeStartedAt(Date.now());
      setStatus("Review saved and schedule updated");
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function onSubmitMcqAnswer() {
    if (!currentCard || !currentCard.isMcq || selectedOptionIndex === null) {
      return;
    }

    const elapsed = Math.round((Date.now() - timeStartedAt) / 1000);
    const isCorrect = selectedOptionIndex === currentCard.correctOptionIndex;
    const confidence = isCorrect ? "medium" : "hard";
    const mistakeType = isCorrect ? "none" : selectedMistakeType;

    setMcqFeedback({
      isCorrect,
      correctOptionIndex: currentCard.correctOptionIndex
    });

    await onSubmitReview(confidence, mistakeType, {
      isCorrect,
      timeTakenSeconds: elapsed,
      reviewMode: "mcq",
      selectedOptionIndex,
      selectedOptionText: currentCard.options?.[selectedOptionIndex] || ""
    });
  }

  function formatStepState(step) {
    if (setupProgress >= step) {
      return "done";
    }
    if (setupProgress + 1 === step) {
      return "active";
    }
    return "locked";
  }

  function startTour() {
    setTourIndex(0);
    setTourOpen(true);
  }

  function finishTour(markCompleted) {
    setTourOpen(false);
    setHighlightRect(null);
    if (markCompleted) {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "true");
    }
  }

  function nextTourStep() {
    if (tourIndex >= tourSteps.length - 1) {
      finishTour(true);
      triggerCelebration("tour");
      return;
    }
    setTourIndex((prev) => prev + 1);
  }

  function triggerCelebration(type) {
    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
    }

    setCelebrationType(type);
    celebrationTimerRef.current = window.setTimeout(() => {
      setCelebrationType("");
    }, 1500);
  }

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Adaptive Math Studio</p>
          <h1>Cuemath Learning Engine</h1>
          <p>Turn PDFs into teacher-like practice: step reveals, mistake intelligence, and confidence-based revision.</p>
          <div className="hero-actions">
            <a className="pill-link" href="#workflow">How to start</a>
            <a className="pill-link light" href="#practice">Jump to practice</a>
            <button className="pill-link-btn" onClick={startTour}>Replay Tour</button>
          </div>
        </div>
        <div className="floating-orbs" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
      </header>

      <section id="workflow" className="panel onboarding-panel" ref={workflowRef}>
        <h2>Your 3-Step Flow</h2>
        <p className="muted">Follow these in order. The active step is highlighted so you always know what to do next.</p>
        <div className="stepper">
          <div className={`step ${formatStepState(1)}`}>
            <span>1</span>
            <div>
              <strong>Upload PDF + Create Deck</strong>
              <p>Pick subject/topic and upload your chapter notes.</p>
            </div>
          </div>
          <div className={`step ${formatStepState(2)}`}>
            <span>2</span>
            <div>
              <strong>Generate Smart Cards</strong>
              <p>Create mixed card types: concept, step, mistakes, reverse, applications.</p>
            </div>
          </div>
          <div className={`step ${formatStepState(3)}`}>
            <span>3</span>
            <div>
              <strong>Practice + Mark Confidence</strong>
              <p>Reveal steps, review honestly, and let the engine adapt.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel two-col">
        <div className="glass-card" ref={createRef}>
          <h2>Step 1: Create Deck From PDF</h2>
          <label>Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          <label>Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} />
          <label>Upload PDF</label>
          <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          <button onClick={onUploadAndCreateDeck}>Upload + Create Deck</button>
          <button className="ghost" onClick={onGenerateCards}>Step 2: Generate Multi-Type Cards</button>
        </div>

        <div className="glass-card" ref={workspaceRef}>
          <h2>Workspace Control</h2>
          <select
            className="modern-select"
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

          <h3>Current Card Mix</h3>
          <div className="chips">
            {Object.entries(typeCounts).map(([type, count]) => (
              <span key={type} className="chip">{type}: {count}</span>
            ))}
            {Object.keys(typeCounts).length === 0 && <span className="chip muted-chip">No cards generated yet</span>}
          </div>
        </div>
      </section>

      <section id="practice" className="panel two-col">
        <div className="glass-card" ref={practiceRef}>
          <h2>Step 3: Practice Mode (Step Reveal)</h2>
          <p className="muted">
            Rule: First try mentally, then reveal, then rate confidence.
          </p>
          {!currentCard && <p>No cards due yet. Generate cards first.</p>}

          {currentCard && (
            <div className="card animated-card">
              <div className="card-head">
                <span>{currentCard.type}</span>
                <span>{currentCard.concept}</span>
              </div>
              <p className="question">{currentCard.question}</p>

              {currentCard.isMcq && Array.isArray(currentCard.options) && currentCard.options.length > 0 && (
                <div className="mcq-wrap">
                  <p className="muted">Choose one option:</p>
                  <div className="mcq-options">
                    {currentCard.options.map((option, idx) => {
                      const isSelected = selectedOptionIndex === idx;
                      const isCorrectOption = mcqFeedback?.correctOptionIndex === idx;
                      const wasWrongPick = mcqFeedback && isSelected && !mcqFeedback.isCorrect;

                      return (
                        <button
                          key={`${currentCard._id}-opt-${idx}`}
                          className={`mcq-option ${isSelected ? "selected" : ""} ${isCorrectOption ? "correct" : ""} ${wasWrongPick ? "wrong" : ""}`}
                          onClick={() => setSelectedOptionIndex(idx)}
                          disabled={Boolean(mcqFeedback)}
                        >
                          <span className="mcq-badge">{String.fromCharCode(65 + idx)}</span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  {!mcqFeedback && (
                    <button
                      className="ghost"
                      disabled={selectedOptionIndex === null}
                      onClick={onSubmitMcqAnswer}
                    >
                      Submit MCQ Answer
                    </button>
                  )}
                </div>
              )}

              {!currentCard.isMcq && currentCard.type === "step_problem" ? (
                <div className="steps">
                  {currentCard.steps.map((step, idx) => (
                    <p key={idx} className={showSolution ? "visible" : "hidden-step"}>
                      Step {idx + 1}: {step}
                    </p>
                  ))}
                </div>
              ) : !currentCard.isMcq ? (
                <p className={showSolution ? "answer visible" : "answer hidden-step"}>
                  {currentCard.answer}
                </p>
              ) : null}

              {!currentCard.isMcq && !showSolution ? (
                <button onClick={() => setShowSolution(true)}>Reveal Next Step / Answer</button>
              ) : !currentCard.isMcq ? (
                <div className="actions">
                  {confidenceOptions.map((confidence) => (
                    <button
                      key={confidence}
                      className={confidence === "hard" ? "neutral" : "success"}
                      onClick={() => onSubmitReview(confidence, "none")}
                    >
                      {confidence}
                    </button>
                  ))}
                  <select className="modern-select" value={selectedMistakeType} onChange={(e) => setSelectedMistakeType(e.target.value)}>
                    {mistakeOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    className="danger"
                    onClick={() => onSubmitReview("hard", selectedMistakeType)}
                  >
                    Mark Wrong
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="glass-card" ref={dashboardRef}>
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

      <section className="panel mini-guide">
        <h3>Quick User Guide</h3>
        <div className="guide-grid">
          <article>
            <strong>First Visit</strong>
            <p>Upload one chapter PDF and keep topic precise like "Quadratic Equations".</p>
          </article>
          <article>
            <strong>Before Reveal</strong>
            <p>Pause for 20-40 seconds and attempt mentally on paper before revealing.</p>
          </article>
          <article>
            <strong>After Reveal</strong>
            <p>Use easy/medium/hard honestly. If wrong, always tag mistake type.</p>
          </article>
          <article>
            <strong>Daily Routine</strong>
            <p>Review due cards 15-20 minutes daily to grow mastery and reduce weak spots.</p>
          </article>
        </div>
      </section>

      {tourOpen && (
        <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Onboarding tour">
          {highlightRect ? (
            <>
              <div className="tour-dim" style={{ top: 0, left: 0, width: "100vw", height: `${highlightRect.top}px` }} />
              <div
                className="tour-dim"
                style={{
                  top: `${highlightRect.top}px`,
                  left: 0,
                  width: `${highlightRect.left}px`,
                  height: `${highlightRect.height}px`
                }}
              />
              <div
                className="tour-dim"
                style={{
                  top: `${highlightRect.top}px`,
                  left: `${highlightRect.left + highlightRect.width}px`,
                  width: `calc(100vw - ${highlightRect.left + highlightRect.width}px)`,
                  height: `${highlightRect.height}px`
                }}
              />
              <div
                className="tour-dim"
                style={{
                  top: `${highlightRect.top + highlightRect.height}px`,
                  left: 0,
                  width: "100vw",
                  height: `calc(100vh - ${highlightRect.top + highlightRect.height}px)`
                }}
              />
            </>
          ) : (
            <div className="tour-dim" style={{ top: 0, left: 0, width: "100vw", height: "100vh" }} />
          )}

          {highlightRect && (
            <div
              className="tour-spotlight"
              style={{
                top: `${highlightRect.top}px`,
                left: `${highlightRect.left}px`,
                width: `${highlightRect.width}px`,
                height: `${highlightRect.height}px`
              }}
            />
          )}

          <aside className="tour-card-panel">
            <p className="tour-index">Step {tourIndex + 1} of {tourSteps.length}</p>
            <h3>{tourSteps[tourIndex].title}</h3>
            <p>{tourSteps[tourIndex].description}</p>
            <div className="tour-actions">
              <button className="neutral" onClick={() => finishTour(true)}>Skip</button>
              <button
                className="neutral"
                disabled={tourIndex === 0}
                onClick={() => setTourIndex((prev) => Math.max(prev - 1, 0))}
              >
                Back
              </button>
              <button onClick={nextTourStep}>
                {tourIndex === tourSteps.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {celebrationType && (
        <div className="celebration-layer" aria-hidden="true">
          <p className="celebration-message">
            {celebrationType === "tour" ? "Tour Completed" : "Cards Generated"}
          </p>
          {Array.from({ length: 18 }).map((_, idx) => (
            <span
              key={`confetti-${idx}`}
              className="confetti-piece"
              style={{
                left: `${6 + idx * 5}%`,
                animationDelay: `${idx * 35}ms`,
                background: ["#ff9f43", "#3ec7c1", "#52d681", "#f7e26b"][idx % 4]
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
