<div align="center">
  <h1>🎯 OBEMIC</h1>
  <h3>Outcome-Based Education Management Information & Calculation</h3>
  <p>A centralized platform for automating Direct & Indirect Attainment of Course Outcomes, Program Outcomes, and Program Educational Objectives.</p>
</div>

---

## 📖 Overview

Welcome to **OBEMIC**, our Final Year Project! 

Accreditation boards (like NBA) require university departments to track how well students are actually learning the material, not just what grades they get. Faculty spend countless hours doing these calculations manually in chaotic Excel spreadsheets.

**OBEMIC** solves this. It provides a robust backend (and upcoming frontend) where:
- **Faculty** can upload their raw exam marks via Excel.
- **Students** can submit Course Outcome surveys.
- **The System** automatically calculates the exact **Direct and Indirect Attainment** metrics mapped to POs and PSOs.
- **Admins & Coordinators** can oversee, approve, and manage the entire academic structure.

---

## 🚀 Project Progress

We are building this iteratively. Here is our current status:

### 🟢 Backend (REST API) - `100% COMPLETE`
- [x] **Authentication & RBAC:** Complete JWT-based auth with roles (Admin, Coordinator, Faculty, Student).
- [x] **Academic Architecture:** Models for Departments, Years, Semesters, Subjects, and Sections.
- [x] **Database & ORM:** PostgreSQL schema powered by Prisma ORM (v7.9.1).
- [x] **Level 1-3 (Direct Attainment):** Automated Excel parser (`exceljs`) that ingests faculty mark sheets and mathematically computes Direct CO attainment.
- [x] **Level 4 (Indirect Attainment):** Complete Student Portal for submitting 1-5 scale surveys on Course Outcomes.
- [x] **Level 5 (Admin Reporting):** Aggregates Direct + Indirect into final metrics.

### 🟡 Frontend (UI) - `IN PROGRESS`
- [ ] Connect React/Vue UI to the backend endpoints.
- [ ] Build Admin Dashboard.
- [ ] Build Faculty Upload screens.
- [ ] Build Student Survey portal.

---

## 🧠 The Math: POs, PSOs, PEOs & Attainment

OBEMIC automates the heavy mathematical lifting defined by outcome-based education. Here is exactly what those acronyms mean and how we calculate them:

### Core Definitions
- **PEO (Program Educational Objectives):** Broad statements describing what graduates are expected to achieve in their careers (e.g., "Graduates will be successful software engineers").
- **PO (Program Outcomes):** 12 standard outcomes (defined by NBA/ABET) that students must know by graduation (e.g., Engineering Knowledge, Ethics).
- **PSO (Program Specific Outcomes):** Outcomes specific to a department (e.g., "Design IoT systems" for the IT dept).
- **CO (Course Outcomes):** 5 to 6 specific statements detailing what students learn in a *single subject*.

### 1. Direct Attainment (Exams)
Calculated from actual student performance (Internal Mid-Sems & External Exams).
- **Threshold:** (e.g., 60%). If a student scores >= 60% of the max marks for a specific question, they "attained" it.
- **Levels:**
  - **Level 3 (High):** > 70% of students crossed the threshold.
  - **Level 2 (Medium):** 60% - 69% crossed.
  - **Level 1 (Low):** 50% - 59% crossed.
  - **Level 0 (None):** < 50% crossed.
- *Total Direct Attainment = (0.3 × Internal Level) + (0.7 × External Level).*

### 2. Indirect Attainment (Surveys)
Calculated from students rating their confidence (1 to 5) on each CO.
- *Indirect Attainment = (Average Student Rating / 5) × 3* (Converts 5-point scale to standard 3-point scale).

### 3. Final CO Attainment
- *Final CO Attainment = (0.8 × Direct Attainment) + (0.2 × Indirect Attainment).*

### 4. PO / PSO Mapping
Every CO is mapped to specific POs and PSOs with a correlation of 1 (Low), 2 (Medium), or 3 (High).
- *PO Attainment = Average of [(Final CO Attainment × Correlation) / 3] across all COs.*

---

## 📁 Repository Structure

We recently restructured the repository to support a full-stack environment:

```text
OBEMIC/
├── backend/                  # The entire Node.js/Express REST API
│   ├── prisma/               # Database schemas and seeders
│   ├── src/
│   │   ├── controllers/      # Handles HTTP Requests/Responses
│   │   ├── services/         # The Brain: Excel parsing, math, business logic
│   │   ├── routes/           # URL mapping (e.g., /api/v1/auth)
│   │   ├── repositories/     # Prisma database queries
│   │   └── database/         # PostgreSQL connection pool (pg adapter)
│   ├── package.json
│   └── prisma.config.ts
├── frontend/                 # (Upcoming) Frontend UI Code
└── README.md                 # You are here!
```

---

## 🛠️ How to Run the Backend Locally

Since the backend is complete, you can test it directly via **Swagger UI** (no frontend required).

### Prerequisites
- Node.js installed.
- PostgreSQL installed and running on port `5432`.

### Setup
1. **Navigate to the Backend:**
   ```bash
   cd backend
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Variables:** Create a `.env` file inside the `backend/` folder:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/obemic"
   JWT_SECRET="super-secret-key"
   PORT=5000
   ```
4. **Push Schema & Generate Client:**
   ```bash
   npx prisma db push --force-reset
   npx prisma generate
   ```
5. **Seed the Database (Creates dummy data):**
   ```bash
   npx ts-node prisma/seed.ts
   ```
6. **Start the Server:**
   ```bash
   npm run dev
   ```

### 🧪 Testing via Swagger
1. Open your browser and go to: `http://localhost:5000/api-docs`
2. Under the **Auth** section, hit `POST /api/v1/auth/login`.
3. Use the dummy admin credentials:
   - **Email:** `admin@college.edu`
   - **Password:** `password123`
4. Copy the `accessToken`.
5. Scroll to the top, click the green **Authorize** button, and paste your token.
6. You can now test any API endpoint!
