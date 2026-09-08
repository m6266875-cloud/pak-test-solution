# PAK TEST SOLUTION — PHASE 3 SPEC ARCHIVE

*Source: user Phase-3 message (2026-09-09). This file is the spec of record for
Phase 3 and is quoted below. Where this archive and the original message ever
diverge, the original message is authoritative and the archive must be
corrected to match.*

---

## PHASE 3 — School Management + Teacher Access + Branding + PDF + Final System Integration

Continuing from the current working project after Phases 1 and 2. Do NOT
rebuild the application. Keep the existing stack and database. Preserve all
existing functionality — everything Phase 3 adds must be additive. One
complete, production-ready system.

### 1. Schools Management
- Admin CRUD for schools: name, code, email, phone, address, city,
  principal/head, logo, created/updated dates.
- School status workflow: Active, Pending, Suspended, Archived.

### 2. School Logos
- Admin logo upload for a school: PNG, JPG/JPEG, SVG only.
- Validate file type and size (2 MB max); replace existing logo; delete.
- Store logo in the existing storage; logo must load from the teacher’s
  assigned school automatically (never a manual per-teacher re-upload).

### 3. Auto-Loading School Identity in Paper Generation
- When a paper is generated, the teacher’s school name, address, phone,
  email, and logo are loaded automatically from the teacher’s assigned
  school — never manual re-upload per paper.

### 4. Teachers
- Admin creates teachers: name, email, password (or generated), school,
  role, subjects, classes, courses, status.
- Teacher content is restricted at the API/database level to the teacher’s
  assigned scope (school → course → class → subject).

### 5. Teacher Content Restriction
- Enforce per-teacher scope server side; never trust the client.

### 6. Admins
- Super Admin creates Admins with granular module permissions:
  Users, Teachers, Schools, Courses, Books, Syllabus, Question Bank,
  Paper Generation, Generated Papers, Analytics, Settings.
- No full-admin checkbox without a real permission list.

### 7. Roles & Permissions
- Full role system: Super Admin, Admin, Teacher.
- Authorization enforced in the backend, never only in the UI.

### 8. Login → Profile → Personalized Dashboard
- Login loads the user profile: name, email, role, permissions, school
  (incl. logo), subjects, classes, courses. Dashboard personalizes per
  role/scope: admin sees Schools/Users/… modules per their permissions;
  teacher sees their school + assigned subjects/classes only.

### 9. Paper Header Brand
- Header: [logo] School name, SUBJECT — CLASS, exam title, Time, Total marks.

### 10. Watermark
- Configurable school-logo watermark: enabled/opacity/size/position.
- Subtle default, non-interfering, rendered behind questions.

### 11. Templates
- Template system with kinds: School Exam, Monthly Test, Mid Term,
  Final Term, Practice Test, Board Pattern.
- Template controls: header, footer, logo, watermark, school info, exam
  fields, instructions, numbering, page numbers.

### 12–13. High-Quality A4 PDF (English + Urdu + bilingual)
- Render papers to A4 PDF preserving:
  English/Urdu/bilingual text, RTL shaping, fonts, numbering, tables/maths,
  images, logo, watermark, header, footer, page numbers, page breaks.
- Explicit Urdu-language test scenario required (sample + QA).
- Do not ship a broken “print only” fallback that damages formatting.

### 14. Preview
- Paper preview shows branding/watermark/footer with actions:
  Edit, Replace, Remove, Reorder, Save, Download PDF, Print.

### 15. Full Paper Config
- Store complete paper configuration: school, course, session, class,
  subject(s), book, chapters, topics, exercises, selected question ids,
  template, marks, language, dates.
- Paper lifecycle: Draft, Saved, Final, Archived.

### 16. My Papers
- Teacher paper history with Open, Edit, Duplicate, Download, Archive.

### 17. Admin Papers Management
- Filters: School, Teacher, Course, Class, Subject, Date, Status.
- Actions: view, download, archive, search.
- Strict school isolation (admin → their school only).

### 18. School Dashboard
- For each school: teachers, papers, courses, classes + recent papers.

### 19. Analytics
- Admin analytics: totals, question and paper stats, most active
  schools/teachers/subjects.

### 20. Activity Log
- Log user/action/entity/timestamp/metadata for: school created, teacher
  created, paper generated, PDF downloaded, approvals, syllabus edits, etc.

### 21. Teacher Workflow Chain
- Teacher: login → school/subject scope → generate → branding/watermark →
  preview → save → download PDF. Full chain working end to end.

### 22. Admin Workflow Chain
- Admin: school/teacher creation → content upload → processing → review →
  approve. Full chain working end to end.

### 23. Security Review
- Cross-tenant/role/route/API/upload security; permission enforcement;
  strict school isolation; never trust client IDs.

### 24. Performance
- Pagination, indexes, server-side filtering, efficient joins, caching,
  background processing where appropriate; never dump thousands of rows
  (e.g., questions) to the browser.

### 25. Responsive
- Desktop / laptop / tablet / mobile for dashboards, admin tables, and the
  generation wizard.

### 26. QA / E2E
- Admin chain, teacher chain, security attempts, and PDF checks for
  English/Urdu/bilingual and multi-page branded output.

### 27. Technical Summary (deliverable at the end)
- Summary of: DB changes, APIs/server actions, auth/authorization changes,
  components, pages, migrations, PDF implementation, storage, security,
  tests.
