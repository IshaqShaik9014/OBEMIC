<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=OBEMIC" alt="OBEMIC Logo" width="120" height="120" style="border-radius: 20px;"/>
  <h1>🎓 OBEMIC Architecture & Technical Workbook</h1>
  <h3>Outcome-Based Education Management Information & Calculation</h3>
  <p><i>The complete automated engine for NBA / ABET Accreditation Compliance.</i></p>

  [![Node.js](https://img.shields.io/badge/Node.js-22.0+-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-7.9.1-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
</div>

---

## 📑 Table of Contents
1. [The Problem Domain: What is Outcome-Based Education?](#1-the-problem-domain-what-is-outcome-based-education)
2. [Deep Dive: The Mathematics of Attainment](#2-deep-dive-the-mathematics-of-attainment)
3. [System Architecture: "Under the Hood"](#3-system-architecture-under-the-hood)
4. [Database Schema & ERD Analysis](#4-database-schema--erd-analysis)
5. [The Request Lifecycle (How Data Flows)](#5-the-request-lifecycle-how-data-flows)
6. [API Security & RBAC](#6-api-security--rbac)
7. [Comprehensive Directory Structure](#7-comprehensive-directory-structure)
8. [Local Developer Onboarding](#8-local-developer-onboarding)

---

## 1. The Problem Domain: What is Outcome-Based Education?

Universities seeking accreditation from bodies like the **National Board of Accreditation (NBA)** or **ABET** must prove that their students are actually learning the required skills. Moving away from traditional grade-based evaluations, Outcome-Based Education (OBE) requires a massive, data-driven mapping of micro-skills to macro-career goals.

**OBEMIC** replaces hundreds of error-prone Excel sheets by mathematically modeling the student journey.

### The Taxonomy of OBE:
- **PEO (Program Educational Objectives):** The highest level. What graduates will achieve 3-5 years *after* graduation (e.g., "Lead software engineering teams").
- **PO (Program Outcomes):** The 12 mandatory attributes defined by NBA/ABET (e.g., PO1: Engineering Knowledge, PO2: Problem Analysis, PO8: Ethics). Every student must possess these by graduation.
- **PSO (Program Specific Outcomes):** 2 to 4 outcomes specific to the department (e.g., Computer Science PSOs vs. Mechanical PSOs).
- **CO (Course Outcomes):** The microscopic level. 5 to 6 highly specific learning objectives for a *single subject* (e.g., "Analyze time complexity of sorting algorithms").

---

## 2. Deep Dive: The Mathematics of Attainment

OBEMIC automates the exact algorithms required by the NBA. Here is the mathematical engine running in our backend services (`src/services/attainment`).

### A. Direct Attainment (Quantitative Assessment)
Direct attainment measures actual academic performance via exams.
1. **The Threshold (Set by Admins):** e.g., 60% of the maximum marks.
2. **Student Qualification:** For a specific CO (mapped to specific exam questions), how many students scored $\ge$ 60%?
3. **Level Calculation Algorithm:**
   - Let $P$ = Percentage of students crossing the threshold.
   - If $P \ge 70\% \rightarrow$ **Level 3 (High)**
   - If $P \ge 60\% \rightarrow$ **Level 2 (Medium)**
   - If $P \ge 50\% \rightarrow$ **Level 1 (Low)**
   - If $P < 50\% \rightarrow$ **Level 0 (Failed)**
4. **Weighted Aggregation:**
   $$ \text{Total Direct Attainment} = (W_{int} \times \text{Internal Level}) + (W_{ext} \times \text{External Level}) $$
   *(Typically $W_{int} = 0.3$ and $W_{ext} = 0.7$)*

### B. Indirect Attainment (Qualitative Assessment)
Indirect attainment measures student confidence via surveys.
1. Students rate their confidence on a CO from 1 to 5.
2. The system computes the Arithmetic Mean ($\mu$) of all responses.
3. **Normalization (5-point to 3-point scale):**
   $$ \text{Indirect Attainment} = \left( \frac{\mu}{5} \right) \times 3 $$

### C. Final CO Attainment
Both metrics are fused into a final CO score:
$$ \text{Final CO Attainment} = (0.8 \times \text{Direct Attainment}) + (0.2 \times \text{Indirect Attainment}) $$

### D. PO & PSO Projection (The Mapping Matrix)
Every CO is mapped to POs using a Correlation Factor ($C$):
- 1 = Slight (Low)
- 2 = Moderate (Medium)
- 3 = Substantial (High)

To calculate how much a Course contributed to a Program Outcome:
$$ \text{PO Attainment} = \frac{\sum (\text{Final CO Attainment}_i \times C_i)}{3 \times N} $$
*(Where $N$ is the number of COs mapped to that PO).*

---

## 3. System Architecture: "Under the Hood"

OBEMIC uses a strictly typed, **Headless Layered Architecture**. The UI is completely decoupled from the computational backend.

```mermaid
graph TD
    Client[React/Next.js Client] -->|HTTP REST + JWT| Router[Express Routers]
    
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

### The 5 Architectural Layers
1. **Routes (`/routes`):** URL definitions. Purely maps an endpoint to a Controller method.
2. **Middleware (`/middleware`):** The shield. `auth.middleware.ts` decodes the JWT signature. `role.middleware.ts` blocks unauthorized access (e.g., blocking a Student from hitting a Faculty route).
3. **Controllers (`/controllers`):** The HTTP bridge. Responsible solely for extracting `req.body`, `req.params`, handling `res.status(500)`, and orchestrating the response. *Zero business logic is allowed here.*
4. **Services (`/services`):** The Brain. This is where the underground heavy lifting lives. Excel files are streamed into memory, cells are parsed, CO attainment arrays are computed, and transaction pipelines are built.
5. **Repositories (`/repositories`):** The Database Abstraction. Contains pure Prisma queries (`findMany`, `create`, `update`). This ensures our Services aren't polluted with raw database syntax.

---

## 4. Database Schema & ERD Analysis

Powered by PostgreSQL and Prisma ORM, our schema is highly normalized to handle the complexity of academic structures.

- **Hierarchy Table Chain:** `AcademicYear` $\rightarrow$ `Semester` $\rightarrow$ `Subject` $\rightarrow$ `CourseOutcome`.
- **The Junction Hub (`FacultyAssignment`):** The most critical table. It links a `User` (Faculty) to a `Subject`, `AcademicYear`, and `Section`. Everything revolves around this assignment.
- **Reporting (`ReportHistory`):** Stores JSON blobs of the generated attainment data and manages the DRAFT $\rightarrow$ REVIEW $\rightarrow$ APPROVED workflow.
- **Surveys (`Survey` & `SurveyResponse`):** Enforces a strict unique constraint (`surveyId`, `studentId`, `facultyAssignmentId`) so students can only rate a subject once.

---

## 5. The Request Lifecycle (How Data Flows)

Let's trace exactly what happens when a Faculty member uploads an Internal Marks Excel file:

1. **Frontend:** Sends a `multipart/form-data` POST request containing the `.xlsx` file.
2. **Router:** Hits `POST /api/v1/faculty/reports/internal/upload`.
3. **Upload Middleware:** `multer` intercepts the file, writes it to `/uploads`, and attaches the file path to `req.file`.
4. **Controller:** Extracts the `facultyAssignmentId` and `req.file.path`. Calls `ReportService.processInternalMarks()`.
5. **Service Layer (The Heavy Lifting):**
   - Initializes `InternalWorkbookValidator` to ensure the Excel template hasn't been tampered with.
   - Triggers `InternalHeaderMapper` to map columns to specific Course Outcomes.
   - Iterates through hundreds of student rows.
   - Calculates the threshold metrics mathematically.
   - Formats the results into a massive JSON object.
6. **Repository:** Saves the JSON object into `ReportHistory` as a `DRAFT`.
7. **Controller:** Returns `HTTP 200 OK` with the calculation summary.

---

## 6. API Security & RBAC

We utilize **Stateless JWT Authentication**.

- **Tokens:** Upon login, the server generates an HMAC-SHA256 signed JWT containing the user's `userId` and `role`.
- **RBAC (Role-Based Access Control):** 
  ```typescript
  // Example of deep security applied to a route
  router.post('/create', 
    authenticate, // Enforces JWT validity
    requireRole([RoleName.ADMIN, RoleName.COORDINATOR]), // Blocks Faculty/Students
    AdminController.createSubject
  );
  ```

---

## 7. Comprehensive Directory Structure

To truly master the codebase, you must understand where the files live:

```text
OBEMIC/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # The absolute source of truth for the DB
│   │   └── seed.ts                  # Injects dummy Admin/Students on fresh installs
│   ├── src/
│   │   ├── config/                  # Global constants, branch codes, permission enums
│   │   ├── controllers/             # HTTP boundary (req/res handling)
│   │   ├── database/                # PrismaClient singleton with the 'pg' driver adapter
│   │   ├── logs/                    # Pino/Winston logging configurations
│   │   ├── middleware/              # JWT verification and Multer file uploads
│   │   ├── repositories/            # Prisma ORM abstraction layer
│   │   ├── routes/                  # API endpoints grouped by feature
│   │   ├── services/
│   │   │   ├── attainment/          # 🧠 The massive Mathematical / Excel parser engine
│   │   │   ├── admin/imports/       # Bulk Excel importers for Admin setups
│   │   │   └── *.service.ts         # Standard business logic for auth, academic, etc.
│   │   ├── types/                   # TypeScript interfaces and DTOs
│   │   └── utils/                   # Helper functions (hashing, JWT signing)
│   └── package.json
└── frontend/                        # React / Next.js UI (Under Development)
```

---

## 8. Local Developer Onboarding

Ready to write code? Follow this strict initialization sequence.

### Prerequisites
- **Node.js:** v20+ recommended.
- **PostgreSQL:** Running locally on port `5432`.

### 1. Database Configuration
Inside the `backend/` directory, create a `.env` file:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/obemic"
JWT_SECRET="development-secret-key-do-not-use-in-prod"
PORT=5000
```
*(Note: If your password contains special characters like `@`, you MUST URL-encode them as `%40` in the `DATABASE_URL`).*

### 2. Install & Generate
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

### 4. Boot the Server
```bash
npm run dev
```
You should see: `OBEMIC API Server running on port 5000`.

### 5. API Testing (Swagger)
Open `http://localhost:5000/api-docs` in your browser.
To authenticate:
1. Hit `/api/v1/auth/login`.
2. Body: `{ "email": "admin@college.edu", "password": "password123" }`
3. Copy `accessToken`, click **Authorize** at the top of Swagger, and paste it. You now have God-mode access to the backend.

Welcome to the underground. Happy coding. 🚀
