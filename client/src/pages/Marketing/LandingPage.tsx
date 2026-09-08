import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight, Check, Menu, X, Sparkles, BookOpen, FileText,
  Download, Users, Shield, Clock, Zap, Globe, GraduationCap,
  ChevronDown, Star, Play, Award, TrendingUp, Layers,
} from 'lucide-react';
import clsx from 'clsx';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }
  }),
};

const stagger = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

/* ═══ NAV ═══ */
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Subjects', href: '#subjects' },
  { label: 'Pricing', href: '#pricing' },
];

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => setScrolled(window.scrollY > 20));
  }

  return (
    <header className={clsx(
      'fixed top-0 inset-x-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-surface-100' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center shadow-brand">
              <BookOpen className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-surface-900">Pak Test</span>
          </a>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors">{l.label}</a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-surface-700 hover:text-surface-900 px-4 py-2 transition-colors">Sign In</Link>
            <Link to="/login" className="btn-primary btn-sm">Get Started Free</Link>
          </div>

          <button className="lg:hidden btn-ghost p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden py-4 border-t border-surface-100 animate-slide-down">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-sm font-medium text-surface-700">{l.label}</a>
            ))}
            <div className="flex gap-3 mt-4 pt-4 border-t border-surface-100">
              <Link to="/login" className="btn-secondary flex-1">Sign In</Link>
              <Link to="/login" className="btn-primary flex-1">Get Started</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ═══ HERO ═══ */
