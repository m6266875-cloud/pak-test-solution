import { motion } from 'framer-motion';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.5 },
  },
};

const row = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function ExamPaperMockup() {
  return (
    <div className="mkt-paper-wrap">
      <motion.div
        className="mkt-paper"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={row} className="mkt-paper-head">
          <div>
            <span className="mkt-paper-school">Govt. High School, Model Town</span>
            <span className="mkt-paper-meta">Class 9th &middot; Physics &middot; Annual 2026</span>
          </div>
          <span className="mkt-paper-marks">Total: 75</span>
        </motion.div>

        <motion.div variants={row} className="mkt-paper-rule" />

        <motion.div variants={row} className="mkt-paper-section">
          <span className="mkt-paper-section-label">Section A &mdash; MCQs</span>
          <span className="mkt-paper-section-marks">10 &times; 1 = 10</span>
        </motion.div>
        {[1, 2, 3].map((n) => (
          <motion.div variants={row} key={n} className="mkt-paper-q mcq">
            <span className="mkt-paper-qnum">{n}.</span>
            <div className="mkt-paper-qline" style={{ width: `${72 - n * 6}%` }} />
          </motion.div>
        ))}

        <motion.div variants={row} className="mkt-paper-section">
          <span className="mkt-paper-section-label">Section B &mdash; Short questions</span>
          <span className="mkt-paper-section-marks">5 &times; 3 = 15</span>
        </motion.div>
        {[4, 5].map((n) => (
          <motion.div variants={row} key={n} className="mkt-paper-q">
            <span className="mkt-paper-qnum">{n}.</span>
            <div className="mkt-paper-qline" style={{ width: `${80 - n * 4}%` }} />
          </motion.div>
        ))}

        <motion.div variants={row} className="mkt-paper-stamp">
          <span>AUTO-GENERATED</span>
        </motion.div>
      </motion.div>

      <motion.div
        className="mkt-paper-badge"
        initial={{ opacity: 0, scale: 0.85, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="mkt-paper-badge-dot" />
        Generated in 47 seconds
      </motion.div>
    </div>
  );
}
