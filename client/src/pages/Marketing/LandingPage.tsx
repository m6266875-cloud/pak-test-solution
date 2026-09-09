/**
 * Pak Test Software — Landing page (premium editorial redesign).
 *
 * Design system (scoped to this page, see landing.css):
 *   Cormorant Garamond (display) · Manrope (UI/body) · DM Mono (metadata)
 *   Zinc Green + White palette · luxury-academic editorial language.
 *
 * WhatsApp integration:
 *   number 03294429684 → international 923294429684 · wa.me deep links,
 *   floating action button, contact cards + banner, hero link, CTA button,
 *   footer support links. Everything else (routes, auth targets, product
 *   copy, sections) is unchanged in behaviour.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import {
  ArrowRight, Menu, X, Phone, Mail, Check, Plus, FileCheck, Award,
  GraduationCap, BookOpen, Layers, Zap, FileText, Globe, Users, Shield, Clock, Download,
} from 'lucide-react';
import clsx from 'clsx';
import './landing.css';

/* ═══ WhatsApp constants ════════════════════════════════════════════════ */
export const WHATSAPP_NUMBER = '923294429684';
export const WHATSAPP_DISPLAY = '0329 4429684';
export const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum! I'd like to know more about Pak Test Software's exam paper generator.";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
export const PHONE_TEL = '+923294429684';
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

/* ═══ NAV ═══════════════════════════════════════════════════════════════ */
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
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
          <a href="#top" className="lp-brand" aria-label="Pak Test — home">
            <span className="lp-brand-mark">PT</span>
            <span>
              <span className="lp-brand-name" style={{ display: 'block' }}>Pak Test</span>
              <span className="lp-brand-sub">Paper Generator</span>
            </span>
          </a>

          <nav className="lp-nav-links" aria-label="Main">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>

          <div className="lp-nav-cta">
            <Link to="/login" className="lp-nav-signin">Sign In</Link>
            <Link to="/login" className="lp-btn lp-btn--sm">Get Started Free</Link>
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
            <Link to="/login" className="lp-btn" onClick={() => setOpen(false)}>Get Started Free</Link>
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
              <span className="lp-hero-tag"><span className="dot" /> Pakistan&rsquo;s Smart Paper Generator</span>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="show" className="lp-h1">
              Create professional exam papers <em>in minutes.</em>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show" className="lp-lead">
              The intelligent paper-generation platform for Pakistan&rsquo;s schools, academies
              and teachers. Select your class, subject and chapters — receive a perfectly
              formatted, print-ready paper, every time.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show" className="lp-hero-ctas">
              <Link to="/login" className="lp-btn lp-btn--lg">
                Generate Your First Paper <ArrowRight className="lp-icon-sm" />
              </Link>
              <a href="#how-it-works" className="lp-btn lp-btn--outline lp-btn--lg">See How It Works</a>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show">
              <a className="lp-hero-wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Prefer WhatsApp? Chat with us — {WHATSAPP_DISPLAY}
              </a>
            </motion.div>

            <motion.div variants={fadeUp} custom={5} initial="hidden" animate="show" className="lp-hero-proof">
              <span className="lp-hero-proof-note">Trusted by <strong>500+ schools</strong> nationwide</span>
              <span className="lp-hero-proof-note"><strong>10,000+</strong> papers generated</span>
              <span className="lp-hero-proof-note">Classes <strong>1–12</strong> · All boards</span>
            </motion.div>
          </div>

          {/* document visual */}
          <motion.div
            className="lp-hero-vis"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
          >
            <div className="lp-hero-sheet-bg" aria-hidden="true" />
            <PaperSheet />

            <div className="lp-float-chip lp-chip--pdf">
              <span className="k"><FileCheck /></span>
              <span>
                <span className="t">Final paper</span>
                <span className="v" style={{ display: 'block' }}>PDF ready · A4</span>
              </span>
            </div>

            <div className="lp-float-chip lp-chip--marks">
              <span className="k"><Award /></span>
              <span>
                <span className="t">Total</span>
                <span className="v" style={{ display: 'block' }}>75 marks</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* editorial mock exam sheet */
