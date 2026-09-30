import { useState } from "react";

import { generateTutorResponse } from "../services/ai";

const suggestions = ["What is normalization?", "Explain recursion simply.", "What is the difference between a stack and a queue?", "How does gradient descent work?"];
const initialSettings = { subject: "Computer Science", customSubject: "", level: "Intermediate", explanationStyle: "Simple" };

function TutorStatus({ status, message }) {
  const labels = { ready: "READY", thinking: "THINKING", answered: "ANSWERED", error: "ERROR" };
  return <div className={`tutor-status tutor-status-${status}`} aria-live="polite"><span className="tutor-status-mark" aria-hidden="true" /><strong>{labels[status] || "READY"}</strong>{message && <span>{message}</span>}</div>;
}

function TutorSettings({ settings, onChange }) {
  return <section className="tutor-settings"><div className="tutor-section-heading"><span className="tutor-annotation">01 / CONTEXT</span><h2>SET THE DESK.</h2></div><label>Subject<select name="subject" value={settings.subject} onChange={onChange}><option>Computer Science</option><option>Mathematics</option><option>Data Science</option><option>Machine Learning</option><option>General</option><option>Other / Custom Subject</option></select></label>{settings.subject === "Other / Custom Subject" && <label>Custom Subject<input name="customSubject" value={settings.customSubject} onChange={onChange} placeholder="Name the subject" /></label>}<label>Level<select name="level" value={settings.level} onChange={onChange}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Explanation Style<select name="explanationStyle" value={settings.explanationStyle} onChange={onChange}><option>Simple</option><option>Step-by-Step</option><option>Exam Focused</option><option>Detailed</option></select></label><div className="tutor-context"><span>SUBJECT</span><strong>{settings.subject === "Other / Custom Subject" ? settings.customSubject || "Custom" : settings.subject}</strong><span>LEVEL</span><strong>{settings.level}</strong><span>STYLE</span><strong>{settings.explanationStyle}</strong></div></section>;
}

