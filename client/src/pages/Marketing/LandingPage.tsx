/**
 * PakTest Solution — Landing page ("Zinc Green Premium" editorial redesign).
 *
 * Design system (scoped to this page, see landing.css):
 *   Fraunces (display serif) · General Sans (UI/body) · IBM Plex Mono (data)
 *   deep zinc green + warm beige + brass palette · paper-grain texture ·
 *   hairline borders · asymmetric editorial grid.
 *
 * Content follows paktestsolution.com's information architecture:
 * courses (PTB, FBISE, Oxford, AFAQ, Gohar, B.A. PU) · Why PTS · past-paper
 * data · pricing packages (Rs 6,000 / 10,000 / 12,000) · school management
 * add-on · teacher & institute sign-in · WhatsApp/call quick contact.
 *
 * WhatsApp integration: wa.me deep links, floating action button, contact
 * cards, hero link, CTA buttons, footer links. Routes, auth targets and
 * behaviour are unchanged.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import {
  ArrowRight, Menu, X, Phone, Mail, Check, Plus, Award, GraduationCap,
  BookOpen, Layers, Zap, Globe, Users, Shield, Clock, Download, FileCheck,
  Workflow, ClipboardCheck, PenLine, History, ListTree, Archive, Headphones,
} from 'lucide-react';
import { Infinity as InfinityIcon } from 'lucide-react';
import clsx from 'clsx';
import Logo, { LogoMark } from '../../components/common/Logo';
import './landing.css';

/* ═══ Contact constants (paktestsolution.com) ═══════════════════════════ */
export const WHATSAPP_NUMBER = '923404242604';
export const WHATSAPP_DISPLAY = '0340 4242604';
export const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum! I'd like to know more about PakTest Solution's exam paper generator.";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
export const PHONE_DISPLAY = '0309 6969640';
export const PHONE_TEL = '+923096969640';
export const CONTACT_EMAIL = 'info@paktestsolution.com';

/* ═══ WhatsApp icon (official glyph, inline SVG) ════════════════════════ */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/* ═══ motion presets (slow, premium) ════════════════════════════════════ */
const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.75, delay: i * 0.1, ease: EASE },
  }),
};
const view = { once: true, margin: '-60px 0px' } as const;

/* ═══ scroll-triggered counter ══════════════════════════════════════════ */
function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setSeen(true); obs.disconnect(); }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [seen]);
  return { ref, seen };
}

function CountUp({ to, suffix, duration = 1700 }: { to: number; suffix?: string; duration?: number }) {
  const { ref, seen } = useInViewOnce<HTMLSpanElement>();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!seen) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);
  return (
    <span ref={ref}>
      {val.toLocaleString('en-US')}
      {suffix && <span className="suffix">{suffix}</span>}
    </span>
  );
}

