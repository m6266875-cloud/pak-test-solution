import { PrismaClient, Medium, QuestionType, Difficulty, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ── Super Admin ──────────────────────────────────────────────────────────
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@paktestsolution.com';
  const adminPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
      role: Role.super_admin,
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ── Demo Teacher ─────────────────────────────────────────────────────────
  const teacherPassword = await bcrypt.hash('Teacher@123', 12);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@demo.com' },
    update: {},
    create: {
      email: 'teacher@demo.com',
      password: teacherPassword,
      name: 'Demo Teacher',
      role: Role.teacher,
      schoolName: 'Government High School, Lahore',
      isActive: true,
    },
  });
  console.log(`✅ Teacher created: ${teacher.email}`);

  // ── Classes (1-12) ───────────────────────────────────────────────────────
  const classData = Array.from({ length: 12 }, (_, i) => ({
    name: `Class ${i + 1}`,
    grade: i + 1,
  }));

  for (const cls of classData) {
    await prisma.class.upsert({
      where: { grade: cls.grade },
      update: {},
      create: cls,
    });
  }
  console.log('✅ Classes 1-12 created');

  // ── Subjects for Class 9 ─────────────────────────────────────────────────
  const class9 = await prisma.class.findUnique({ where: { grade: 9 } });
  if (!class9) throw new Error('Class 9 not found');

  const subjects9 = [
    { name: 'Mathematics', code: 'MATH-9', medium: Medium.english },
    { name: 'Physics', code: 'PHY-9', medium: Medium.english },
    { name: 'Chemistry', code: 'CHEM-9', medium: Medium.english },
    { name: 'Biology', code: 'BIO-9', medium: Medium.english },
    { name: 'English', code: 'ENG-9', medium: Medium.english },
    { name: 'Urdu', code: 'URD-9', medium: Medium.urdu },
    { name: 'Islamiyat', code: 'ISL-9', medium: Medium.urdu },
    { name: 'Pakistan Studies', code: 'PAK-9', medium: Medium.bilingual },
    { name: 'Computer Science', code: 'CS-9', medium: Medium.english },
  ];

  for (const sub of subjects9) {
    await prisma.subject.upsert({
      where: { name_classId_medium: { name: sub.name, classId: class9.id, medium: sub.medium } },
      update: {},
      create: { ...sub, classId: class9.id },
    });
  }
  console.log('✅ Class 9 subjects created');

  // ── Subjects for Class 10 ────────────────────────────────────────────────
  const class10 = await prisma.class.findUnique({ where: { grade: 10 } });
  if (!class10) throw new Error('Class 10 not found');

  const subjects10 = [
    { name: 'Mathematics', code: 'MATH-10', medium: Medium.english },
    { name: 'Physics', code: 'PHY-10', medium: Medium.english },
    { name: 'Chemistry', code: 'CHEM-10', medium: Medium.english },
    { name: 'Biology', code: 'BIO-10', medium: Medium.english },
    { name: 'English', code: 'ENG-10', medium: Medium.english },
    { name: 'Urdu', code: 'URD-10', medium: Medium.urdu },
    { name: 'Islamiyat', code: 'ISL-10', medium: Medium.urdu },
    { name: 'Pakistan Studies', code: 'PAK-10', medium: Medium.bilingual },
    { name: 'Computer Science', code: 'CS-10', medium: Medium.english },
  ];

  for (const sub of subjects10) {
    await prisma.subject.upsert({
      where: { name_classId_medium: { name: sub.name, classId: class10.id, medium: sub.medium } },
      update: {},
      create: { ...sub, classId: class10.id },
    });
  }

  // ── Chapters for Class 9 Mathematics ────────────────────────────────────
  const math9 = await prisma.subject.findFirst({
    where: { name: 'Mathematics', classId: class9.id },
  });

  if (math9) {
    const mathChapters = [
      { number: 1, name: 'Real and Complex Numbers', description: 'Properties of real numbers, complex numbers' },
      { number: 2, name: 'Logarithms', description: 'Laws of logarithm, common and natural logarithms' },
      { number: 3, name: 'Algebraic Expressions and Algebraic Formulas', description: 'Polynomials, factorization' },
      { number: 4, name: 'Algebraic Manipulation', description: 'HCF, LCM, basic operations' },
      { number: 5, name: 'Factorization', description: 'Different methods of factorization' },
      { number: 6, name: 'Algebraic Sentences (Equations and Inequalities)', description: 'Linear and quadratic equations' },
      { number: 7, name: 'Linear Graphs and Their Applications', description: 'Cartesian plane, slope, linear equations' },
      { number: 8, name: 'Linear and Simultaneous Equations', description: 'Methods of solving simultaneous equations' },
      { number: 9, name: 'Introduction to Coordinate Geometry', description: 'Distance, midpoint, collinear points' },
      { number: 10, name: 'Congruent Triangles', description: 'Congruence conditions, SSS, SAS, ASA' },
      { number: 11, name: 'Parallelograms and Triangles', description: 'Properties and theorems' },
      { number: 12, name: 'Line Bisectors and Angle Bisectors', description: 'Constructions and theorems' },
      { number: 13, name: 'Sides and Angles of a Triangle', description: 'Pythagorean theorem and applications' },
      { number: 14, name: 'Ratio and Proportion', description: 'Similar triangles, basic proportionality' },
      { number: 15, name: 'Pythagoras Theorem', description: 'Proof and applications' },
      { number: 16, name: 'Theorems Related to Area', description: 'Area theorems for triangles and parallelograms' },
      { number: 17, name: 'Practical Geometry - Triangles', description: 'Constructing triangles' },
    ];

    for (const ch of mathChapters) {
      await prisma.chapter.upsert({
        where: { number_subjectId: { number: ch.number, subjectId: math9.id } },
        update: {},
        create: { ...ch, subjectId: math9.id },
      });
    }
    console.log('✅ Mathematics Class 9 chapters created');

    // ── Sample Questions for Chapter 1 ────────────────────────────────────
    const ch1 = await prisma.chapter.findUnique({
      where: { number_subjectId: { number: 1, subjectId: math9.id } },
    });

    if (ch1) {
      const sampleMCQs = [
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'Which of the following is an irrational number?',
          marks: 1,
          options: ['√4', '√9', '√2', '0.25'],
          answer: 'C',
          difficulty: Difficulty.easy,
          tags: ['irrational', 'number-types'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'The additive inverse of -7 is:',
          marks: 1,
          options: ['7', '-7', '1/7', '-1/7'],
          answer: 'A',
          difficulty: Difficulty.easy,
          tags: ['additive-inverse'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'Which property is shown by: a + (b + c) = (a + b) + c?',
          marks: 1,
          options: ['Commutative', 'Associative', 'Distributive', 'Identity'],
          answer: 'B',
          difficulty: Difficulty.easy,
          tags: ['properties', 'associative'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'The set of natural numbers is a subset of:',
          marks: 1,
          options: ['Irrational numbers', 'Complex numbers only', 'Real numbers', 'Prime numbers'],
          answer: 'C',
          difficulty: Difficulty.medium,
          tags: ['subsets', 'number-system'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'Which of these numbers is rational?',
          marks: 1,
          options: ['π', '√3', '√5', '0.333...'],
          answer: 'D',
          difficulty: Difficulty.easy,
          tags: ['rational-numbers'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'i² (where i is the imaginary unit) equals:',
          marks: 1,
          options: ['1', '-1', 'i', '-i'],
          answer: 'B',
          difficulty: Difficulty.medium,
          tags: ['complex-numbers', 'imaginary-unit'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'Which property is illustrated by a × (b + c) = a × b + a × c?',
          marks: 1,
          options: ['Commutative', 'Associative', 'Distributive', 'Closure'],
          answer: 'C',
          difficulty: Difficulty.easy,
          tags: ['distributive'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'The multiplicative identity element is:',
          marks: 1,
          options: ['0', '-1', '1', '∞'],
          answer: 'C',
          difficulty: Difficulty.easy,
          tags: ['identity-element'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: '(-3) × (-4) = ?',
          marks: 1,
          options: ['-12', '12', '7', '-7'],
          answer: 'B',
          difficulty: Difficulty.easy,
          tags: ['multiplication', 'integers'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'Which of the following is NOT a real number?',
          marks: 1,
          options: ['-5', '√(-4)', '0', '3/7'],
          answer: 'B',
          difficulty: Difficulty.medium,
          tags: ['real-numbers', 'complex-numbers'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'The absolute value of -15 is:',
          marks: 1,
          options: ['-15', '15', '1/15', '0'],
          answer: 'B',
          difficulty: Difficulty.easy,
          tags: ['absolute-value'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.mcq,
          text: 'Which set does NOT include negative numbers?',
          marks: 1,
          options: ['Integers', 'Rational numbers', 'Natural numbers', 'Real numbers'],
          answer: 'C',
          difficulty: Difficulty.easy,
          tags: ['number-sets', 'natural-numbers'],
        },
      ];

      const sampleShort = [
        {
          chapterId: ch1.id,
          type: QuestionType.short,
          text: 'Define rational and irrational numbers with two examples each.',
          marks: 3,
          answer: 'Rational: numbers expressible as p/q where q≠0. Examples: 1/2, 0.75. Irrational: cannot be expressed as p/q. Examples: √2, π.',
          difficulty: Difficulty.easy,
          tags: ['definition', 'rational', 'irrational'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.short,
          text: 'State the commutative and associative properties of addition with examples.',
          marks: 3,
          answer: 'Commutative: a+b = b+a (e.g., 3+4 = 4+3 = 7). Associative: (a+b)+c = a+(b+c) (e.g., (1+2)+3 = 1+(2+3) = 6).',
          difficulty: Difficulty.easy,
          tags: ['properties', 'addition'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.short,
          text: 'Simplify: (3 + 2i) + (1 - 4i)',
          marks: 3,
          answer: '(3+2i) + (1-4i) = (3+1) + (2-4)i = 4 - 2i',
          difficulty: Difficulty.medium,
          tags: ['complex-numbers', 'addition'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.short,
          text: 'Find the multiplicative inverse of 2/3.',
          marks: 3,
          answer: 'Multiplicative inverse of 2/3 is 3/2, since (2/3) × (3/2) = 1.',
          difficulty: Difficulty.easy,
          tags: ['multiplicative-inverse'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.short,
          text: 'Arrange the following in ascending order: √3, 1.5, 7/4, √2',
          marks: 3,
          answer: '√2 ≈ 1.41, √3 ≈ 1.73, 1.5 = 1.5, 7/4 = 1.75. Ascending: √2 < 1.5 < √3 < 7/4',
          difficulty: Difficulty.medium,
          tags: ['ordering', 'surds'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.short,
          text: 'Verify the distributive property for a=2, b=3, c=4.',
          marks: 3,
          answer: 'LHS: a(b+c) = 2(3+4) = 2×7 = 14. RHS: ab+ac = 2×3 + 2×4 = 6+8 = 14. LHS = RHS ✓',
          difficulty: Difficulty.easy,
          tags: ['distributive', 'verification'],
        },
      ];

      const sampleEssay = [
        {
          chapterId: ch1.id,
          type: QuestionType.essay,
          text: 'Discuss the real number system in detail. Explain with a diagram how natural numbers, whole numbers, integers, rational numbers, irrational numbers, and real numbers are related to each other. Give two examples of each type.',
          marks: 10,
          answer: 'The real number system is hierarchical: Natural ⊂ Whole ⊂ Integer ⊂ Rational ⊂ Real. Irrational numbers are also a subset of Real but disjoint from Rational...',
          difficulty: Difficulty.hard,
          tags: ['number-system', 'subsets', 'diagram'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.essay,
          text: 'State and prove all properties of real numbers under addition and multiplication. Include: Closure, Commutative, Associative, Identity, and Inverse properties.',
          marks: 10,
          answer: 'Properties of Real Numbers: 1) Closure: For all a,b∈ℝ, a+b∈ℝ and a×b∈ℝ. 2) Commutative: a+b=b+a...',
          difficulty: Difficulty.hard,
          tags: ['properties', 'proof', 'real-numbers'],
        },
        {
          chapterId: ch1.id,
          type: QuestionType.essay,
          text: 'Explain complex numbers. Define real part and imaginary part. Perform addition, subtraction, and multiplication of complex numbers with examples.',
          marks: 10,
          answer: 'Complex numbers are of the form a+bi where a=real part, b=imaginary part, i=√(-1). Addition: (a+bi)+(c+di)=(a+c)+(b+d)i...',
          difficulty: Difficulty.hard,
          tags: ['complex-numbers', 'operations'],
        },
      ];

      const allSampleQuestions = [...sampleMCQs, ...sampleShort, ...sampleEssay];
      await prisma.question.createMany({ data: allSampleQuestions, skipDuplicates: true });
      console.log(`✅ ${allSampleQuestions.length} sample questions created for Math Ch1`);
    }
  }

  // ── Class 9 Physics Chapters ─────────────────────────────────────────────
  const physics9 = await prisma.subject.findFirst({
    where: { name: 'Physics', classId: class9.id },
  });

  if (physics9) {
    const physicsChapters = [
      { number: 1, name: 'Physical Quantities and Measurement' },
      { number: 2, name: 'Kinematics' },
      { number: 3, name: 'Dynamics' },
      { number: 4, name: 'Turning Effect of Forces' },
      { number: 5, name: 'Gravitation' },
      { number: 6, name: 'Work and Energy' },
      { number: 7, name: 'Properties of Matter' },
      { number: 8, name: 'Thermal Properties of Matter' },
      { number: 9, name: 'Transfer of Heat' },
    ];

    for (const ch of physicsChapters) {
      await prisma.chapter.upsert({
        where: { number_subjectId: { number: ch.number, subjectId: physics9.id } },
        update: {},
        create: { ...ch, subjectId: physics9.id },
      });
    }
    console.log('✅ Physics Class 9 chapters created');
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('─────────────────────────────────────');
  console.log('📧 Admin:   admin@paktestsolution.com');
  console.log('🔑 Pass:    Admin@123456');
  console.log('📧 Teacher: teacher@demo.com');
  console.log('🔑 Pass:    Teacher@123');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