function TutorResponse({ response, onCopy, copied }) {
  return <div className={`tutor-response ${response.limitation ? "tutor-response-limitation" : ""}`}><div className="tutor-message-label"><span>AI TUTOR</span><button type="button" onClick={onCopy}>{copied ? "COPIED ✓" : "COPY"}</button></div>{response.limitation && <span className="tutor-limitation-label">DEMO LIMITATION</span>}<section><h3>ANSWER</h3><p>{response.answer}</p></section>{response.keyPoints?.length > 0 && <section><h3>KEY POINTS</h3><ul>{response.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></section>}{response.example && <section><h3>EXAMPLE</h3><p>{response.example}</p></section>}{response.takeaway && <section><h3>TAKEAWAY</h3><p>{response.takeaway}</p></section>}</div>;
}

function TutorMessage({ message, onCopy, copied, onFollowUp, showActions }) {
  if (message.role === "user") return <article className="tutor-user-message"><span className="tutor-message-label">YOU</span><p>{message.question}</p></article>;
  return <article className="tutor-message"><TutorResponse response={message.response} onCopy={() => onCopy(message)} copied={copied === message.id} />{showActions && !message.response.limitation && <div className="tutor-quick-actions"><button type="button" onClick={() => onFollowUp("Explain that more simply")}>Explain simpler</button><button type="button" onClick={() => onFollowUp("Give a practical example")}>Give an example</button><button type="button" onClick={() => onFollowUp("Give the exam version")}>Exam version</button></div>}</article>;
}

export default function Tutor() {
  const [settings, setSettings] = useState(initialSettings);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const contextSubject = settings.subject === "Other / Custom Subject" ? settings.customSubject || "Custom Subject" : settings.subject;
  const updateSettings = (event) => setSettings((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const submitQuestion = async (submittedQuestion = question) => {
    const nextQuestion = submittedQuestion.trim();
    if (!nextQuestion) { setError("Write a question before asking the desk."); setStatus("error"); return; }
    const userMessage = { id: `user-${Date.now()}`, role: "user", question: nextQuestion, timestamp: Date.now() };
    const conversation = [...messages, userMessage];
    setMessages(conversation); setQuestion(""); setError(""); setMessage(""); setStatus("thinking");
    try {
      const response = await generateTutorResponse({ subject: contextSubject, level: settings.level, explanationStyle: settings.explanationStyle, question: nextQuestion, conversation });
      setMessages([...conversation, { id: `tutor-${Date.now()}`, role: "tutor", question: nextQuestion, response, timestamp: Date.now() }]); setStatus("answered");
    } catch { setStatus("error"); setError("THE DESK COULD NOT COMPLETE THAT RESPONSE."); }
  };
  const submitFollowUp = (prompt) => { const lastQuestion = [...messages].reverse().find((item) => item.role === "user")?.question || "that concept"; submitQuestion(`${prompt}: ${lastQuestion}`); };
  const copyResponse = async (item) => { const response = item.response; const text = [`AI TUTOR`, `Question: ${item.question}`, `Answer: ${response.answer}`, response.keyPoints?.length ? `Key points:\n${response.keyPoints.map((point) => `- ${point}`).join("\n")}` : "", response.example ? `Example: ${response.example}` : "", response.takeaway ? `Takeaway: ${response.takeaway}` : ""].filter(Boolean).join("\n\n"); try { await navigator.clipboard.writeText(text); setCopied(item.id); setTimeout(() => setCopied(null), 1800); } catch { setMessage("COPY FAILED. Select the response manually to copy it."); } };
  const clearChat = () => { setMessages([]); setConfirmClear(false); setStatus("ready"); setMessage(""); setError(""); };
  const onInputKeyDown = (event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); submitQuestion(); } };
  const lastTutorId = [...messages].reverse().find((item) => item.role === "tutor")?.id;

  return <div className="page tutor-page"><header className="tutor-header"><div className="tutor-kicker"><span>07</span><span>/</span><span>AI SUBJECT TUTOR</span></div><h1 className="hand">ASK THE DESK.</h1><p>Ask a subject doubt, request an explanation, or work through a concept step by step.</p></header><div className="tutor-flow"><span>QUESTION</span><b>→</b><span>EXPLANATION</span><b>→</b><span>UNDERSTANDING</span></div><div className="tutor-toolbar"><TutorStatus status={status} message={message || (status === "thinking" ? "AI IS THINKING..." : "")} />{messages.length > 0 && !confirmClear && <button type="button" onClick={() => setConfirmClear(true)}>Clear Chat</button>}{confirmClear && <div className="tutor-clear-confirm" role="group" aria-label="Clear conversation confirmation"><span>Clear this conversation?</span><button type="button" onClick={clearChat}>Clear</button><button type="button" onClick={() => setConfirmClear(false)}>Keep</button></div>}</div><main className="tutor-workspace"><TutorSettings settings={settings} onChange={updateSettings} /><section className="tutor-chat"><div className="tutor-chat-heading"><div><span className="tutor-annotation">02 / CHAT HISTORY</span><h2>WORK THROUGH IT.</h2></div><div className="tutor-current-context"><span>SUBJECT</span><strong>{contextSubject}</strong><span>LEVEL</span><strong>{settings.level}</strong><span>STYLE</span><strong>{settings.explanationStyle}</strong></div></div><div className="tutor-history" aria-live="polite">{messages.length === 0 ? <div className="tutor-empty"><span className="tutor-pencil-mark" aria-hidden="true">∿</span><h2>YOUR TUTOR IS READY.</h2><p>Ask a question. Start with what is confusing.</p><div className="tutor-suggestions">{suggestions.map((item) => <button type="button" key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div></div> : messages.map((item) => <TutorMessage key={item.id} message={item} copied={copied} onCopy={copyResponse} onFollowUp={submitFollowUp} showActions={item.id === lastTutorId} />)}{status === "thinking" && <div className="tutor-thinking" role="status"><span>AI IS THINKING...</span><i /><i /><i /></div>}{error && <div className="tutor-error" role="alert"><strong>{error}</strong><button type="button" onClick={() => { setError(""); setStatus("ready"); }}>Try again</button></div>}</div><form className="tutor-input" onSubmit={(event) => { event.preventDefault(); submitQuestion(); }}><label htmlFor="tutor-question">03 / QUESTION INPUT</label><textarea id="tutor-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={onInputKeyDown} placeholder="Ask your doubt here..." rows="4" disabled={status === "thinking"} /><div className="tutor-input-footer"><span>CTRL + ENTER TO ASK</span><button type="submit" disabled={status === "thinking" || !question.trim()}>ASK TUTOR →</button></div></form></section></main></div>;
}
