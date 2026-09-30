import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Resume from "./pages/Resume";
import Notes from "./pages/Notes";
import Presentation from "./pages/Presentation";
import MindMap from "./pages/MindMap";
import Sheets from "./pages/Sheets";
import Quiz from "./pages/Quiz";
import Tutor from "./pages/Tutor";
import Flashcards from "./pages/Flashcards";
import Planner from "./pages/Planner";
import OCR from "./pages/OCR";

function App() {
  const routerBasename = import.meta.env.BASE_URL || "/";

  return (
    <BrowserRouter basename={routerBasename}>
      <div className="app">
        <Navbar />

        <main className="page-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/presentation" element={<Presentation />} />
            <Route path="/mind-map" element={<MindMap />} />
            <Route path="/sheets" element={<Sheets />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/tutor" element={<Tutor />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/ocr" element={<OCR />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
