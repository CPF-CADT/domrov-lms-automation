import { Check, ChevronRight, CircleAlert, ClipboardCheck, Code2, UsersRound } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./landing.css";

const steps = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Create an assignment",
    description: "Set the instructions, choose a programming language, and add test cases for your class.",
  },
  {
    number: "02",
    icon: Code2,
    title: "Students submit code",
    description: "Students upload their work through the class assignment page.",
  },
  {
    number: "03",
    icon: UsersRound,
    title: "Review results",
    description: "See test outcomes and feedback together, then follow up with students who need help.",
  },
];

function SampleResult() {
  return (
    <section
      id="sample-result"
      aria-labelledby="sample-result-title"
      className="landing-result-card"
    >
      <div className="landing-result-topline">
        <div>
          <p className="landing-eyebrow">Assignment review</p>
          <h2 id="sample-result-title">Sample grading result</h2>
        </div>
        <span className="landing-result-badge"><Check size={15} aria-hidden="true" /> Evaluation complete</span>
      </div>

      <div className="landing-file-row">
        <span className="landing-file-icon"><Code2 size={18} aria-hidden="true" /></span>
        <div>
          <p className="landing-mono landing-filename">list_utils.py</p>
          <p className="landing-muted">Python submission</p>
        </div>
        <span className="landing-sample-tag">Sample</span>
      </div>

      <div className="landing-score-row">
        <div>
          <p className="landing-score">4 <span>of 5</span></p>
          <p className="landing-muted">tests passed</p>
        </div>
        <div className="landing-test-summary" aria-label="4 of 5 tests passed">
          <span className="passed" /><span className="passed" /><span className="passed" />
          <span className="passed" /><span className="failed" />
        </div>
      </div>

      <div className="landing-test-list" aria-label="Test results">
        <div className="landing-test-item">
          <span className="landing-status-dot is-passed" aria-hidden="true" />
          <span>Standard input</span>
          <span className="landing-status-text is-passed">Passed</span>
        </div>
        <div className="landing-test-item">
          <span className="landing-status-dot is-passed" aria-hidden="true" />
          <span>Multiple values</span>
          <span className="landing-status-text is-passed">Passed</span>
        </div>
        <div className="landing-test-item">
          <span className="landing-status-dot is-failed" aria-hidden="true" />
          <span>Empty input</span>
          <span className="landing-status-text is-failed">Failed</span>
        </div>
      </div>

      <div className="landing-feedback">
        <CircleAlert size={17} aria-hidden="true" />
        <div>
          <p className="landing-feedback-title">Empty input failed</p>
          <p>Check that the list contains an item before accessing its first element.</p>
          <code className="landing-mono">items[0]</code>
        </div>
      </div>
      <p className="landing-sample-note">Illustrative sample result</p>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="landing-page">
      <Header variant="landing" />
      <main>
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-kicker"><span /> Programming classes, made easier</p>
              <h1><span>Grade programming</span><span>assignments faster.</span></h1>
              <p className="landing-lede">
                Create assignments, run student submissions against test cases, and review the results in one place.
              </p>
              <div className="landing-actions">
                <a className="landing-button landing-button-primary" href="/login">
                  Log in to start teaching <ChevronRight size={18} aria-hidden="true" />
                </a>
                <a className="landing-sample-link" href="#sample-result">
                  See a sample result <span aria-hidden="true">↓</span>
                </a>
              </div>
              <p className="landing-entry-note">New to Domrov? Log in or create an account to get started.</p>
            </div>
            <SampleResult />
          </div>
        </section>

        <section id="how-it-works" className="landing-how" aria-labelledby="how-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">A clearer workflow</p>
              <h2 id="how-title">How it works</h2>
              <p>From assignment setup to useful feedback, keep the class moving.</p>
            </div>
            <div className="landing-steps">
              {steps.map(({ number, icon: Icon, title, description }) => (
                <article className="landing-step" key={number}>
                  <div className="landing-step-top">
                    <span className="landing-step-icon"><Icon size={20} aria-hidden="true" /></span>
                    <span className="landing-step-number">{number}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <div className="landing-bottom-cta">
              <p>Ready to set up your first class?</p>
              <a href="/login">Log in to start teaching <ChevronRight size={17} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </main>
      <Footer variant="landing" />
    </div>
  );
}
