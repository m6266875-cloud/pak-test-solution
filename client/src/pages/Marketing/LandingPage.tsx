import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Menu,
  X,
  Shuffle,
  FileEdit,
  Users,
  Download,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import ExamPaperMockup from './components/ExamPaperMockup';
import BoardStrip from './components/BoardStrip';
import PricingCard from './components/PricingCard';
import './marketing.css';

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Boards', href: '#boards' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
];

const CAPABILITIES = [
  {
    icon: Shuffle,
    title: 'Randomised, board-pattern papers',
    body: 'Pick class, subject and chapters — the generator assembles a fresh paper from your question bank in the exact mark distribution your board expects.',
  },
  {
    icon: FileEdit,
    title: 'Edit every question by hand',
    body: 'Swap a question, adjust marks, or reorder the paper after generation. Nothing is locked once it\u2019s made.',
  },
  {
    icon: Users,
    title: 'One login per teacher, one view for admins',
    body: 'Teachers work in their own subjects. School admins see every paper set across the institute, with a full audit trail.',
  },
  {
    icon: Download,
    title: 'Answer keys and bubble sheets included',
    body: 'Every paper can export with a marking key and an OMR-style bubble sheet, formatted and ready to print.',
  },
];

const STATS = [
  { value: '< 2 min', label: 'to a finished paper' },
  { value: '1st\u201312th', label: 'grades covered' },
  { value: '5 yrs', label: 'of past papers indexed' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mkt">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="mkt-nav">
        <div className="mkt-container mkt-nav-row">
          <a href="#top" className="mkt-logo">
            <span className="mkt-logo-mark">PTS</span>
            <span className="mkt-logo-word">Pak Test Solution</span>
          </a>

          <nav className="mkt-nav-links">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>

          <div className="mkt-nav-actions">
            <Link to="/login" className="mkt-link-cta">Sign in</Link>
            <a href="#pricing" className="mkt-btn mkt-btn-primary">
              Start free trial
            </a>
          </div>

          <button
            className="mkt-menu-btn"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="mkt-mobile-menu">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <a href="#pricing" className="mkt-btn mkt-btn-primary" onClick={() => setMenuOpen(false)}>
              Start free trial
            </a>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section id="top" className="mkt-hero">
        <div className="mkt-container mkt-hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mkt-hero-copy"
          >
            <p className="mkt-eyebrow">Punjab Board &amp; beyond</p>
            <h1 className="mkt-h1">
              Set a board-standard exam paper in the time it takes to mark the register.
            </h1>
            <p className="mkt-hero-sub">
              Pak Test Solution builds exam papers from your own question bank —
              correctly weighted, board-formatted, and ready to print — so you spend
              your evening on lesson planning, not paper setting.
            </p>
            <div className="mkt-hero-actions">
              <a href="#pricing" className="mkt-btn mkt-btn-primary mkt-btn-lg">
                Start free trial <ArrowRight size={18} />
              </a>
              <a href="#how-it-works" className="mkt-btn mkt-btn-ghost mkt-btn-lg">
                See how it works
              </a>
            </div>

            <dl className="mkt-stat-row">
              {STATS.map((s) => (
                <div key={s.label} className="mkt-stat">
                  <dt>{s.value}</dt>
                  <dd>{s.label}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="mkt-hero-visual"
          >
            <ExamPaperMockup />
          </motion.div>
        </div>
      </section>

      {/* ── Boards strip ────────────────────────────────────── */}
      <section id="boards" className="mkt-boards">
        <div className="mkt-container">
          <p className="mkt-section-kicker">Set up for the curricula Pakistani schools actually teach</p>
          <BoardStrip />
        </div>
      </section>

      {/* ── Capabilities ────────────────────────────────────── */}
      <section id="how-it-works" className="mkt-capabilities">
        <div className="mkt-container">
          <div className="mkt-section-head">
            <h2 className="mkt-h2">Built around how paper-setting actually works</h2>
            <p className="mkt-section-sub">
              Every part of the flow — question bank, generation, formatting, printing —
              stays in your control. The software does the counting and shuffling.
            </p>
          </div>

          <div className="mkt-capability-grid">
            {CAPABILITIES.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="mkt-capability-card"
              >
                <c.icon size={22} strokeWidth={1.75} />
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / roles strip ─────────────────────────────── */}
      <section className="mkt-trust">
        <div className="mkt-container mkt-trust-grid">
          <div className="mkt-trust-item">
            <Clock size={20} />
            <div>
              <h4>Papers saved, not lost</h4>
              <p>Every paper you generate stays in your account, ready to reprint or duplicate next term.</p>
            </div>
          </div>
          <div className="mkt-trust-item">
            <ShieldCheck size={20} />
            <div>
              <h4>An audit trail for admins</h4>
              <p>School admins can see who generated what, and when — useful when a paper needs checking.</p>
            </div>
          </div>
          <div className="mkt-trust-item">
            <Users size={20} />
            <div>
              <h4>Unlimited teacher accounts</h4>
              <p>Add every teacher in your institute under one school account, at no extra cost per seat.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="mkt-pricing">
        <div className="mkt-container">
          <div className="mkt-section-head">
            <h2 className="mkt-h2">Pricing that scales with the school year</h2>
            <p className="mkt-section-sub">
              One flat institute price. Every teacher account, every board, every paper included.
            </p>
          </div>

          <div className="mkt-pricing-grid">
            <PricingCard
              name="Term"
              price="Rs. 6,000"
              period="3 months"
              features={[
                'Unlimited papers generated',
                'Unlimited papers saved',
                'All boards &amp; subjects'.replace('&amp;', '&'),
                'Unlimited teacher accounts',
                'Past papers library',
              ]}
            />
            <PricingCard
              name="Year (half)"
              price="Rs. 10,000"
              period="6 months"
              featured
              features={[
                'Everything in Term',
                'Priority WhatsApp support',
                'Early access to new boards',
              ]}
            />
            <PricingCard
              name="Full year"
              price="Rs. 12,000"
              period="12 months"
              features={[
                'Everything in Year (half)',
                'Best value per month',
                'Locked-in renewal price',
              ]}
            />
          </div>

          <p className="mkt-pricing-note">
            Not sure yet? <a href="#contact">Start with a free trial</a> — no card required.
          </p>
        </div>
      </section>

      {/* ── CTA / contact ───────────────────────────────────── */}
      <section id="contact" className="mkt-cta">
        <div className="mkt-container mkt-cta-inner">
          <h2 className="mkt-h2">Ready to hand off your next paper?</h2>
          <p>Set up your institute account today — most schools are generating papers within the hour.</p>
          <div className="mkt-hero-actions" style={{ justifyContent: 'center' }}>
            <a href="#pricing" className="mkt-btn mkt-btn-primary mkt-btn-lg">
              Start free trial <ArrowRight size={18} />
            </a>
            <Link to="/login" className="mkt-btn mkt-btn-ghost mkt-btn-lg">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="mkt-footer">
        <div className="mkt-container mkt-footer-grid">
          <div>
            <span className="mkt-logo-mark small">PTS</span>
            <p>Pak Test Solution &mdash; exam papers, set properly.</p>
          </div>
          <div className="mkt-footer-cols">
            <div>
              <h5>Product</h5>
              <a href="#how-it-works">How it works</a>
              <a href="#boards">Boards</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div>
              <h5>Account</h5>
              <Link to="/login">Sign in</Link>
              <a href="#pricing">Start trial</a>
            </div>
            <div>
              <h5>Contact</h5>
              <a href="https://wa.me/923404242604">WhatsApp support</a>
            </div>
          </div>
        </div>
        <div className="mkt-container mkt-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Pak Test Solution. All rights reserved.</span>
          <span className="mkt-footer-check"><Check size={14} /> Built for Pakistani classrooms</span>
        </div>
      </footer>
    </div>
  );
}
