<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=OBEMIC" alt="OBEMIC Logo" width="120" height="120" style="border-radius: 20px;"/>
  <h1>🎓 OBEMIC Architecture & Technical Workbook</h1>
  <h3>Outcome-Based Education Management Information & Calculation</h3>
  <p><i>The complete automated engine for NBA / ABET Accreditation Compliance.</i></p>

  [![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-20.0+-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-7.9.1-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
</div>

---

## 📑 Table of Contents
1. [The Problem Domain: Outcome-Based Education](#1-the-problem-domain-outcome-based-education)
2. [The Three Portals (Application Interfaces)](#2-the-three-portals-application-interfaces)
3. [Deep Dive: The Mathematics of Attainment](#3-deep-dive-the-mathematics-of-attainment)
4. [System Architecture: "Under the Hood"](#4-system-architecture-under-the-hood)
5. [Database Schema & ERD Analysis](#5-database-schema--erd-analysis)
6. [The Request Lifecycle (How Data Flows)](#6-the-request-lifecycle-how-data-flows)
7. [Comprehensive Directory Structure](#7-comprehensive-directory-structure)
8. [Local Developer Onboarding (Backend & Frontend)](#8-local-developer-onboarding-backend--frontend)

---

## 1. The Problem Domain: Outcome-Based Education

Universities seeking accreditation from bodies like the **National Board of Accreditation (NBA)** or **ABET** must prove that their students are actually learning the required skills. Moving away from traditional grade-based evaluations, Outcome-Based Education (OBE) requires a massive, data-driven mapping of micro-skills to macro-career goals.

**OBEMIC** replaces hundreds of error-prone Excel sheets by mathematically modeling the student journey automatically.

### The Taxonomy of OBE:
- **PEO (Program Educational Objectives):** The highest level. What graduates will achieve 3-5 years *after* graduation (e.g., "Lead software engineering teams").
- **PO (Program Outcomes):** The 12 mandatory attributes defined by NBA/ABET (e.g., PO1: Engineering Knowledge, PO2: Problem Analysis, PO8: Ethics). Every student must possess these by graduation.
- **PSO (Program Specific Outcomes):** 2 to 4 outcomes specific to the department (e.g., Computer Science PSOs vs. Mechanical PSOs).
- **CO (Course Outcomes):** The microscopic level. 5 to 6 highly specific learning objectives for a *single subject* (e.g., "Analyze time complexity of sorting algorithms").

---

## 2. The Three Portals (Application Interfaces)

OBEMIC is divided into three highly specialized front-end interfaces, all unified under a sleek Next.js (React) application featuring Tailwind CSS and Glassmorphism design principles.

### A. The Admin Control Center
Accessed via `/admin`. Only authorized administrators and Heads of Departments (HODs) can enter.
- **Setup Wizards:** Initialize Academic Years, Semesters, and Departments.
- **Subject & CO Management:** Define global Course Outcomes and map them to Program Outcomes (CO-PO Matrix).
- **Faculty Assignment:** Assign faculty members to specific subjects and sections.
- **Survey Generation:** Start, monitor, and close student course-exit surveys universally.

### B. The Faculty Dashboard
Accessed via `/faculty`. This is where the magic happens for teaching staff.
- **Assigned Subjects:** Faculty see only the subjects they are assigned to.
- **Excel Upload Engine:** Faculty simply upload their standard Excel marksheets (Internal, External, and Lab marks). The backend reads the columns, extracts student marks, checks them against the target thresholds, and computes attainment.
- **Dynamic Charts:** Chart.js instantly renders responsive Bar Charts of CO and PO Attainments.
- **Automated OBE Document Generation:** A fully-formatted, completely white background PDF generator that instantly outputs the Final OBE Report ready for NBA committee signatures.

### C. Student Portal (Survey Nexus)
Accessed via `/survey`. 
- **Frictionless Entry:** Students log in simply via Roll Number and secure password.
- **Pending Surveys List:** Students see cards for every subject they need to evaluate.
- **Course Exit Form:** A beautiful, responsive UI where students rate their confidence in achieving each Course Outcome on a 5-point scale (Poor, Fair, Good, Very Good, Excellent). These responses directly pipe into the **Indirect Assessment** engine on the Faculty Dashboard.

---

## 3. Deep Dive: The Mathematics of Attainment

OBEMIC automates the exact algorithms required by the NBA. Here is the mathematical engine running in our backend services (`src/services/attainment`).

### A. Direct Attainment (Quantitative Assessment)
Direct attainment measures actual academic performance via exams.
1. **The Threshold (Set by Admins/Faculty):** e.g., 65% of the maximum marks.
2. **Student Qualification:** For a specific CO (mapped to specific exam questions), how many students scored $\ge$ 65%?
3. **Level Calculation Algorithm (Linear Proportional Scale):**
   Unlike rigid tier-based scales (where anything under 60% is a harsh 0), OBEMIC is configured to use a precise **Direct Linear Proportional Scale**.
   Let $P$ = Percentage of students crossing the threshold.
   $$ \text{Attainment Level (3-Scale)} = \left(\frac{P}{100}\right) \times 3 $$
   *(e.g., A 40% pass rate instantly maps to exactly 1.20)*

### B. Indirect Attainment (Qualitative Assessment)
Sourced automatically from the Student Survey Nexus. 
1. The 5-point survey ratings (Poor to Excellent) are averaged.
2. The 5-point scale is dynamically squashed into the 3-point scale using a standard ratio algorithm.

### C. Final CO Attainment
Both metrics are fused into a final CO score (typically an 80/20 or 60/40 split):
$$ \text{Final CO Attainment} = (0.6 \times \text{Direct Attainment}) + (0.4 \times \text{Indirect Attainment}) $$

### D. PO & PSO Projection (The Mapping Matrix)
Every CO is mapped to POs using a Correlation Factor ($C$):
- 1 = Slight (Low)
- 2 = Moderate (Medium)
- 3 = Substantial (High)

To calculate how much a Course contributed to a Program Outcome:
$$ \text{PO Attainment} = \frac{\sum (\text{Final CO Attainment}_i \times C_i)}{N} $$
*(Where $N$ is the number of mapped COs, using standard arithmetic means against the generated matrix)*

---

## 4. System Architecture: "Under the Hood"

OBEMIC uses a strictly typed, **Headless Layered Architecture**. The UI is completely decoupled from the computational backend.

```mermaid
graph TD
    Client[Next.js App Router Client] -->|HTTP REST + JWT| Router[Express Routers]
    
    subgraph OBEMIC Backend Node.js
        Router -->|Req Validation| MW[Middlewares]
        MW --> Ctrl[Controllers]
        Ctrl -->|DTOs| Svc[Service Layer]
        
        subgraph Core Engine
            Svc --> Excel[ExcelJS Parser]
            Svc --> Math[Math/Attainment Engine]
        end
        
        Svc --> Repo[Repository Layer]
        Repo --> Prisma[Prisma ORM Adapter]
    end
    
    Prisma <-->|Connection Pool| DB[(PostgreSQL v16)]
```

### The 5 Architectural Layers (Backend)
1. **Routes (`/routes`):** URL definitions. Purely maps an endpoint to a Controller method.
2. **Middleware (`/middleware`):** The shield. `auth.middleware.ts` decodes the JWT signature. `role.middleware.ts` blocks unauthorized access.
3. **Controllers (`/controllers`):** The HTTP bridge. Responsible solely for extracting `req.body`, `req.params`, and orchestrating the response. *Zero business logic.*
4. **Services (`/services`):** The Brain. This is where the underground heavy lifting lives. Excel files are streamed into memory, cells are parsed, CO attainment arrays are computed, and transaction pipelines are built.
5. **Repositories (`/repositories`):** The Database Abstraction. Contains pure Prisma queries (`findMany`, `create`, `update`).

---

## 5. Database Schema & ERD Analysis

Powered by PostgreSQL and Prisma ORM, our schema is highly normalized to handle the complexity of academic structures.

- **Hierarchy Table Chain:** `AcademicYear` $\rightarrow$ `Semester` $\rightarrow$ `Subject` $\rightarrow$ `CourseOutcome`.
- **The Junction Hub (`FacultyAssignment`):** The most critical table. It links a `User` (Faculty) to a `Subject`, `AcademicYear`, and `Section`. Everything revolves around this assignment.
- **Reporting (`ReportHistory`):** Stores JSON blobs of the generated attainment data and manages the DRAFT $\rightarrow$ REVIEW $\rightarrow$ APPROVED workflow.
- **Surveys (`Survey` & `SurveyResponse`):** Enforces a strict unique constraint (`surveyId`, `studentId`, `facultyAssignmentId`) so students can only rate a subject once.

---

## 6. Comprehensive Directory Structure

To truly master the codebase, you must understand where the files live:

```text
OBEMIC/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # The absolute source of truth for the DB
│   │   └── seed.ts                  # Injects dummy Admin/Students on fresh installs
│   ├── src/
│   │   ├── config/                  # Global constants, permission enums
│   │   ├── controllers/             # HTTP boundary (req/res handling)
│   │   ├── database/                # PrismaClient singleton with pg adapter
│   │   ├── middleware/              # JWT verification and Multer file uploads
│   │   ├── routes/                  # API endpoints grouped by feature
│   │   └── services/
│   │       ├── attainment/          # 🧠 The massive Mathematical / Excel parser engine
│   │       ├── admin/imports/       # Bulk Excel importers for Admin setups
│   │       └── *.service.ts         # Standard business logic for auth, academic, etc.
│   └── TEST/                        # Contains database seeding tools and scratch files
│       └── Excel_Templates/         # Blank Excel templates for Faculty upload testing
│
└── frontend/                        # Next.js UI Application
    ├── src/
    │   ├── app/
    │   │   ├── admin/               # Admin Control Center (Page routing)
    │   │   ├── faculty/             # Faculty Dashboard (Page routing)
    │   │   └── survey/              # Student Survey Nexus (Page routing)
    │   ├── components/              # Reusable UI components (Modals, Charts)
    │   └── services/                # Axios wrappers mapping to Backend REST APIs
    └── tailwind.config.ts           # Global design system tokens
```

---

## 7. Local Developer Onboarding (Backend & Frontend)

Ready to write code? Follow this strict initialization sequence.

### Prerequisites
- **Node.js:** v20+ recommended.
- **PostgreSQL:** Running locally on port `5432`.

### 1. Database Configuration (Backend)
Inside the `backend/` directory, create a `.env` file:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/obemic"
JWT_SECRET="development-secret-key-do-not-use-in-prod"
PORT=5000
```
*(Note: If your password contains special characters like `@`, you MUST URL-encode them as `%40` in the `DATABASE_URL`).*

### 2. Install & Generate (Backend)
```bash
cd backend
npm install

# Force the database schema to sync with Prisma
npx prisma db push --force-reset

# Generate the Prisma Client binaries (Crucial for Prisma 7+)
npx prisma generate
```

### 3. Seed the Database
We provide a seeder that automatically creates Academic Years, Semesters, Departments, Admin users, Faculty, and Students so you don't start with a blank app.
```bash
npx ts-node prisma/seed.ts
```

### 4. Boot the Servers

**Backend API Server:**
```bash
cd backend
npm run dev
```
*Server running on http://localhost:5000*

**Frontend UI Server:**
Open a new terminal window.
```bash
cd frontend
npm install
npm run dev
```
*Web App running on http://localhost:3000*

### 5. Accessing the Platforms
- **Admin Hub:** Navigate to `http://localhost:3000/admin`
  *(Login with `admin@college.edu` / `password123`)*
- **Faculty Dashboard:** Navigate to `http://localhost:3000/faculty`
  *(Login with a seeded faculty email)*
- **Student Survey Nexus:** Navigate to `http://localhost:3000/survey`
  *(Login with a seeded student Roll Number)*

### 6. API Testing (Swagger)
Open `http://localhost:5000/api-docs` in your browser to view the auto-generated Swagger OpenAPI specifications.

Welcome to the underground. Happy coding. 🚀