function Hero() {
  return (
    <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 overflow-hidden">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 border border-brand-100 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-brand-700">Pakistan's Smart Paper Generator</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-900 leading-[1.1] tracking-tight">
              Create Professional Exam Papers{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">in Minutes</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-surface-600 leading-relaxed max-w-xl">
              Pakistan's intelligent paper generation platform for schools, academies and teachers.
              Select your class, subject and chapters — get a perfectly formatted, print-ready exam paper instantly.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" className="btn-primary btn-lg">
                Generate Your First Paper <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#how-it-works" className="btn-secondary btn-lg">
                <Play className="w-4 h-4" /> See How It Works
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {['M', 'A', 'S', 'K'].map((l, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">{l}</div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-surface-600 mt-0.5">Trusted by <span className="font-semibold text-surface-900">500+</span> schools across Pakistan</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══ DASHBOARD PREVIEW MOCKUP ═══ */
function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-3xl blur-2xl transform rotate-2" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-surface-200 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-surface-50 border-b border-surface-100">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs text-surface-500">Pak Test — Paper Generator</span>
        </div>
        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {['Class', 'Subject', 'Chapters', 'Generate'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                  i < 2 ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500'
                )}>{i + 1}</div>
                <span className={clsx('text-xs font-medium', i < 2 ? 'text-surface-900' : 'text-surface-400')}>{step}</span>
                {i < 3 && <div className={clsx('w-6 h-0.5', i < 1 ? 'bg-brand-500' : 'bg-surface-200')} />}
              </div>
            ))}
          </div>
          {/* Subject cards */}
          <div className="grid grid-cols-3 gap-2">
            {['Mathematics', 'Physics', 'English'].map((sub, i) => (
              <div key={sub} className={clsx(
                'p-3 rounded-xl border text-xs font-medium text-center transition-all',
                i === 0 ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-600'
              )}>
                {sub}
              </div>
            ))}
          </div>
          {/* Stats bar */}
          <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
            <span className="text-xs text-surface-600">Total Marks</span>
            <span className="text-lg font-bold text-brand-600">75</span>
          </div>
          {/* Generate button */}
          <div className="w-full py-3 bg-brand-600 text-white text-sm font-semibold rounded-xl text-center shadow-brand">
            Generate Paper ✨
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl border border-surface-100 px-4 py-3 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Download className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div className="text-xs text-surface-500">Paper Ready</div>
          <div className="text-sm font-bold text-surface-900">PDF Generated</div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ TRUSTED SCHOOLS ═══ */
function TrustedBy() {
  const schools = ['Punjab Board', 'Federal Board', 'Sindh Board', 'KPK Board', 'Cambridge O/A Level', 'Aga Khan'];
  return (
    <section className="py-12 border-y border-surface-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-surface-500 mb-8">Trusted by educational boards and institutions across Pakistan</p>
        <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
          {schools.map(s => (
            <span key={s} className="text-sm font-semibold text-surface-400 hover:text-surface-600 transition-colors">{s}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ STATS ═══ */
function Stats() {
  const stats = [
    { value: '10,000+', label: 'Papers Generated' },
    { value: '500+', label: 'Schools Trust Us' },
    { value: '< 2 min', label: 'Average Generation' },
    { value: '1–12', label: 'Classes Supported' },
  ];
  return (
    <section className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="font-display text-3xl lg:text-4xl font-bold text-surface-900">{s.value}</div>
              <div className="text-sm text-surface-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ HOW IT WORKS ═══ */
function HowItWorks() {
  const steps = [
    { icon: GraduationCap, title: 'Select Class & Board', desc: 'Choose from Classes 1-12 with Punjab, Federal and other boards.' },
    { icon: BookOpen, title: 'Pick Subject & Chapters', desc: 'Select your subject and the specific chapters to cover.' },
    { icon: Layers, title: 'Configure Paper Pattern', desc: 'Set MCQs, short and long questions with custom marks.' },
    { icon: Zap, title: 'Generate & Download', desc: 'Get a professionally formatted PDF ready to print.' },
  ];
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-brand-600 uppercase tracking-wider">How It Works</span>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-surface-900 mt-3">Four Simple Steps to a Perfect Exam Paper</h2>
          <p className="text-surface-600 mt-4">No more spending hours manually setting papers. Our intelligent system does the heavy lifting.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              <div className="card p-6 h-full">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-brand-600" />
                </div>
                <div className="text-xs font-bold text-brand-600 mb-2">STEP {i + 1}</div>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{step.title}</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{step.desc}</p>
              </div>
              {i < 3 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-surface-200" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ FEATURES ═══ */
function Features() {
  const features = [
    { icon: Shuffle, title: 'Smart Randomization', desc: 'Every paper is unique — questions are intelligently shuffled for exam integrity.' },
    { icon: FileText, title: 'Multiple Question Types', desc: 'MCQs, short questions, and essay questions with customizable marks.' },
    { icon: Globe, title: 'Urdu & English Medium', desc: 'Full RTL support for Urdu papers with proper Nastaliq typography.' },
    { icon: Users, title: 'Teacher Role Management', desc: 'Each teacher sees only their assigned subjects and classes.' },
    { icon: Shield, title: 'Secure & Private', desc: 'JWT authentication, role-based access, and encrypted data storage.' },
    { icon: Clock, title: 'Save & Reuse', desc: 'All papers are saved in your account — duplicate, edit, or reprint anytime.' },
    { icon: Download, title: 'Print-Ready PDF', desc: 'Professional A4 PDFs with school branding, headers, and answer keys.' },
    { icon: Award, title: 'Answer Keys & OMR', desc: 'Auto-generated answer sheets and bubble sheets for MCQ marking.' },
  ];

  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Features</span>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-surface-900 mt-3">Everything You Need for Professional Paper Setting</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="card p-6 group hover:border-brand-200 hover:shadow-brand/10"
            >
              <div className="w-11 h-11 bg-surface-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-50 transition-colors">
                <f.icon className="w-5 h-5 text-surface-600 group-hover:text-brand-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-surface-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-surface-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ SUBJECTS ═══ */
function Subjects() {
  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu',
    'Computer Science', 'Islamiat', 'Pakistan Studies', 'General Science', 'Social Studies', 'Economics',
  ];
  return (
    <section id="subjects" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Curriculum</span>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-surface-900 mt-3">All Major Subjects Covered</h2>
          <p className="text-surface-600 mt-4">From Class 1 to 12 — every subject in the Pakistani curriculum is supported.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {subjects.map(s => (
            <span key={s} className="px-5 py-2.5 bg-surface-50 border border-surface-200 rounded-full text-sm font-medium text-surface-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all cursor-default">
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ TESTIMONIALS ═══ */
function Testimonials() {
  const testimonials = [
    { name: 'Ahmad Raza', role: 'Mathematics Teacher, Lahore', text: 'I used to spend 3 hours setting a single paper. Now it takes less than 5 minutes. The randomization ensures no two papers are the same.' },
    { name: 'Fatima Khan', role: 'School Principal, Islamabad', text: 'Our entire teaching staff uses Pak Test. The admin dashboard gives us complete oversight of all papers generated.' },
    { name: 'Muhammad Ali', role: 'Physics Teacher, Faisalabad', text: 'The Urdu medium support is excellent. Papers look professional and print perfectly every time.' },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Testimonials</span>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-surface-900 mt-3">Loved by Teachers Across Pakistan</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card p-6"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-surface-700 leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">{t.name.charAt(0)}</div>
                <div>
                  <div className="text-sm font-semibold text-surface-900">{t.name}</div>
                  <div className="text-xs text-surface-500">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ PRICING ═══ */
function Pricing() {
  const plans = [
    { name: 'Starter', price: 'Rs. 3,000', period: 'per month', features: ['50 papers/month', '5 teacher accounts', 'All subjects', 'PDF download', 'Email support'] },
    { name: 'Professional', price: 'Rs. 6,000', period: 'per month', features: ['Unlimited papers', 'Unlimited teachers', 'School branding', 'Answer keys & OMR', 'Priority support', 'Paper analytics'], featured: true },
    { name: 'Enterprise', price: 'Custom', period: 'contact us', features: ['Everything in Pro', 'Dedicated server', 'Custom integrations', 'SLA guarantee', 'Training sessions', 'API access'] },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Pricing</span>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-surface-900 mt-3">Simple, Transparent Pricing</h2>
          <p className="text-surface-600 mt-4">Choose the plan that fits your school. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name} className={clsx(
              'card p-8 relative',
              plan.featured && 'border-brand-500 shadow-xl ring-2 ring-brand-500/20'
            )}>
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-full shadow-brand">Most Popular</span>
                </div>
              )}
              <h3 className="font-display text-xl font-bold text-surface-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-surface-900">{plan.price}</span>
                <span className="text-sm text-surface-500">/ {plan.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-surface-700">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/login" className={clsx(
                'mt-8 w-full btn',
                plan.featured ? 'btn-primary' : 'btn-secondary'
              )}>
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ FAQ ═══ */
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: 'How does paper generation work?', a: 'Simply select your class, subject, and chapters. Our system pulls questions from the question bank, applies your chosen pattern, and generates a professional PDF in under 2 minutes.' },
    { q: 'Can I edit the generated paper?', a: 'Yes! After generation, you can edit questions, change marks, reorder sections, and modify formatting before downloading.' },
    { q: 'Do you support Urdu medium papers?', a: 'Absolutely. We support English, Urdu, and bilingual papers with proper RTL layout and Nastaliq font rendering.' },
    { q: 'Is my data secure?', a: 'Yes. We use JWT authentication, encrypted passwords, and role-based access control. Teachers can only access their assigned subjects.' },
    { q: 'Can multiple teachers use one account?', a: 'Yes. School admins can create unlimited teacher accounts, each with their own subject assignments and permissions.' },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-brand-600 uppercase tracking-wider">FAQ</span>
          <h2 className="font-display text-3xl font-bold text-surface-900 mt-3">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-surface-900 pr-4">{faq.q}</span>
                <ChevronDown className={clsx('w-5 h-5 text-surface-400 transition-transform flex-shrink-0', open === i && 'rotate-180')} />
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm text-surface-600 leading-relaxed animate-slide-down">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ CTA ═══ */
function CTA() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="gradient-brand rounded-3xl p-10 lg:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
          <div className="relative">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white">Ready to Transform Your Paper Setting?</h2>
            <p className="text-white/80 mt-4 text-lg max-w-xl mx-auto">Join 500+ schools across Pakistan. Start generating professional exam papers today.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/login" className="btn bg-white text-brand-700 hover:bg-white/90 btn-lg shadow-xl">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ FOOTER ═══ */
function Footer() {
  return (
    <footer className="bg-surface-900 text-surface-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 pb-10 border-b border-surface-800">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center">
                <BookOpen className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white">Pak Test</span>
            </div>
            <p className="text-sm text-surface-400 leading-relaxed">Pakistan's intelligent exam paper generation platform for schools and academies.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="text-sm hover:text-white transition-colors">How It Works</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Support</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-sm hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-sm hover:text-white transition-colors">WhatsApp</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4">
          <p className="text-sm text-surface-500">&copy; {new Date().getFullYear()} Pak Test Software. All rights reserved.</p>
          <p className="text-sm text-surface-500 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Built for Pakistani Classrooms
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ═══ SHUFFLE ICON (inline since not in lucide) ═══ */
function Shuffle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <TrustedBy />
      <Stats />
      <HowItWorks />
      <Features />
      <Subjects />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
