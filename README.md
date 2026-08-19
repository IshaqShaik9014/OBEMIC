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
4. [Frontend Architecture & UI Engineering](#4-frontend-architecture--ui-engineering)
5. [Backend Architecture: "Under the Hood"](#5-backend-architecture-under-the-hood)
6. [Database Schema & ERD Analysis](#6-database-schema--erd-analysis)
7. [The Request Lifecycle (How Data Flows)](#7-the-request-lifecycle-how-data-flows)
8. [Comprehensive Directory Structure](#8-comprehensive-directory-structure)
9. [Local Developer Onboarding](#9-local-developer-onboarding)

---

## 1. The Problem Domain: Outcome-Based Education

Universities seeking accreditation from bodies like the **National Board of Accreditation (NBA)** or **ABET** must prove that their students are actually learning the required skills. Moving away from traditional grade-based evaluations, Outcome-Based Education (OBE) requires a massive, data-driven mapping of micro-skills to macro-career goals.

**OBEMIC** replaces hundreds of error-prone Excel sheets by mathematically modeling the student journey automatically.

### The Taxonomy of OBE:
- **PEO (Program Educational Objectives):** The highest level. What graduates will achieve 3-5 years *after* graduation.
- **PO (Program Outcomes):** The 12 mandatory attributes defined by NBA/ABET.
- **PSO (Program Specific Outcomes):** 2 to 4 outcomes specific to the department.
- **CO (Course Outcomes):** The microscopic level. 5 to 6 highly specific learning objectives for a *single subject*.

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
- **Excel Upload Engine:** Faculty simply upload their standard Excel marksheets (Internal, External, and Lab marks).
- **Dynamic Charts:** Chart.js instantly renders responsive Bar Charts of CO and PO Attainments.
- **Automated OBE Document Generation:** A fully-formatted, completely white background PDF generator that instantly outputs the Final OBE Report ready for NBA committee signatures.

### C. Student Portal (Survey Nexus)
Accessed via `/survey`. 
- **Frictionless Entry:** Students log in simply via Roll Number and secure password.
- **Pending Surveys List:** Students see cards for every subject they need to evaluate.
- **Course Exit Form:** A beautiful, responsive UI where students rate their confidence in achieving each Course Outcome on a 5-point scale.

---

## 3. Deep Dive: The Mathematics of Attainment

OBEMIC automates the exact algorithms required by the NBA. Here is the mathematical engine running in our backend services (`src/services/attainment`).

### A. Direct Attainment (Quantitative Assessment)
1. **The Threshold (Set by Admins/Faculty):** e.g., 65% of the maximum marks.
2. **Student Qualification:** How many students scored $\ge$ 65%?
3. **Level Calculation Algorithm (Linear Proportional Scale):**
   OBEMIC uses a precise **Direct Linear Proportional Scale**.
   $$ \text{Attainment Level (3-Scale)} = \left(\frac{P}{100}\right) \times 3 $$

### B. Indirect Attainment (Qualitative Assessment)
Sourced automatically from the Student Survey Nexus. The 5-point scale is dynamically squashed into the 3-point scale using a standard ratio algorithm.

### C. Final CO Attainment
$$ \text{Final CO Attainment} = (0.6 \times \text{Direct Attainment}) + (0.4 \times \text{Indirect Attainment}) $$

### D. PO & PSO Projection
$$ \text{PO Attainment} = \frac{\sum (\text{Final CO Attainment}_i \times C_i)}{N} $$

---

## 4. Frontend Architecture & UI Engineering

The entire visual interface of OBEMIC is built using **Next.js (App Router)** and **React**. It is specifically designed to handle dynamic data visualization, seamless API integration, and flawless printable report generation.

### Key Frontend Technologies
- **Framework:** Next.js 14+ (App Router directory structure `src/app`).
- **Styling Engine:** Tailwind CSS combined with custom CSS for highly specific UI layouts (like the Survey Nexus).
- **Icons & Graphics:** `lucide-react` for lightweight, scalable SVG iconography.
- **Data Visualization:** `react-chartjs-2` (Chart.js) for rendering dynamic, animated CO/PO attainment bar charts.
- **Network / API Client:** `axios` configured with interceptors for JWT injection and error handling.

### Advanced Frontend Features

1. **State Management & Data Fetching:**
   Instead of a heavy global store (like Redux), OBEMIC relies on localized React state (`useState`, `useEffect`) paired with singleton service classes (`faculty.service.ts`, `admin.service.ts`). These service classes encapsulate all Axios requests, providing clean async methods to the UI components.

2. **Dynamic Routing & Path Parameters:**
   The App Router utilizes dynamic folder brackets to render specific data. For example:
   - `/faculty/subjects/[id]` dynamically captures the assignment ID from the URL, fetches the exact CO-PO mapping, and renders the corresponding graphs for that specific subject.
   - `/survey/[id]` allows unique survey instances to be rendered securely for students.

3. **Print-Optimized CSS Generation:**
   A major requirement for OBEMIC is exporting official NBA documents. We implemented advanced `@media print` CSS directives in the Faculty layout. When a user clicks "Print Report":
   - The dark mode UI, sidebars, and glowing glassmorphism backgrounds are instantly stripped away.
   - The layout forces a strict `800px` (A4) width with an absolute white background.
   - The Chart.js canvases, which normally resize fluidly, are frozen into static high-resolution off-screen frames (`left: -9999px`) before the print dialog opens, ensuring charts never render as "blank boxes" on the PDF.

4. **Authentication Guards (Route Protection):**
   The frontend actively manages the user's JSON Web Token (JWT). The API service interceptors watch for `401 Unauthorized` responses. If a session expires, the interceptor instantly flushes `localStorage` and redirects the user back to the `/login` portal, completely securing the Single Page Application (SPA).

---

## 5. Backend Architecture: "Under the Hood"

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
2. **Middleware (`/middleware`):** The shield. `auth.middleware.ts` decodes the JWT signature.
3. **Controllers (`/controllers`):** The HTTP bridge. Responsible solely for extracting `req.body` and orchestrating the response. *Zero business logic.*
4. **Services (`/services`):** The Brain. Excel files are streamed into memory, cells are parsed, and attainment arrays are computed.
5. **Repositories (`/repositories`):** The Database Abstraction. Contains pure Prisma queries (`findMany`, `create`).

---

## 6. Database Schema & ERD Analysis

- **Hierarchy Table Chain:** `AcademicYear` $\rightarrow$ `Semester` $\rightarrow$ `Subject` $\rightarrow$ `CourseOutcome`.
- **The Junction Hub (`FacultyAssignment`):** Links a `User` (Faculty) to a `Subject`, `AcademicYear`, and `Section`.
- **Reporting (`ReportHistory`):** Stores JSON blobs of the generated attainment data and manages the DRAFT $\rightarrow$ REVIEW $\rightarrow$ APPROVED workflow.

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
│   │   ├── config/                  # Global constants, permission enums
│   │   ├── controllers/             # HTTP boundary (req/res handling)
│   │   ├── database/                # PrismaClient singleton with pg adapter
│   │   ├── middleware/              # JWT verification and Multer file uploads
│   │   ├── routes/                  # API endpoints grouped by feature
│   │   └── services/
│   │       ├── attainment/          # 🧠 The massive Mathematical / Excel parser engine
│   │       └── *.service.ts         # Standard business logic for auth, academic, etc.
│   └── TEST/                        # Contains database seeding tools and scratch files
│
└── frontend/
    ├── src/
    │   ├── app/                     # Next.js 14 App Router Directory
    │   │   ├── admin/               # Admin Control Center pages & layouts
    │   │   ├── faculty/             # Faculty Dashboard pages (charts, reports)
    │   │   ├── survey/[id]/         # Dynamic Student Survey pages
    │   │   ├── globals.css          # Global Tailwind directives and print media rules
    │   │   └── layout.tsx           # Root HTML/Body wrapper
    │   ├── components/              
    │   │   ├── ui/                  # Reusable UI elements (Modals, Spinners)
    │   │   └── Charts.tsx           # Chart.js Bar Chart abstractions
    │   └── services/                # Axios wrappers mapping to Backend REST APIs
    │       ├── admin.service.ts
    │       ├── faculty.service.ts
    │       └── student.service.ts
    └── tailwind.config.ts           # Global design system tokens and colors
```

---

## 8. Local Developer Onboarding

### 1. Database Configuration (Backend)
Inside the `backend/` directory, create a `.env` file:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/obemic"
JWT_SECRET="development-secret-key-do-not-use-in-prod"
PORT=5000
```

### 2. Install & Generate (Backend)
```bash
cd backend
npm install
npx prisma db push --force-reset
npx prisma generate
```

### 3. Seed the Database
```bash
npx ts-node prisma/seed.ts
```

### 4. Boot the Servers

**Backend API Server:**
```bash
cd backend
npm run dev
```

**Frontend UI Server:**
Open a new terminal window.
```bash
cd frontend
npm install
npm run dev
```

### 5. Accessing the Platforms
- **Admin Hub:** Navigate to `http://localhost:3000/admin` *(Login with `admin@college.edu` / `password123`)*
- **Faculty Dashboard:** Navigate to `http://localhost:3000/faculty`
- **Student Survey Nexus:** Navigate to `http://localhost:3000/survey`

Welcome to the underground. Happy coding. 🚀