function PaperSheet() {
  return (
    <div className="lp-sheet" aria-hidden="true">
      <div className="lp-sheet-head">
        <div className="lp-sheet-board">The Punjab Board · Class 9</div>
        <div className="lp-sheet-title">Mathematics</div>
        <div className="lp-sheet-sub">Paper 1 · Annual Examination</div>
      </div>
      <div className="lp-sheet-rule" />
      <div className="lp-sheet-rule--thin" />
      <div className="lp-sheet-meta">
        <span>Time: 3 hours</span>
        <span>Total marks: 75</span>
      </div>

      <div className="lp-q-block">
        <div className="lp-q-label"><span>Section A — Multiple choice</span><span className="m">1 × 15</span></div>
        {[0, 1, 2, 3].map((i) => (
          <div className="lp-q-row" key={i}><span className="lp-q-num">{i + 1}.</span><span className="lp-q-line" /></div>
        ))}
      </div>

      <div className="lp-q-block">
        <div className="lp-q-label"><span>Section B — Short questions</span><span className="m">2 × 12</span></div>
        <div className="lp-q-lines">
          {[0, 1, 2].map((i) => <span className="lp-q-line" key={i} />)}
        </div>
      </div>

      <div className="lp-q-block">
        <div className="lp-q-label"><span>Section C — Essay questions</span><span className="m">5 × 4</span></div>
        <div className="lp-q-lines">
          {[0, 1].map((i) => <span className="lp-q-line" key={i} />)}
        </div>
      </div>

      <div className="lp-sheet-bottom">
        <span className="lp-sheet-rollno">Roll No: ______</span>
        <span className="lp-sheet-stamp">Generated · Pak Test</span>
      </div>
    </div>
  );
}

/* ═══ COURSES WE SUPPORT (real catalog entries) ═══════════════════════ */
const COURSES = [
  { code: 'ptb', name: 'Punjab Curriculum & Textbook Board (PCTB)', classes: 'Classes 1–12' },
  { code: 'fbise', name: 'Federal Board (FBISE)', classes: 'Classes 1–12' },
  { code: 'oup', name: 'Oxford University Press Pakistan', classes: 'Classes 1–8' },
  { code: 'afaq', name: 'AFAQ Publishers', classes: 'Classes 1–8' },
  { code: 'gohar', name: 'GOHAR Publishers', classes: 'Classes 1–8' },
];