/* ═══ NAV ═══════════════════════════════════════════════════════════════ */
const NAV_LINKS = [
  { label: 'Home', href: '#top' },
  { label: 'Courses', href: '#courses' },
  { label: 'Past Papers', href: '#past-papers' },
  { label: 'Subjects', href: '#subjects' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
];

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={clsx('lp-nav', scrolled && 'lp-nav--solid')}>
        <div className="lp-nav-inner">
          <a href="#top" aria-label="PakTest Solution — home">
            <Logo />
          </a>

          <nav className="lp-nav-links" aria-label="Main">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>

          <div className="lp-nav-cta">
            <Link to="/login" className="lp-nav-signin">Sign In</Link>
            <Link to="/login" className="lp-btn lp-btn--sm">Trial Account</Link>
          </div>

          <button className="lp-burger" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X className="lp-icon-sm" /> : <Menu className="lp-icon-sm" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="lp-mobile">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="lp-m-link" onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <div className="lp-m-actions">
            <Link to="/login" className="lp-btn lp-btn--outline" onClick={() => setOpen(false)}>Sign In</Link>
            <Link to="/login" className="lp-btn" onClick={() => setOpen(false)}>Trial Account</Link>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ HERO ══════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section id="top" className="lp-hero">
      <div className="lp-wrap">
        <div className="lp-hero-grid">
          {/* copy */}
          <div className="lp-hero-copy">
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <span className="lp-hero-tag"><span className="dot" /> Pakistan&rsquo;s leading paper-generation platform</span>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="show" className="lp-h1">
              Exam papers <em>worthy</em> of your school&rsquo;s name.
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show" className="lp-lead">
              Board-matched patterns, five years of past-paper data and every major publisher —
              PTB, Federal, Oxford, AFAQ &amp; Gohar — composed into print-ready papers in minutes,
              not evenings.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show" className="lp-hero-ctas">
              <Link to="/login" className="lp-btn lp-btn--lg">
                Start a Trial Account <ArrowRight className="lp-icon-sm" />
              </Link>
              <a href="#pricing" className="lp-btn lp-btn--outline lp-btn--lg">View Packages</a>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show">
              <a className="lp-hero-wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Prefer WhatsApp? {WHATSAPP_DISPLAY}
              </a>
            </motion.div>
          </div>

          {/* photo composition */}
          <motion.div
            className="lp-hero-vis"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
          >
            <div className="lp-hero-photo">
              <img src="/images/hero-teacher.jpg" alt="A teacher reviewing a generated exam paper at her desk" />
              <span className="lp-hero-photo-note">Class 9 · Mathematics · Annual 2026-27</span>
            </div>

            {/* floating paper-preview card */}
            <div className="lp-float-card lp-float-card--paper">
              <span className="lp-fp-wm" aria-hidden="true"><img src="/logos/ptb.png" alt="" /></span>
              <div className="lp-fp-logo"><img src="/logos/ptb.png" alt="PCTB" /></div>
              <div className="lp-fp-title">Mathematics — Paper I</div>
              <div className="lp-fp-sub">75 marks · 3 hours</div>
              <div className="lp-fp-lines"><span /><span /><span /></div>
            </div>

            {/* floating question-bank card */}
            <div className="lp-float-card lp-float-card--bank">
              <span className="lp-float-k"><FileCheck /></span>
              <span>
                <span className="lp-float-t" style={{ display: 'block' }}>Question bank</span>
                <span className="lp-float-v" style={{ display: 'block' }}>board pattern · auto-shuffled</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══ COUNTERS ══════════════════════════════════════════════════════════ */
function Counters() {
  return (
    <section className="lp-counters">
      <div className="lp-counters-grid">
        {[
          { node: <CountUp to={10000} suffix="+" />, label: 'Papers generated' },
          { node: <CountUp to={5000} suffix="+" />, label: 'Teachers visit daily' },
          { node: <CountUp to={500} suffix="+" />, label: 'Schools & academies' },
          { node: <span>1–12</span>, label: 'Classes supported' },
        ].map((s) => (
          <div className="lp-counter" key={s.label}>
            <div className="lp-counter-num">{s.node}</div>
            <div className="lp-counter-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ COURSES WE SUPPORT (real catalog entries) ═══════════════════════ */
const COURSES = [
  { code: 'ptb', name: 'Punjab Curriculum & Textbook Board (PCTB)', classes: 'Classes 1–12' },
  { code: 'fbise', name: 'Federal Board (FBISE)', classes: 'Classes 1–12' },
  { code: 'oup', name: 'Oxford University Press Pakistan', classes: 'Classes 1–8' },
  { code: 'afaq', name: 'AFAQ Publishers', classes: 'Classes 1–8' },
  { code: 'gohar', name: 'GOHAR Publishers', classes: 'Classes 1–8' },
  { code: 'bapu', name: 'University of the Punjab — B.A. / Associate Degree', classes: 'B.A. & A.D. Programs' },
];

function CourseTile({ course, index }: { course: (typeof COURSES)[number]; index: number }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const monogram = course.code.slice(0, 2).toUpperCase();
  return (
    <motion.div
      className="lp-course"
      variants={fadeUp}
      custom={index % 3}
      initial="hidden"
      whileInView="show"
      viewport={view}
    >
      <div className="lp-course-logo">
        {logoFailed ? (
          <span className="lp-course-mono" aria-hidden="true">{monogram}</span>
        ) : (
          <img src={`/logos/${course.code}.png`} alt="" onError={() => setLogoFailed(true)} />
        )}
      </div>
      <div className="lp-course-name">{course.name}</div>
      <span className="lp-course-classes">{course.classes}</span>
    </motion.div>
  );
}

function Courses() {
  return (
    <section id="courses" className="lp-sec lp-sec--cream">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Available courses</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Boards &amp; publishers, <em>covered.</em>
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            The exact courses that live in the product today — government boards and private
            publishers you select from the very first screen of the generator.
          </motion.p>
        </div>
        <div className="lp-courses-grid">
          {COURSES.map((c, i) => (
            <CourseTile key={c.code} course={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ WHY PTS IS THE BEST (paktestsolution.com feature set) ════════════ */
function WhyPTS() {
  const features = [
    { icon: Workflow, title: 'Fully automatic system', desc: 'Pick the scope and pattern — the system composes, numbers and formats the paper for you.' },
    { icon: ClipboardCheck, title: 'According to board pattern', desc: 'Blueprints follow real board paper patterns for each class and subject.' },
    { icon: PenLine, title: 'Manual editing mode', desc: 'Prefer the last word? Swap, reorder or rewrite any question before printing.' },
    { icon: History, title: 'Last 5 years of past-paper data', desc: 'A growing, indexed archive of past-paper questions you can filter by chapter and topic.' },
    { icon: ListTree, title: 'Topic & chapter selection', desc: 'Generate from the exact chapters your class has covered — nothing more, nothing less.' },
    { icon: Users, title: 'Separate teachers portal', desc: 'Each teacher signs in to their own subjects and classes — scoped, private, tidy.' },
    { icon: InfinityIcon, title: 'Generate unlimited papers', desc: 'Every paper is re-shuffled from the bank, so no two papers are ever the same.' },
    { icon: Archive, title: 'Save unlimited papers', desc: 'Every paper is stored in your account — duplicate, edit or reprint anytime.' },
    { icon: Headphones, title: 'In-time telephonic support', desc: 'Real people on WhatsApp and phone, six days a week — a person, not a menu.' },
  ];
  return (
    <section id="features" className="lp-sec lp-sec--paper">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Why PTS</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Why PTS is the best.
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            Nine reasons schools keep renewing their packages, year after year.
          </motion.p>
        </div>

        <motion.div className="lp-why-grid" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>
          {features.map((f, i) => (
            <div className="lp-why" key={f.title}>
              <span className="lp-why-no">{String(i + 1).padStart(2, '0')}</span>
              <div className="lp-why-ic"><f.icon /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ PAST PAPERS ═══════════════════════════════════════════════════════ */
function PastPapers() {
  const types = [
    { no: '01', name: 'Exercise questions', note: 'from every chapter of the book' },
    { no: '02', name: 'Past-paper questions', note: 'last 5 years, indexed' },
    { no: '03', name: 'Conceptual questions', note: 'written to board standard' },
    { no: '04', name: 'Review questions', note: 'end-of-unit coverage' },
    { no: '05', name: 'Example questions', note: 'with worked solutions' },
  ];
  return (
    <section id="past-papers" className="lp-sec lp-sec--beige">
      <div className="lp-wrap">
        <div className="lp-past-grid">
          <div>
            <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Past papers</motion.span>
            <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
              Five years of papers, <em>indexed and ready.</em>
            </motion.h2>
            <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
              The question bank is anchored to real past papers and book exercises across Urdu,
              English and dual mediums — for the classes schools ask for most.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} initial="hidden" whileInView="show" viewport={view}>
              <div className="lp-chips" style={{ marginTop: 26 }}>
                {['Urdu Medium', 'English Medium', 'Dual Medium', '9th', '10th', 'FSc', 'ICS', 'I.COM', 'F.A'].map((m) => (
                  <span key={m} className="lp-chip">{m}</span>
                ))}
              </div>
              <p className="lp-past-note">
                <Award className="lp-icon-sm" />
                Past-paper downloads are included in every package — no separate fee.
              </p>
            </motion.div>
          </div>

          <motion.div className="lp-past-list" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            {types.map((t) => (
              <div className="lp-past-row" key={t.no}>
                <b>{t.no}</b>
                <span>{t.name}</span>
                <small>{t.note}</small>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══ HOW IT WORKS ══════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { icon: GraduationCap, title: 'Select course & class', desc: 'PTB, Federal, Oxford, AFAQ, Gohar — then the class and session.' },
    { icon: BookOpen, title: 'Pick subject & chapters', desc: 'Choose exactly the chapters your class has covered.' },
    { icon: Layers, title: 'Set the paper pattern', desc: 'MCQs, short and long questions with your marks scheme.' },
    { icon: Zap, title: 'Generate & print', desc: 'A formatted, watermarked A4 paper — ready in under two minutes.' },
  ];
  return (
    <section id="how-it-works" className="lp-sec lp-sec--cream">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>How it works</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Four quiet steps, <em>one finished paper.</em>
          </motion.h2>
        </div>

        <div className="lp-steps">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              className="lp-step"
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={view}
            >
              <div className="lp-step-no">{i + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ DASHBOARD PREVIEW (CSS browser frame of the real app) ════════════ */
function DashboardPreview() {
  return (
    <section className="lp-sec lp-sec--paper" style={{ paddingTop: 96 }}>
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Inside the studio</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            A workspace built for <em>paper setters.</em>
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            Fifteen guided steps from course to print — with your school&rsquo;s crest, the board&rsquo;s
            watermark and an answer key, on every paper.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={view}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className="lp-frame" aria-hidden="true">
            <div className="lp-frame-bar">
              <div className="lp-frame-dots"><span /><span /><span /></div>
              <div className="lp-frame-url">app.paktestsolution.com/papers/generate</div>
            </div>
            <div className="lp-frame-body">
              <div className="lp-frame-side">
                <div className="lp-frame-side-logo"><LogoMark /> PakTest</div>
                <div className="lp-frame-nav">
                  <span>Dashboard</span>
                  <span className="on">Generate Paper</span>
                  <span>My Papers</span>
                  <span>Question Bank</span>
                  <span>Administration</span>
                </div>
              </div>
              <div className="lp-frame-main">
                <div className="lp-frame-rail">
                  <span className="done">✓ Course</span>
                  <span className="done">✓ Session</span>
                  <span className="on">3 · Class</span>
                  <span>4 Subject</span>
                  <span>5 Book</span>
                  <span>… 15</span>
                </div>
                <div className="lp-frame-doc">
                  <span className="lp-frame-doc-wm"><img src="/logos/ptb.png" alt="" /></span>
                  <div className="lp-frame-doc-head">
                    <div className="lp-frame-doc-school">Govt. High School (Demo)</div>
                    <div className="lp-frame-doc-exam">MATHEMATICS · ANNUAL 2026-27 · PCTB</div>
                    <div className="lp-frame-doc-rule" />
                  </div>
                  <div className="lp-frame-q">
                    <div className="lp-frame-q-label"><span>Section A — Multiple choice</span><i>1 × 15</i></div>
                    <div className="lp-frame-q-lines"><span /><span /><span /></div>
                  </div>
                  <div className="lp-frame-q">
                    <div className="lp-frame-q-label"><span>Section B — Short questions</span><i>2 × 12</i></div>
                    <div className="lp-frame-q-lines"><span /><span /></div>
                  </div>
                  <div className="lp-frame-doc-foot"><span>TIME: 3 HOURS</span><span>TOTAL MARKS: 75</span><span>GENERATED · PAKTEST</span></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ PRICING (real paktestsolution.com packages) ═══════════════════════ */
function Pricing() {
  const plans = [
    { name: 'Package One', price: 'Rs 6,000', validity: 'Validity · 3 months', featured: false },
    { name: 'Package Two', price: 'Rs 10,000', validity: 'Validity · 6 months', featured: true },
    { name: 'Package Three', price: 'Rs 12,000', validity: 'Validity · 1 year', featured: false },
  ];
  const feats = [
    'Generate unlimited papers',
    'Save unlimited papers',
    'Download past papers',
    'All subjects access',
    'Unlimited sub-accounts',
    'Separate teachers portal',
    'Full in-time support',
  ];
  return (
    <section id="pricing" className="lp-sec lp-sec--cream">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Packages</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            One price. <em>Every feature.</em>
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            Packages differ only in duration — every capability is included from day one.
          </motion.p>
        </div>

        <div className="lp-plans">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={clsx('lp-plan', plan.featured && 'lp-plan--featured')}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={view}
            >
              {plan.featured && <span className="lp-plan-tag">Most chosen</span>}
              <div className="lp-plan-name">{plan.name}</div>
              <div className="lp-plan-valid">{plan.validity}</div>
              <div className="lp-plan-price">
                <span className="num">{plan.price}</span>
              </div>
              <div className="lp-plan-rule" />
              <ul className="lp-plan-feats">
                {feats.map((f) => (
                  <li key={f}>
                    <span className="tick"><Check /></span>{f}
                  </li>
                ))}
              </ul>
              <Link to="/login" className={clsx('lp-btn', plan.featured ? 'lp-btn--paper' : 'lp-btn--green')}>
                Join Now <ArrowRight className="lp-icon-xs" />
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="lp-pricing-note">
          Need a custom duration or a campus licence? <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lp-brass)', fontWeight: 600 }}>WhatsApp us</a> — we keep it simple.
        </p>
      </div>
    </section>
  );
}

/* ═══ SCHOOL MANAGEMENT ADD-ON ══════════════════════════════════════════ */
function SchoolManagement() {
  const feats = [
    'Schools & campuses management',
    'Teacher accounts with scoped permissions',
    'Branded papers with your school header',
    'Analytics & audit trail for administrators',
  ];
  return (
    <section className="lp-sec lp-sms">
      <div className="lp-wrap">
        <div className="lp-sms-grid">
          <div>
            <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Add-on</motion.span>
            <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
              Advanced School Management Software, for schools that <em>fly fast.</em>
            </motion.h2>
            <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
              Everything PTS already does for papers — extended to running your whole campus.
            </motion.p>
            <motion.div className="lp-sms-price" variants={fadeUp} custom={3} initial="hidden" whileInView="show" viewport={view}>
              <span className="num">Rs 2,000</span>
              <span className="per">/ month · price starting from</span>
            </motion.div>
            <motion.div variants={fadeUp} custom={4} initial="hidden" whileInView="show" viewport={view} style={{ marginTop: 30 }}>
              <a className="lp-btn lp-btn--paper" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="lp-icon-sm" /> Ask about the add-on
              </a>
            </motion.div>
          </div>
          <motion.ul className="lp-sms-feats" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            {feats.map((f) => (
              <li key={f}><Check className="lp-icon-sm" /> {f}</li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}

/* ═══ TESTIMONIALS ══════════════════════════════════════════════════════ */
function Testimonials() {
  const testimonials = [
    { name: 'Ahmad Raza', role: 'Mathematics Teacher · Lahore', text: 'I used to spend three hours setting a single paper. Now it takes less than five minutes — and no two papers are ever the same.' },
    { name: 'Fatima Khan', role: 'School Principal · Islamabad', text: 'Our entire staff sets papers on PakTest. The admin dashboard gives us oversight of every paper, from every teacher, in one place.' },
    { name: 'Muhammad Ali', role: 'Physics Teacher · Faisalabad', text: 'The Urdu-medium papers print beautifully — proper Nastaliq, board pattern, and the school header on every page.' },
  ];
  return (
    <section className="lp-sec lp-sec--beige">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Testimonials</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Trusted in staff rooms <em>across Pakistan.</em>
          </motion.h2>
        </div>

        <div className="lp-quotes">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.name}
              className="lp-quote"
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={view}
            >
              <div className="lp-quote-mark">&ldquo;</div>
              <p className="lp-quote-text">{t.text}</p>
              <footer className="lp-quote-by">
                <span className="lp-quote-av">{t.name.charAt(0)}</span>
                <span>
                  <span className="lp-quote-name" style={{ display: 'block' }}>{t.name}</span>
                  <span className="lp-quote-role">{t.role}</span>
                </span>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ SUBJECTS ══════════════════════════════════════════════════════════ */
function Subjects() {
  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu',
    'Computer Science', 'Islamiat', 'Pakistan Studies', 'General Science', 'Social Studies', 'Economics',
  ];
  return (
    <section id="subjects" className="lp-sec lp-sec--paper">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Curriculum</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            All major subjects, Class 1 to 12.
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            English and Urdu mediums across every major board syllabus in Pakistan.
          </motion.p>
        </div>

        <motion.div className="lp-chips" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>
          {subjects.map((s) => (
            <span key={s} className="lp-chip">{s}</span>
          ))}
        </motion.div>
        <p className="lp-chip-note">+ MORE SUBJECTS ADDED CONTINUOUSLY</p>
      </div>
    </section>
  );
}

/* ═══ FAQ ═══════════════════════════════════════════════════════════════ */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    { q: 'How does paper generation work?', a: 'Select your course, class, subject and chapters. The system composes questions from the bank using your chosen pattern, and delivers a print-ready paper in under two minutes.' },
    { q: 'Can I edit the generated paper?', a: 'Yes. After generation you can edit questions, change marks, reorder sections and refine formatting before printing — manual editing mode is built in.' },
    { q: 'Do you support Urdu-medium papers?', a: 'Absolutely. English, Urdu and bilingual papers are all supported, with proper RTL layout and Nastaliq typography.' },
    { q: 'Is my school\u2019s data secure?', a: 'Yes. Accounts are role-scoped — teachers only ever reach their own subjects and classes, and administrators get a full audit trail.' },
    { q: 'Can multiple teachers use one account?', a: 'Packages include unlimited sub-accounts. School admins create teacher accounts, each with their own subject assignments and permissions.' },
  ];
  return (
    <section className="lp-sec lp-sec--cream" id="faq">
      <div className="lp-wrap">
        <div className="lp-sec-head" style={{ marginBottom: 40 }}>
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>FAQ</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Frequently asked questions.
          </motion.h2>
        </div>

        <div className="lp-faq">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              className={clsx('lp-faq-row', open === i && 'lp-faq-row--open')}
              variants={fadeUp}
              custom={i * 0.5}
              initial="hidden"
              whileInView="show"
              viewport={view}
            >
              <button className="lp-faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span>{faq.q}</span>
                <Plus className="ic" />
              </button>
              {open === i && (
                <div className="lp-faq-a">
                  <p>{faq.a}</p>
                </div>
              )}
            </motion.div>
          ))}
          <p className="lp-chip-note" style={{ marginTop: 26 }}>
            STILL HAVE QUESTIONS? <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lp-brass)' }}>WHATSAPP US</a> — REAL PEOPLE, FAST ANSWERS.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══ CONTACT (id=contact) ═══════════════════════════════════════════════ */
function Contact() {
  return (
    <section id="contact" className="lp-sec lp-sec--beige">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Contact</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            We&rsquo;re here when you need us.
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            Questions about packages, board patterns or onboarding — reach the team directly.
          </motion.p>
        </div>

        {/* three contact channels */}
        <div className="lp-contact-grid">
          <motion.div className="lp-contact-card" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>
            <div className="lp-contact-ic lp-contact-ic--wa"><WhatsAppIcon /></div>
            <h3 className="lp-h3">WhatsApp</h3>
            <div className="lp-contact-value">{WHATSAPP_DISPLAY}</div>
            <p className="lp-contact-meta">Fastest reply — chat with our team directly on WhatsApp.</p>
            <a className="lp-btn lp-btn--wa-ink" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="lp-icon-sm" /> Chat on WhatsApp
            </a>
          </motion.div>

          <motion.div className="lp-contact-card" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            <div className="lp-contact-ic lp-contact-ic--phone"><Phone /></div>
            <h3 className="lp-h3">Phone</h3>
            <div className="lp-contact-value">{PHONE_DISPLAY}</div>
            <p className="lp-contact-meta">Mon – Sat · 9:00 am – 6:00 pm (PKT). A person, not a menu.</p>
            <a className="lp-btn lp-btn--outline" href={`tel:${PHONE_TEL}`}>
              <Phone className="lp-icon-sm" /> Call us
            </a>
          </motion.div>

          <motion.div className="lp-contact-card" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            <div className="lp-contact-ic lp-contact-ic--mail"><Mail /></div>
            <h3 className="lp-h3">Email</h3>
            <div className="lp-contact-value">{CONTACT_EMAIL}</div>
            <p className="lp-contact-meta">For documents, quotes and partnerships — we reply within one working day.</p>
            <a className="lp-btn lp-btn--outline" href={`mailto:${CONTACT_EMAIL}`}>
              <Mail className="lp-icon-sm" /> Email us
            </a>
          </motion.div>
        </div>

        {/* large green WhatsApp CTA banner */}
        <motion.div
          className="lp-cta-banner"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={view}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div>
            <h3 className="h">Prefer WhatsApp? <em>Chat with a real person.</em></h3>
            <p className="p">
              Get answers about packages, board patterns or Urdu-medium papers before you
              sign up — no forms, no waiting.
            </p>
          </div>
          <div className="btns">
            <a className="lp-btn lp-btn--wa lp-btn--lg" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="lp-icon-sm" /> Chat on WhatsApp
            </a>
            <span className="wa-note">{WHATSAPP_DISPLAY} · REPLIES IN MINUTES</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ FINAL CTA ═════════════════════════════════════════════════════════ */
function CTA() {
  return (
    <section className="lp-sec lp-sec--paper" style={{ paddingTop: 96, paddingBottom: 120 }}>
      <div className="lp-wrap">
        <motion.div
          className="lp-cta-banner"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={view}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div>
            <h3 className="h">Ready to set your best paper yet?</h3>
            <p className="p">Join the schools and teachers generating professional, board-matched papers every week.</p>
          </div>
          <div className="btns">
            <Link to="/login" className="lp-btn lp-btn--paper lp-btn--lg">
              Start a Trial Account <ArrowRight className="lp-icon-sm" />
            </Link>
            <a className="lp-btn lp-btn--ghostlight lp-btn--lg" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="lp-icon-sm" /> WhatsApp us
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ FOOTER ════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="lp-footer-grid">
          <div className="lp-footer-brand">
            <Logo variant="light" />
            <p>
              Pakistan&rsquo;s leading exam paper generation platform — for schools,
              academies and devoted teachers.
            </p>
            <div className="lp-footer-social">
              <a className="wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"><WhatsAppIcon /></a>
              <a href={`tel:${PHONE_TEL}`} aria-label="Call us"><Phone /></a>
              <a href={`mailto:${CONTACT_EMAIL}`} aria-label="Email us"><Mail /></a>
            </div>
            <div className="lp-pay" aria-label="Payment methods">
              <span>JazzCash</span><span>Easypaisa</span><span>Visa</span><span>Mastercard</span><span>Bank Transfer</span>
            </div>
          </div>

          <div className="lp-footer-col">
            <h5>Product</h5>
            <ul>
              <li><a href="#features">Why PTS</a></li>
              <li><a href="#courses">Courses</a></li>
              <li><a href="#past-papers">Past Papers</a></li>
              <li><a href="#subjects">Subjects</a></li>
              <li><a href="#pricing">Packages</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h5>Account</h5>
            <ul>
              <li><Link to="/login">Teacher sign in</Link></li>
              <li><Link to="/login">Institute / school sign in</Link></li>
              <li><Link to="/login">Trial account</Link></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h5>Contact</h5>
            <ul>
              <li>
                <a className="wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> WhatsApp · {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li>
                <a href={`tel:${PHONE_TEL}`}><Phone /> Call · {PHONE_DISPLAY}</a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`}><Mail /> {CONTACT_EMAIL}</a>
              </li>
              <li><a href="#faq">Help &amp; FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p>&copy; {new Date().getFullYear()} PakTest Solution. All rights reserved.</p>
          <p className="lp-mono-note">
            <span className="pulse-dot" /> Built for Pakistani classrooms
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ═══ FLOATING WHATSAPP BUTTON (appears after 2 s) ══════════════════════ */
function FloatingWhatsApp() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 2000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('lp-fab', show && 'lp-fab--show')}
      aria-label="Chat with PakTest Solution on WhatsApp"
    >
      <WhatsAppIcon />
      <span className="lp-fab-tip">Chat with us on WhatsApp</span>
    </a>
  );
}

/* ═══ PAGE ══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="lp-page">
        <Nav />
        <main>
          <Hero />
          <Counters />
          <Courses />
          <WhyPTS />
          <PastPapers />
          <HowItWorks />
          <DashboardPreview />
          <Pricing />
          <SchoolManagement />
          <Testimonials />
          <Subjects />
          <FAQ />
          <Contact />
          <CTA />
        </main>
        <Footer />
        <FloatingWhatsApp />
      </div>
    </MotionConfig>
  );
}
