# OBEMIC (Outcome-Based Education Management & Information Control)
**Role Workflows & Process Guide**

This document outlines the step-by-step processes for every user role within the OBEMIC system.

---

## 🛠️ 1. Administrator Workflow

The Admin is responsible for setting up the foundational academic structure and mapping the data before the semester begins.

1. **Login**
   - **Endpoint:** `POST /api/v1/auth/login`
   - **Action:** Authenticate using the Admin credentials to receive a JWT token.

2. **Academic Structure Setup**
   - **Endpoints:** `POST /api/v1/academic/departments`, `POST /api/v1/academic/years`, `POST /api/v1/academic/semesters`
   - **Action:** Define the basic college structure.

3. **Subject Creation**
   - **Endpoint:** `POST /api/v1/academic/subjects`
   - **Action:** Create the subjects that will be taught in the current semester.

4. **Upload Course Outcomes (COs)**
   - **Endpoints:** `POST /api/v1/admin/course-outcomes/upload/preview` -> `confirm`
   - **Action:** Upload an Excel file that maps every Subject to its specific Course Outcomes (Goals).

5. **Upload Faculty Assignments**
   - **Endpoints:** `POST /api/v1/admin/faculty/upload/preview` -> `confirm`
   - **Action:** Upload an Excel file that assigns specific Faculty members to the Subjects they are teaching.

---

## 👨‍🏫 2. Faculty Workflow

The Faculty member is responsible for teaching the subject, collecting marks, and using OBEMIC to automatically calculate the Outcome Attainment.

1. **Login**
   - **Endpoint:** `POST /api/v1/auth/login`
   - **Action:** Authenticate using Faculty credentials (e.g., `2225@obemic.local`).

2. **Check Dashboard / Assigned Subjects**
   - **Endpoint:** `GET /api/v1/faculty/subjects`
   - **Action:** View the list of subjects the Admin has assigned them to teach.

3. **Upload Marks & Generate Attainment (The Core Engine)**
   - **Endpoints:** 
     - Internal Marks: `POST /api/v1/reports/generate/internal`
     - External Marks: `POST /api/v1/reports/generate/external`
     - Lab Marks: `POST /api/v1/reports/generate/lab`
   - **Action:** The Faculty uploads their standard Excel template filled with student marks and specifies the `subjectCode`. The system dynamically injects the Course Outcomes and formulas, and immediately returns a fully calculated Excel report.

4. **Review History & Download**
   - **Endpoints:** `GET /api/v1/reports/history` & `GET /api/v1/reports/download/{id}`
   - **Action:** Faculty can view past generated reports and download them for manual review.

5. **Submit to Coordinator**
   - **Endpoint:** `POST /api/v1/reports/{id}/submit`
   - **Action:** Once the Faculty is satisfied with the generated report, they officially submit it. The status changes from `GENERATED` to `SUBMITTED`, locking it for Coordinator review.

---

## 📋 3. Coordinator Workflow (Next Phase)

The Coordinator oversees the OBE process for their department to ensure accuracy and compliance.

1. **Login**
   - **Endpoint:** `POST /api/v1/auth/login`
   - **Action:** Authenticate using Coordinator credentials.

2. **Review Submitted Reports**
   - **Endpoint:** `GET /api/v1/coordinator/reports/pending` *(Upcoming)*
   - **Action:** View all reports submitted by the Faculty in their department.

3. **Approve or Reject**
   - **Endpoint:** `POST /api/v1/coordinator/reports/{id}/decide` *(Upcoming)*
   - **Action:** Download and review the Excel file. If everything is correct, they **Approve** it. If there is a discrepancy, they **Reject** it (sending it back to the Faculty with comments for revision).
