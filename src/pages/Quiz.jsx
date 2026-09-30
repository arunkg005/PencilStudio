import { useMemo, useState } from "react";

import { generateQuiz, normalizeQuiz } from "../services/ai";
import { downloadQuizPDF } from "../services/quizPdf";

const initialInput = { topic: "", rawMaterial: "", questionCount: 10, difficulty: "Mixed", includeExplanations: true };
const letters = ["A", "B", "C", "D"];

function QuizStatus({ status, message }) {
  const labels = { ready: "READY", sketching: "SKETCHING", generated: "GENERATED", error: "ERROR" };
  return <div className={`quiz-status quiz-status-${status}`} aria-live="polite"><span className="quiz-status-mark" aria-hidden="true" /><strong>{labels[status] || "READY"}</strong>{message && <span>{message}</span>}</div>;
}

function QuizForm({ input, error, status, onChange, onSubmit }) {
  return <form className="quiz-form" onSubmit={onSubmit} noValidate>
    <div className="quiz-form-heading"><span className="quiz-annotation">WORKSHEET / INPUT</span><h2>FEED THE DESK.</h2><p>Use the material you already trust. The local generator stays anchored to it.</p></div>
    <label>Topic<input name="topic" value={input.topic} onChange={onChange} placeholder="e.g. Database Normalization" aria-invalid={Boolean(error)} /></label>
    <label>Study Material<textarea name="rawMaterial" value={input.rawMaterial} onChange={onChange} placeholder="Paste definitions, notes, or source statements here..." rows="10" aria-invalid={Boolean(error)} /></label>
    <div className="quiz-form-grid"><label>Number of Questions<select name="questionCount" value={input.questionCount} onChange={onChange}><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option></select></label><label>Difficulty<select name="difficulty" value={input.difficulty} onChange={onChange}><option>Easy</option><option>Medium</option><option>Hard</option><option>Mixed</option></select></label></div>
    <label className="quiz-check"><input type="checkbox" name="includeExplanations" checked={input.includeExplanations} onChange={onChange} /><span>Include explanations</span></label>
    {error && <p className="quiz-error" role="alert">{error}</p>}
    <button className="quiz-primary-button" type="submit" disabled={status === "sketching"}>{status === "sketching" ? "AI IS WRITING THE QUESTIONS..." : "GENERATE QUIZ"}</button>
  </form>;
}

function QuizPlayer({ quiz, answers, checked, input, current, onSelect, onCheck, onPrevious, onNext }) {
  const question = quiz.questions[current];
  const answer = answers[question.id];
  const isChecked = Boolean(checked[question.id]);
  const correct = answer === question.correctAnswer;
  return <section className="quiz-player" aria-labelledby="quiz-question-heading">
    <div className="quiz-player-top"><span className="quiz-annotation">QUESTION {String(current + 1).padStart(2, "0")} / {quiz.questions.length}</span><span>{quiz.difficulty} / {input.topic}</span></div>
    <div className="quiz-progress"><span style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }} /></div>
    <h2 id="quiz-question-heading">{question.question}</h2>
    <fieldset className="quiz-options"><legend className="sr-only">Choose an answer</legend>{question.options.map((option, index) => <label key={`${question.id}-${index}`} className={`quiz-option ${isChecked && index === question.correctAnswer ? "is-correct" : ""} ${isChecked && index === answer && !correct ? "is-wrong" : ""}`}><input type="radio" name={question.id} checked={answer === index} onChange={() => onSelect(question.id, index)} disabled={isChecked} /><span className="quiz-option-letter">{letters[index]}.</span><span>{option}</span></label>)}</fieldset>
    {isChecked && <div className={`quiz-feedback ${correct ? "quiz-feedback-correct" : "quiz-feedback-wrong"}`} role="status"><strong>{correct ? "ANSWER CORRECT" : "ANSWER REVIEW"}</strong><span>{correct ? "Your selection matches the source-derived answer." : `Correct answer: ${letters[question.correctAnswer]}. ${question.options[question.correctAnswer]}`}</span>{input.includeExplanations && question.explanation && <p>{question.explanation}</p>}</div>}
    <div className="quiz-player-actions"><button type="button" onClick={onPrevious} disabled={current === 0}>← Previous</button><button type="button" className="quiz-primary-button" onClick={isChecked ? onNext : onCheck} disabled={isChecked ? false : answer === undefined}>{isChecked ? current === quiz.questions.length - 1 ? "Finish Quiz" : "Next →" : "Check Answer"}</button></div>
  </section>;
}

