# Academic Audit & Assessment Web Application

A full-featured web portal for university academic audits covering **19 audit forms (FORM AA-00 to FORM AA-18)** with 46 authenticated user accounts.

---

## 🚀 Quick Start

### 1. Start the Server
Make sure you have Node.js installed, then run:

```bash
npm start
# or directly:
node server.js
```

The portal will start instantly at:
```
http://localhost:3000
```

> **Note:** Zero external `npm install` packages required! The application is built using native Node.js standard libraries (`http`, `fs`, `path`, `crypto`). It starts in milliseconds and stores all department data safely in JSON files inside `data/departments/`.

---

## 👥 User Logins (46 Accounts)

| Role | Username | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `rahul` | `rahul` | Can see all 45 departments in a live dashboard, view progress stats, open and edit any department's forms, update audit statuses, and export reports. |
| **Department 1** | `dep_001` | `dep_001` | Can fill and save their department forms (AA-00 to AA-18), add dynamic rows, update draft, and submit. |
| **Department 2** | `dep_002` | `dep_002` | Independent portal space for Department 2. |
| ... | ... | ... | ... |
| **Department 45** | `dep_045` | `dep_045` | Independent portal space for Department 45. |

---

## 📋 Forms Breakdown & Data Entry Types

The application covers all 19 forms from the Academic Audit Document, categorized into their specific operational patterns:

### Type 1: Particulars / Fixed Tabular Forms
- **FORM AA-00**: Department Academic Self-Assessment Cover Sheet (Particulars grid + Certification sign-off)
- **FORM AA-01**: Department Academic Profile (17 core comparison items)
- **FORM AA-03**: Teaching-Learning & Faculty Quality (10 benchmark indicators)
- **FORM AA-06**: Research, Innovation, IPR & Ethics (12 metrics + 4 Ethics Controls)
- **FORM AA-09**: Student Support, Progression & Achievement (Progression metrics + Student support activities)
- **FORM AA-10**: Academic Infrastructure & Learning Resources (Classrooms, labs, instruments, utilization)
- **FORM AA-11**: Department Academic Quality Management (Quality processes, calendar, reviews)
- **FORM AA-13**: Benchmark Performance Card (Particulars + Benchmark gap scores)
- **FORM AA-14**: Auditor Observation / Finding (Classification radios + Root cause analysis)
- **FORM AA-17**: Domain Score Sheet (Weights, applicable weight, points obtained, achievement %)
- **FORM AA-18**: Final Academic Audit Scorecard (Performance indicators, top strengths, priority gaps, signatures)

### Type 2: Dynamic Row-Wise Insertion Forms (with `+ Add Row` & Delete)
Users can click the **`+ Add Row`** button to dynamically add new entries, and delete rows as required:
- **FORM AA-02**: Curriculum, Academic Flexibility & Enrichment (Programme-wise course revisions, field projects, internships) + Auditor observations textarea
- **FORM AA-04**: Faculty Academic Profile (Roster of faculty members, qualifications, experience, FDP, ICT, mentoring, research output)
- **FORM AA-05**: Evaluation, Examination & Learning Outcomes (Part A: Programme/semester exam pass percentages, days, grievances)
- **FORM AA-07**: Individual Faculty Research Record (Scopus/WoS papers, citations, patents, funding, PhD awards, consultancy)
- **FORM AA-08**: Consultancy, Extension & Collaboration (MoUs, training, student involvement, revenue)
- **FORM AA-12**: Evidence Register (Catalog of evidence IDs, descriptions, grades E1/E2/E3, verification)
- **FORM AA-15**: Corrective Action & Benchmark Improvement Plan (Root cause, actions, deadlines, KPIs, status, IQAC verification)
- **FORM AA-16**: Previous Audit Compliance Report (Follow-up actions agreed and closure dates)

---

## 🛠 Key Features

1. **Auto-Persistence & State Preservation**:
   - Each department has an isolated data record in `data/departments/{deptId}.json`.
   - Data persists across browser restarts and server restarts.
   - Departments can save draft, log out, and return later to update.

2. **Admin Directory & Full Edit Privileges**:
   - When **rahul** logs in, an administrative dashboard shows real-time stats across all 45 departments (Not Started, In Progress, Submitted, Audited).
   - Search by department ID or name, filter by status.
   - Click **Review & Edit** on any department to inspect what was filled and make corrections directly with full save capabilities.
   - Quick department dropdown switcher on the top bar for easy navigation between departments.

3. **User-Friendly UI/UX**:
   - Clean, academic blue theme with responsive data tables.
   - Keyboard shortcut: **`Ctrl + S`** (or `Cmd + S`) to save changes immediately.
   - Real-time indicator for unsaved changes.
   - Print-ready stylesheet: click **Print Form** to get clean physical or PDF printouts.
   - Quick demo login buttons on the login screen for testing.