function CourseTile({ course, index }: { course: (typeof COURSES)[number]; index: number }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const monogram = course.code.slice(0, 2).toUpperCase();
  return (
    <motion.div
      className="lp-course"
      variants={fadeUp}
      custom={index}
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
    <section id="courses" className="lp-sec lp-sec--pale">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Boards &amp; publishers</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Courses we support.
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            The exact courses that live in the product today — government boards and
            private publishers you can select right from the first screen of the app.
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

/* ═══ STATS ═════════════════════════════════════════════════════════════ */
function Stats() {
  const stats = [
    { value: '10,000+', label: 'Papers Generated' },
    { value: '500+', label: 'Schools Trust Us' },
    { value: '< 2 min', label: 'Average Generation' },
    { value: '1–12', label: 'Classes Supported' },
  ];
  return (
    <section className="lp-sec lp-sec--white" style={{ paddingBottom: 40, paddingTop: 84 }}>
      <div className="lp-wrap">
        <motion.div className="lp-stats" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={view} transition={{ duration: 0.8, ease: EASE }}>
          {stats.map((s) => (
            <div className="lp-stat" key={s.label}>
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ HOW IT WORKS ══════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { icon: GraduationCap, title: 'Select Class & Board', desc: 'Choose from Classes 1–12 with Punjab, Federal and other boards.' },
    { icon: BookOpen, title: 'Pick Subject & Chapters', desc: 'Select your subject and the exact chapters to be covered.' },
    { icon: Layers, title: 'Configure Paper Pattern', desc: 'Set MCQs, short and long questions with custom marks.' },
    { icon: Zap, title: 'Generate & Download', desc: 'Receive a professionally formatted PDF, ready to print.' },
  ];
  return (
    <section id="how-it-works" className="lp-sec lp-sec--white">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>How it works</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Four quiet steps from blank page <em>to finished paper.</em>
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            No more hours spent manually setting papers — the system handles composition,
            numbering and formatting for you.
          </motion.p>
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
              <div className="lp-step-no">0{i + 1}</div>
              <div className="lp-step-ic"><step.icon /></div>
              <h3 className="lp-h3">{step.title}</h3>
              <p>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ FEATURES ══════════════════════════════════════════════════════════ */
function Shuffle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

function Features() {
  const features = [
    { icon: Shuffle, title: 'Smart Randomization', desc: 'Every paper is unique — questions are intelligently shuffled for exam integrity.' },
    { icon: FileText, title: 'Multiple Question Types', desc: 'MCQs, short questions and essay questions with customizable marks.' },
    { icon: Globe, title: 'Urdu & English Medium', desc: 'Full RTL support for Urdu papers with proper Nastaliq typography.' },
    { icon: Users, title: 'Teacher Role Management', desc: 'Each teacher sees only their assigned subjects and classes.' },
    { icon: Shield, title: 'Secure & Private', desc: 'JWT authentication, role-based access and encrypted data storage.' },
    { icon: Clock, title: 'Save & Reuse', desc: 'All papers are saved in your account — duplicate, edit or reprint anytime.' },
    { icon: Download, title: 'Print-Ready PDF', desc: 'Professional A4 PDFs with school branding, headers and answer keys.' },
    { icon: Award, title: 'Answer Keys & OMR', desc: 'Auto-generated answer sheets and bubble sheets for MCQ marking.' },
  ];
  return (
    <section id="features" className="lp-sec lp-sec--pale">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Features</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Everything a serious paper setter needs.
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            Built for the way Pakistani schools actually set, print and invigilate exams.
          </motion.p>
        </div>

        <div className="lp-feats">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="lp-feat"
              variants={fadeUp}
              custom={i % 4}
              initial="hidden"
              whileInView="show"
              viewport={view}
            >
              <div className="lp-feat-ic"><f.icon /></div>
              <h3 className="lp-h3">{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
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
    <section id="subjects" className="lp-sec lp-sec--white">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Curriculum</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            All major subjects, from Class 1 to 12.
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
        <p className="lp-chip-note">+ more subjects added continuously</p>
      </div>
    </section>
  );
}

/* ═══ TESTIMONIALS ══════════════════════════════════════════════════════ */
function Testimonials() {
  const testimonials = [
    { name: 'Ahmad Raza', role: 'Mathematics Teacher, Lahore', text: 'I used to spend three hours setting a single paper. Now it takes less than five minutes, and the randomization means no two papers are ever the same.' },
    { name: 'Fatima Khan', role: 'School Principal, Islamabad', text: 'Our entire teaching staff uses Pak Test. The admin dashboard gives us complete oversight of every paper generated.' },
    { name: 'Muhammad Ali', role: 'Physics Teacher, Faisalabad', text: 'The Urdu-medium support is excellent. Papers look professional and print perfectly, every single time.' },
  ];
  return (
    <section className="lp-sec lp-sec--soft">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Testimonials</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Loved by teachers across Pakistan.
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

/* ═══ PRICING ═══════════════════════════════════════════════════════════ */
function Pricing() {
  const plans = [
    { name: 'Starter', price: 'Rs. 3,000', period: 'per month', features: ['50 papers/month', '5 teacher accounts', 'All subjects', 'PDF download', 'Email support'] },
    { name: 'Professional', price: 'Rs. 6,000', period: 'per month', features: ['Unlimited papers', 'Unlimited teachers', 'School branding', 'Answer keys & OMR', 'Priority support', 'Paper analytics'], featured: true },
    { name: 'Enterprise', price: 'Custom', period: 'contact us', features: ['Everything in Pro', 'Dedicated server', 'Custom integrations', 'SLA guarantee', 'Training sessions', 'API access'] },
  ];
  return (
    <section id="pricing" className="lp-sec lp-sec--white">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Pricing</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            Simple, transparent pricing.
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            Choose the plan that fits your school. No hidden fees, ever.
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
              {plan.featured && <span className="lp-plan-tag">Most popular</span>}
              <div className="lp-plan-name">{plan.name}</div>
              <div className="lp-plan-price">
                <span className="num">{plan.price}</span>
                {plan.period !== 'contact us' && <span className="per">/ {plan.period}</span>}
              </div>
              <div className="lp-plan-rule" />
              <ul className="lp-plan-feats">
                {plan.features.map((f) => (
                  <li key={f}><span className="tick"><Check /></span>{f}</li>
                ))}
              </ul>
              <Link to="/login" className={clsx('lp-btn', plan.featured ? 'lp-btn--white' : 'lp-btn--outline')}>
                Get Started <ArrowRight className="lp-icon-xs" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ FAQ ═══════════════════════════════════════════════════════════════ */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    { q: 'How does paper generation work?', a: 'Select your class, subject and chapters. The system composes questions from the bank using your chosen pattern, and delivers a professional PDF in under two minutes.' },
    { q: 'Can I edit the generated paper?', a: 'Yes. After generation you can edit questions, change marks, reorder sections and refine formatting before downloading.' },
    { q: 'Do you support Urdu-medium papers?', a: 'Absolutely. We support English, Urdu and bilingual papers with proper RTL layout and Nastaliq font rendering.' },
    { q: 'Is my data secure?', a: 'Yes. We use JWT authentication, encrypted passwords and role-based access control. Teachers only ever reach their assigned subjects.' },
    { q: 'Can multiple teachers use one account?', a: 'Yes. School admins create teacher accounts, each with their own subject assignments and permissions.' },
  ];
  return (
    <section className="lp-sec lp-sec--soft" id="faq">
      <div className="lp-wrap">
        <div className="lp-sec-head">
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
          <p className="lp-chip-note" style={{ textAlign: 'left', marginTop: 26 }}>
            Still have questions? <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lp-green)', textTransform: 'none', letterSpacing: 0 }}>WhatsApp us</a> — real people, fast answers.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══ CONTACT (id=contact) ═══════════════════════════════════════════════ */
function Contact() {
  return (
    <section id="contact" className="lp-sec lp-sec--pale">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <motion.span className="lp-eyebrow" variants={fadeUp} initial="hidden" whileInView="show" viewport={view}>Contact</motion.span>
          <motion.h2 className="lp-h2" variants={fadeUp} custom={1} initial="hidden" whileInView="show" viewport={view}>
            We&rsquo;re here when you need us.
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp} custom={2} initial="hidden" whileInView="show" viewport={view}>
            Questions about plans, board patterns or onboarding — reach the team directly.
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
            <div className="lp-contact-value">{WHATSAPP_DISPLAY}</div>
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
              Get answers about plans, board patterns or Urdu-medium papers before you sign up —
              no forms, no waiting.
            </p>
          </div>
          <div className="btns">
            <a className="lp-btn lp-btn--wa lp-btn--lg" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="lp-icon-sm" /> Chat on WhatsApp
            </a>
            <span className="wa-note">{WHATSAPP_DISPLAY} · replies in minutes</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ FINAL CTA ═════════════════════════════════════════════════════════ */
function CTA() {
  return (
    <section className="lp-sec lp-sec--white" style={{ paddingTop: 96, paddingBottom: 120 }}>
      <div className="lp-wrap">
        <motion.div
          className="lp-cta-banner"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={view}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div>
            <h3 className="h">Ready to transform your paper setting?</h3>
            <p className="p">Join 500+ schools across Pakistan and start generating professional exam papers today.</p>
          </div>
          <div className="btns">
            <Link to="/login" className="lp-btn lp-btn--white lp-btn--lg">
              Get Started Free <ArrowRight className="lp-icon-sm" />
            </Link>
            <a className="lp-btn lp-btn--wa-ink lp-btn--lg" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
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
            <a href="#top" className="lp-brand" aria-label="Pak Test — home">
              <span className="lp-brand-mark">PT</span>
              <span>
                <span className="lp-brand-name" style={{ display: 'block' }}>Pak Test</span>
                <span className="lp-brand-sub">Paper Generator</span>
              </span>
            </a>
            <p>
              Pakistan&rsquo;s intelligent exam paper-generation platform for schools,
              academies and devoted teachers.
            </p>
            <div className="lp-footer-social">
              <a className="wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"><WhatsAppIcon /></a>
              <a href={`tel:${PHONE_TEL}`} aria-label="Call us"><Phone /></a>
              <a href={`mailto:${CONTACT_EMAIL}`} aria-label="Email us"><Mail /></a>
            </div>
          </div>

          <div className="lp-footer-col">
            <h5>Product</h5>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#subjects">Subjects</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h5>Support</h5>
            <ul>
              <li><a href="#faq">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li>
                <a className="with-ic wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> WhatsApp · 0329 4429684
                </a>
              </li>
              <li>
                <a className="with-ic" href={`tel:${PHONE_TEL}`}><Phone /> 0329 4429684</a>
              </li>
              <li>
                <a className="with-ic" href={`mailto:${CONTACT_EMAIL}`}><Mail /> {CONTACT_EMAIL}</a>
              </li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h5>Legal</h5>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Refund Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p>&copy; {new Date().getFullYear()} Pak Test Software. All rights reserved.</p>
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
      aria-label="Chat with Pak Test on WhatsApp"
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
          <Stats />
          <Courses />
          <HowItWorks />
          <Features />
          <Subjects />
          <Testimonials />
          <Pricing />
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