function QuizResults({ quiz, answers, checked, review, onReview, onRetry, onEdit, onCopy, onDownload, onClear, copied }) {
  const correct = quiz.questions.filter((question) => checked[question.id] && answers[question.id] === question.correctAnswer).length;
  const answered = Object.keys(answers).filter((id) => answers[id] !== undefined).length;
  const percentage = Math.round((correct / quiz.questions.length) * 100);
  return <section className="quiz-results" aria-labelledby="quiz-results-heading"><div className="quiz-results-heading"><span className="quiz-annotation">RESULTS / COMPLETE</span><h2 id="quiz-results-heading">QUIZ COMPLETE.</h2><p>{quiz.topic} / {quiz.difficulty}</p></div><div className="quiz-score"><strong>{correct} / {quiz.questions.length}</strong><span>SCORE</span></div><div className="quiz-result-stats"><div><strong>{percentage}%</strong><span>Percentage</span></div><div><strong>{correct}</strong><span>Correct</span></div><div><strong>{quiz.questions.length - correct}</strong><span>Incorrect</span></div><div><strong>{quiz.questions.length - answered}</strong><span>Unanswered</span></div></div><div className="quiz-result-actions"><button type="button" onClick={onReview}>{review ? "Hide Review" : "Review Answers"}</button><button type="button" onClick={onRetry}>Retry Quiz</button><button type="button" onClick={onEdit}>Edit Input</button><button type="button" onClick={onCopy}>Copy Results</button><button type="button" onClick={onDownload}>Download Results</button><button type="button" onClick={onClear}>Clear</button></div>{copied && <p className="quiz-copied" role="status">RESULTS COPIED ✓</p>}{review && <div className="quiz-review">{quiz.questions.map((question, index) => { const selected = answers[question.id]; return <article key={question.id}><span className="quiz-annotation">QUESTION {String(index + 1).padStart(2, "0")}</span><h3>{question.question}</h3><p><strong>YOUR ANSWER</strong> {selected === undefined ? "Unanswered" : `${letters[selected]}. ${question.options[selected]}`}</p><p><strong>CORRECT ANSWER</strong> {letters[question.correctAnswer]}. {question.options[question.correctAnswer]}</p>{question.explanation && <p>{question.explanation}</p>}</article>; })}</div>}</section>;
}

export default function Quiz() {
  const [input, setInput] = useState(initialInput);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState({});
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState("input");
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [copied, setCopied] = useState(false);

  const resultText = useMemo(() => {
    if (!quiz) return "";
    const correct = quiz.questions.filter((question) => checked[question.id] && answers[question.id] === question.correctAnswer).length;
    return [`PencilStudio Quiz Results`, `Topic: ${quiz.topic}`, `Difficulty: ${quiz.difficulty}`, `Score: ${correct} / ${quiz.questions.length}`, `Percentage: ${Math.round((correct / quiz.questions.length) * 100)}%`, "", ...quiz.questions.map((question, index) => { const selected = answers[question.id]; return `Question ${index + 1}: ${question.question}\nYour answer: ${selected === undefined ? "Unanswered" : question.options[selected]}\nCorrect answer: ${question.options[question.correctAnswer]}\nExplanation: ${question.explanation}`; })].join("\n\n");
  }, [quiz, answers, checked]);

  const updateInput = (event) => { const { name, value, type, checked: isChecked } = event.target; setInput((previous) => ({ ...previous, [name]: type === "checkbox" ? isChecked : value })); };
  const generate = async (event) => { event.preventDefault(); if (!input.topic.trim() || !input.rawMaterial.trim()) { setError("Add a topic and study material before generating the quiz."); setStatus("error"); return; } setError(""); setMessage(""); setStatus("sketching"); try { const result = normalizeQuiz(await generateQuiz(input)); if (!result.questions.length) throw new Error("No usable questions were found."); setQuiz(result); setAnswers({}); setChecked({}); setCurrent(0); setReview(false); setPhase("player"); setStatus("generated"); } catch { setStatus("error"); setError("The supplied material did not contain enough usable statements for a quiz."); } };
  const check = () => { if (!quiz || answers[quiz.questions[current].id] === undefined) return; setChecked((previous) => ({ ...previous, [quiz.questions[current].id]: true })); };
  const next = () => { if (!quiz) return; if (current === quiz.questions.length - 1) setPhase("results"); else setCurrent((value) => value + 1); };
  const retry = () => { setAnswers({}); setChecked({}); setCurrent(0); setReview(false); setPhase("player"); setCopied(false); };
  const copy = async () => { try { await navigator.clipboard.writeText(resultText); setCopied(true); } catch { setMessage("COPY FAILED. Select the results manually to copy them."); } };
  const download = () => { try { downloadQuizPDF({ quiz, answers, checked }); setMessage("PDF DOWNLOADED"); } catch { setMessage("PDF export failed. Please try again."); } };
  const clear = () => { setQuiz(null); setAnswers({}); setChecked({}); setPhase("input"); setStatus("ready"); setMessage(""); setError(""); };

  return <div className="page quiz-page"><header className="quiz-header"><div className="quiz-kicker"><span>06</span><span>/</span><span>AI QUIZ GENERATOR</span></div><h1 className="hand">TEST WHAT YOU KNOW.</h1><p>Turn your study material into a practice quiz and find the gaps before the exam.</p></header><div className="quiz-flow"><span>MATERIAL</span><b>→</b><span>QUESTIONS</span><b>→</b><span>CHECK</span><b>→</b><span>LEARN</span></div><div className="quiz-status-row"><QuizStatus status={status} message={message || (status === "sketching" ? "AI IS WRITING THE QUESTIONS..." : "")} /></div><main className={`quiz-workspace quiz-phase-${phase}`}><QuizForm input={input} error={error} status={status} onChange={updateInput} onSubmit={generate} />{phase === "input" && <section className="quiz-empty"><span className="quiz-question-marks" aria-hidden="true">? ?</span><h2>YOUR QUIZ WILL APPEAR HERE.</h2><p>Feed the desk some study material.</p></section>}{phase === "player" && quiz && <QuizPlayer quiz={quiz} answers={answers} checked={checked} input={input} current={current} onSelect={(id, value) => setAnswers((previous) => ({ ...previous, [id]: value }))} onCheck={check} onPrevious={() => setCurrent((value) => Math.max(0, value - 1))} onNext={next} />}{phase === "results" && quiz && <QuizResults quiz={quiz} answers={answers} checked={checked} review={review} copied={copied} onReview={() => setReview((value) => !value)} onRetry={retry} onEdit={() => setPhase("input")} onCopy={copy} onDownload={download} onClear={clear} />}</main></div>;
}
