# 📚 Pak Test Solution

> **Punjab Board Exam Paper Generator** — Generate professional exam papers for Classes 1–12 in under 2 minutes.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Redux Toolkit |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access + refresh tokens) + bcrypt |
| PDF | Puppeteer (Chromium headless) |
| Cache | Redis (optional) |
| Dev | Docker Compose |

---

## ⚡ Quick Start (Docker — Recommended)

```bash
# 1. Clone and enter project
git clone <repo-url> pak-test-solution
cd pak-test-solution

# 2. Copy env file
cp server/.env.example server/.env

# 3. Start all services (DB + Redis + Backend + Frontend)
docker-compose up -d

# 4. Run database migrations + seed
docker exec pts_backend npx prisma migrate dev --name init
docker exec pts_backend npm run db:seed

# 5. Open the app
open http://localhost:5173
```

**Demo Login:**
- Admin: `admin@paktestsolution.com` / `Admin@123456`
- Teacher: `teacher@demo.com` / `Teacher@123`

---

## 🛠 Manual Setup (Without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### 1. Database

```bash
# Create PostgreSQL database
createdb pak_test_db

# Or via psql:
psql -U postgres -c "CREATE DATABASE pak_test_db;"
```

### 2. Backend

```bash
cd server
cp ../.env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
# → Runs on http://localhost:5000
```

### 3. Frontend

```bash
cd client
npm install
# Create .env.local:
echo "VITE_API_URL=/api" > .env.local
npm run dev
# → Runs on http://localhost:5173
```

---

## 📁 Project Structure

```
pak-test-solution/
├── server/
│   ├── src/
│   │   ├── app.ts                  # Express app entry point
│   │   ├── controllers/            # Route handlers
│   │   │   ├── authController.ts
│   │   │   ├── paperController.ts
│   │   │   ├── subjectController.ts
│   │   │   ├── questionController.ts
│   │   │   └── adminController.ts
│   │   ├── services/               # Business logic
│   │   │   ├── authService.ts      # Auth, JWT, refresh tokens
│   │   │   ├── paperGeneratorService.ts  # Core paper algorithm
│   │   │   └── pdfGeneratorService.ts    # Puppeteer PDF generation
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT auth + RBAC
│   │   │   ├── validation.ts       # express-validator wrapper
│   │   │   └── errorHandler.ts     # Global error handler
│   │   ├── routes/                 # API route definitions
│   │   └── utils/
│   │       ├── apiResponse.ts      # Standardized responses
│   │       └── logger.ts           # Winston logger
│   ├── prisma/
│   │   ├── schema.prisma           # Full DB schema
│   │   └── seed.ts                 # Seed: classes, subjects, chapters, questions
│   └── package.json
│
├── client/
│   └── src/
│       ├── App.tsx                 # Routes + auth guards
│       ├── api/                    # Axios API services
│       ├── store/                  # Redux store + auth slice
│       ├── pages/
│       │   ├── Auth/LoginPage.tsx
│       │   ├── Dashboard/DashboardPage.tsx
│       │   ├── Papers/
│       │   │   ├── GeneratePaperPage.tsx  # 4-step wizard
│       │   │   ├── MyPapersPage.tsx
│       │   │   └── PaperDetailPage.tsx    # Preview + formatting + PDF
│       │   ├── Questions/QuestionBankPage.tsx
│       │   ├── Admin/
│       │   │   ├── AdminUsersPage.tsx
│       │   │   └── AdminAuditPage.tsx
│       │   └── Profile/ProfilePage.tsx
│       └── components/common/DashboardLayout.tsx
│
└── docker-compose.yml
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/refresh` | Refresh access token (cookie) |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/profile` | Get current user profile |
| PUT  | `/api/auth/change-password` | Change password |

### Papers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/papers` | Generate new paper |
| GET  | `/api/papers` | List my papers (paginated) |
| GET  | `/api/papers/:id` | Get paper detail |
| PUT  | `/api/papers/:id` | Update title/status |
| PUT  | `/api/papers/:id/formatting` | Update PDF formatting |
| DELETE | `/api/papers/:id` | Delete paper |
| GET  | `/api/papers/:id/download` | Download PDF |
| GET  | `/api/papers/:id/preview` | Preview PDF inline |

### Subjects & Chapters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subjects/classes` | All classes (1–12) |
| GET | `/api/subjects/classes/:classId/subjects` | Subjects for a class |
| GET | `/api/subjects/subjects/:subjectId/chapters` | Chapters for a subject |
| GET | `/api/subjects/chapters?subjectIds=1,2,3` | Chapters for multiple subjects |

### Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/questions` | List questions (filterable, incl. `status`/`exerciseId`/`topicId`) |
| GET  | `/api/questions/stats` | Question bank statistics (type, difficulty, status, source, language) |
| POST | `/api/questions` | Create question (admin) |
| POST | `/api/questions/bulk` | Bulk import JSON (admin) |
| PUT  | `/api/questions/:id` | Update question (admin) |
| DELETE | `/api/questions/:id` | Soft delete question (admin) |
| PATCH | `/api/questions/:id/approve` | Approve question — approval workflow (admin) |
| PATCH | `/api/questions/:id/reject` | Reject question — approval workflow (admin) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/admin/dashboard` | Stats overview (incl. syllabus counts & question breakdown) |
| GET  | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create user |
| PUT  | `/api/admin/users/:id` | Update user |
| PATCH | `/api/admin/users/:id/toggle` | Activate/deactivate |
| GET  | `/api/admin/audit-logs` | Audit trail |
| POST | `/api/admin/teacher-subjects` | Assign subject+class to teacher |
| DELETE | `/api/admin/teacher-subjects` | Remove teacher-subject assignment |
| PUT  | `/api/admin/users/:id/permissions` | Replace user's admin permissions (super admin) |

### Schools *(Admin System Upgrade)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/schools` | List schools (search, status filter, pagination) |
| GET  | `/api/schools/:id` | School detail |
| POST | `/api/schools` | Create school (super admin) |
| PUT  | `/api/schools/:id` | Update school (super admin) |
| PATCH | `/api/schools/:id/status` | Toggle / set status `active`/`inactive`/`suspended` (super admin) |

### Syllabus / PTB Hierarchy *(Admin System Upgrade)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/syllabus/boards` | List / create boards |
| PUT/DELETE | `/api/syllabus/boards/:id` | Update / delete board |
| GET/POST | `/api/syllabus/books` | List (filters: board/class/subject/status/search) / create book |
| GET/PUT/DELETE | `/api/syllabus/books/:id` | Book detail / update / delete |
| GET  | `/api/syllabus/chapters?bookId=` | Chapter tree with exercises & topics |
| PUT  | `/api/syllabus/chapters/:id/book` | Link/unlink chapter to a book |
| GET/POST | `/api/syllabus/exercises` | List (by chapter) / create exercise |
| PUT/DELETE | `/api/syllabus/exercises/:id` | Update / delete exercise |
| GET/POST | `/api/syllabus/topics` | List (by chapter) / create topic |
| PUT/DELETE | `/api/syllabus/topics/:id` | Update / delete topic |

---

## 🏫 Admin System Upgrade

Additive upgrade — all existing functionality is preserved.

**New data models** (Prisma, PostgreSQL): `School`, `Board`, `Book` (PTB textbook), `Exercise`, `Topic`, `AdminPermission`, plus enums `SchoolStatus`, `BookStatus`, `QuestionSource`, `QuestionStatus`. Extended: `User.schoolId`, `Subject.boardId/schoolId`, `Chapter.bookId`, `Question.exerciseId/topicId/language/source/status`, `PaperFormatting.schoolLogoUrl`.

**Frontend:** new admin pages **Schools** (`/app/admin/schools`) and **Syllabus** (`/app/admin/syllabus`) with CRUD, filters, and exercise/topic drill-down; the admin dashboard shows a syllabus stats row and pending-question approvals.

**Mock preview:** `cd mock-server && npm start` — seeded with 3 schools, 4 boards (BISE Lahore/Rawalpindi/Karachi, FBISE), 3 PTB books, sample exercises & topics. Default preview profile: `super_admin`.

---

## 🔐 Roles & Permissions

| Feature | Teacher | School Admin | Super Admin |
|---------|---------|-------------|-------------|
| Generate papers | ✅ | ✅ | ✅ |
| View own papers | ✅ | ✅ | ✅ |
| Download PDF | ✅ | ✅ | ✅ |
| Manage question bank | ❌ | ✅ | ✅ |
| Add bulk questions | ❌ | ✅ | ✅ |
| Manage users | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |

---

## 📄 Paper Generation Algorithm

```
1. Teacher selects: Class → Subject(s) → Chapter(s)
2. Configures: MCQ count×marks, Short count×marks, Essay count×marks
3. System validates sufficient questions exist in question bank
4. Questions are randomly shuffled (Fisher-Yates algorithm)
5. Required count selected per type
6. Paper saved with all settings & formatting in DB (transaction)
7. PDF generated on-demand via Puppeteer (HTML → PDF)
8. Activity logged for audit trail
```

---

## 🐛 Troubleshooting

**Puppeteer / PDF not working in Docker:**
```bash
# The Dockerfile installs Chromium via Alpine package
# Make sure PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser is set
```

**Database migration errors:**
```bash
cd server
npx prisma migrate reset --force
npm run db:seed
```

**JWT token issues:**
```bash
# Make sure JWT_SECRET and JWT_REFRESH_SECRET are at least 32 characters
# and different from each other
```

---

## 🗺 Roadmap (Phase 2+)

- [ ] Urdu RTL font rendering in PDF (Jameel Noori Nastaleeq)
- [ ] Past papers database with watermarking
- [ ] Question difficulty auto-balancing
- [ ] Export to Word (.docx)
- [ ] Class-wise question difficulty analytics
- [ ] Email notifications for shared papers
- [ ] Mobile app (React Native)

---

## 📜 License

MIT © Pak Test Solution
