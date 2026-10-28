// forms-config.js - Schema, default rows, and structure for Forms AA-00 to AA-18

const FORMS_METADATA = [
  {
    id: "AA-00",
    code: "FORM AA-00",
    title: "Department Academic Self-Assessment Cover Sheet",
    type: "particulars",
    description: "Basic institutional particulars, faculty counts, student strength, and head/coordinator certification."
  },
  {
    id: "AA-01",
    code: "FORM AA-01",
    title: "Department Academic Profile",
    type: "fixed_table",
    description: "17 core institutional parameters comparing Current Year, Previous Year, and Evidence IDs."
  },
  {
    id: "AA-02",
    code: "FORM AA-02",
    title: "Curriculum, Academic Flexibility & Enrichment",
    type: "dynamic_table",
    description: "Programme-wise breakdown of courses, curriculum revision, value-added modules, field projects, and feedback."
  },
  {
    id: "AA-03",
    code: "FORM AA-03",
    title: "Teaching-Learning & Faculty Quality",
    type: "fixed_table",
    description: "10 teaching-learning metrics with benchmark targets, Level (0–4), and auditor remarks."
  },
  {
    id: "AA-04",
    code: "FORM AA-04",
    title: "Faculty Academic Profile",
    type: "dynamic_table",
    description: "Roster of individual faculty members, qualifications, experience, FDP, ICT usage, and mentoring."
  },
  {
    id: "AA-05",
    code: "FORM AA-05",
    title: "Evaluation, Examination & Learning Outcomes",
    type: "composite",
    description: "Examination pass rates and evaluation grievance records plus outcome assessment processes."
  },
  {
    id: "AA-06",
    code: "FORM AA-06",
    title: "Research, Innovation, IPR & Ethics",
    type: "composite",
    description: "Department research metrics, funding, patents, publications, and ethics committee controls."
  },
  {
    id: "AA-07",
    code: "FORM AA-07",
    title: "Individual Faculty Research Record",
    type: "dynamic_table",
    description: "Faculty-level Scopus/WoS publications, citations, patents, sponsored projects, and consultancy."
  },
  {
    id: "AA-08",
    code: "FORM AA-08",
    title: "Consultancy, Extension & Collaboration",
    type: "dynamic_table",
    description: "MoUs, consultancy assignments, extension activities, corporate training, and research collaborations."
  },
  {
    id: "AA-09",
    code: "FORM AA-09",
    title: "Student Support, Progression & Achievement",
    type: "composite",
    description: "Scholarships, placements, competitive exam qualifiers, and student enrichment programs."
  },
  {
    id: "AA-10",
    code: "FORM AA-10",
    title: "Academic Infrastructure & Learning Resources",
    type: "fixed_table",
    description: "Classrooms, labs, major instruments, digital library, and computing facility utilization."
  },
  {
    id: "AA-11",
    code: "FORM AA-11",
    title: "Department Academic Quality Management",
    type: "fixed_table",
    description: "Quality processes, academic calendar adherence, DQAC review meetings, and AAA closure."
  },
  {
    id: "AA-12",
    code: "FORM AA-12",
    title: "Evidence Register",
    type: "dynamic_table",
    description: "Catalogue of verified institutional evidence files, URLs, and evidence grades (E1/E2/E3)."
  },
  {
    id: "AA-13",
    code: "FORM AA-13",
    title: "Benchmark Performance Card",
    type: "particulars",
    description: "Metric level benchmarking, gap index calculations, corrective actions, and priority scoring."
  },
  {
    id: "AA-14",
    code: "FORM AA-14",
    title: "Auditor Observation / Finding",
    type: "particulars",
    description: "Auditor classifications (Commendation, OFI, NC-Minor, NC-Major, CR) and root-cause analysis."
  },
  {
    id: "AA-15",
    code: "FORM AA-15",
    title: "Corrective Action & Benchmark Improvement Plan",
    type: "dynamic_table",
    description: "Action plan for observed findings, milestone dates, responsible persons, and IQAC verification."
  },
  {
    id: "AA-16",
    code: "FORM AA-16",
    title: "Previous Audit Compliance Report",
    type: "dynamic_table",
    description: "Follow-up tracking on previously agreed audit recommendations and closure verification."
  },
  {
    id: "AA-17",
    code: "FORM AA-17",
    title: "Domain Score Sheet",
    type: "fixed_table",
    description: "Domain-wise weighted evaluation points across all 8 criteria leading to total score."
  },
  {
    id: "AA-18",
    code: "FORM AA-18",
    title: "Final Department Academic Audit Scorecard",
    type: "composite",
    description: "Overall audit performance score %, classification, key strengths, priority gaps, and audit committee sign-off."
  }
];

function getDefaultFormData() {
  return {
    "AA-00": {
      particulars: {
        academicYear: "2025-2026",
        faculty: "",
        departmentCentre: "",
        headName: "",
        submissionDate: "",
        auditDate: "",
        numProgrammes: "",
        totalStudents: "",
        sanctionedFaculty: "",
        facultyInPosition: "",
        researchScholars: "",
        dataCoordinator: ""
      },
      certifications: [
        { role: "Head / Head (i/c) / Coordinator", name: "", signature: "", date: "" },
        { role: "Department Data Coordinator / DQAC representative", name: "", signature: "", date: "" }
      ]
    },

    "AA-01": {
      rows: [
        { item: "Programmes offered", currentYear: "", previousYear: "", remarks: "" },
        { item: "Courses offered", currentYear: "", previousYear: "", remarks: "" },
        { item: "New/revised courses", currentYear: "", previousYear: "", remarks: "" },
        { item: "Students enrolled", currentYear: "", previousYear: "", remarks: "" },
        { item: "Outgoing students", currentYear: "", previousYear: "", remarks: "" },
        { item: "Sanctioned faculty posts", currentYear: "", previousYear: "", remarks: "" },
        { item: "Full-time teachers in position", currentYear: "", previousYear: "", remarks: "" },
        { item: "Teachers with PhD/equivalent", currentYear: "", previousYear: "", remarks: "" },
        { item: "Research scholars enrolled", currentYear: "", previousYear: "", remarks: "" },
        { item: "JRF/SRF scholars", currentYear: "", previousYear: "", remarks: "" },
        { item: "PhDs awarded", currentYear: "", previousYear: "", remarks: "" },
        { item: "Research projects active", currentYear: "", previousYear: "", remarks: "" },
        { item: "Research funding received (₹ lakh)", currentYear: "", previousYear: "", remarks: "" },
        { item: "Publications", currentYear: "", previousYear: "", remarks: "" },
        { item: "Patents awarded", currentYear: "", previousYear: "", remarks: "" },
        { item: "Consultancy revenue (₹ lakh)", currentYear: "", previousYear: "", remarks: "" },
        { item: "Functional MoUs/linkages", currentYear: "", previousYear: "", remarks: "" }
      ]
    },

    "AA-02": {
      rows: [
        { programme: "", totalCourses: "", newRevised: "", pct: "", valueAdded: "", fieldProject: "", internship: "", feedbackAtr: "", evidenceId: "", auditorLevel: "" }
      ],
      observations: ""
    },

    "AA-03": {
      rows: [
        { indicator: "Enrolment %", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Reserved-category seats filled %", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Student : full-time teacher ratio", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Faculty filled against sanctioned posts %", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Full-time faculty with PhD/equivalent %", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Average teaching experience (years)", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Classes conducted vs scheduled %", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Syllabus completion %", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Courses using LMS/ICT %", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" },
        { indicator: "Students covered by mentoring %", rawData: "", benchmark: "", level: "", evidenceId: "", remark: "" }
      ]
    },

    "AA-04": {
      rows: [
        { faculty: "", designation: "", qualification: "", experience: "", coursesCredits: "", fdp: "Y", ictLms: "", mentoring: "", researchOutput: "", evidenceId: "" }
      ]
    },

    "AA-05": {
      examRows: [
        { programmeSemester: "", examEndDate: "", resultDate: "", days: "", appeared: "", passed: "", passPct: "", grievances: "", grievancePct: "", evidence: "" }
      ],
      processRows: [
        { process: "COs defined and communicated", status: "Yes", evidenceId: "", observation: "" },
        { process: "CO–PO/PSO mapping completed", status: "Yes", evidenceId: "", observation: "" },
        { process: "Attainment methodology approved", status: "Yes", evidenceId: "", observation: "" },
        { process: "Attainment calculated", status: "Yes", evidenceId: "", observation: "" },
        { process: "Corrective action based on attainment", status: "Yes", evidenceId: "", observation: "" },
        { process: "Student feedback / SSS reviewed", status: "Yes", evidenceId: "", observation: "" }
      ]
    },

    "AA-06": {
      indicatorRows: [
        { indicator: "Seed money (₹ lakh)", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Teachers receiving fellowship/support %", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "JRF/SRF among PhD scholars %", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Research funding (₹ lakh)", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Funded projects per teacher", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Research/innovation awards", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Patents awarded", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "PhDs awarded per guide", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Research papers per teacher", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Books/chapters per teacher", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Average citation index", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "University/discipline h-index contribution", currentYear: "", rollingValue: "", benchmark: "", level: "", evidenceId: "" }
      ],
      ethicsRows: [
        { process: "Research ethics in methodology coursework and Masters", status: "Implemented", evidenceId: "", comment: "" },
        { process: "Relevant institutional ethics committee(s)", status: "Active", evidenceId: "", comment: "" },
        { process: "Plagiarism check system", status: "Operational", evidenceId: "", comment: "" },
        { process: "Research Advisory Committee", status: "Constituted", evidenceId: "", comment: "" }
      ]
    },

    "AA-07": {
      rows: [
        { faculty: "", scopusPapers: "", booksChapters: "", citations: "", patents: "", projects: "", funding: "", phdAwards: "", consultancy: "", evidence: "" }
      ]
    },

    "AA-08": {
      rows: [
        { activityPartner: "", type: "MoU", period: "", participants: "", revenue: "", outcome: "", functional: "Yes", evidenceId: "" }
      ]
    },

    "AA-09": {
      indicatorRows: [
        { indicator: "Students receiving scholarship/freeship", numerator: "", denominator: "", valuePct: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Outgoing students placed", numerator: "", denominator: "", valuePct: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Graduates progressing to higher education", numerator: "", denominator: "", valuePct: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Students qualifying national/state/international examinations", numerator: "", denominator: "", valuePct: "", benchmark: "", level: "", evidenceId: "" },
        { indicator: "Student awards/medals", numerator: "", denominator: "", valuePct: "", benchmark: "", level: "", evidenceId: "" }
      ],
      activityRows: [
        { activity: "Soft skills", conducted: "Yes", numberReach: "", outcome: "", evidenceId: "" },
        { activity: "Language/communication", conducted: "Yes", numberReach: "", outcome: "", evidenceId: "" },
        { activity: "Life skills/health/entrepreneurship", conducted: "Yes", numberReach: "", outcome: "", evidenceId: "" },
        { activity: "Technology awareness", conducted: "Yes", numberReach: "", outcome: "", evidenceId: "" },
        { activity: "Academic/sports/cultural/club events", conducted: "Yes", numberReach: "", outcome: "", evidenceId: "" }
      ]
    },

    "AA-10": {
      rows: [
        { facility: "Classrooms", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" },
        { facility: "Teaching laboratories", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" },
        { facility: "Research laboratories", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" },
        { facility: "Major instruments", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" },
        { facility: "Library/e-resources", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" },
        { facility: "Computers for students", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" },
        { facility: "Internet/LMS facilities", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" },
        { facility: "E-content development facilities", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" },
        { facility: "Specialised academic facilities", available: "", functional: "", utilisationPct: "", maintenance: "", gap: "", evidenceId: "" }
      ]
    },

    "AA-11": {
      rows: [
        { process: "Annual academic plan", status: "Prepared", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" },
        { process: "Academic calendar", status: "Adhered", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" },
        { process: "Department meetings", status: "Regular", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" },
        { process: "Student feedback review", status: "Completed", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" },
        { process: "Faculty performance review", status: "Conducted", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" },
        { process: "Academic data validation", status: "Verified", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" },
        { process: "Previous AAA action closure", status: "Closed", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" },
        { process: "Best practice/innovation", status: "Documented", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" },
        { process: "Next-year academic targets", status: "Finalized", frequencyDate: "", outcomeAction: "", evidenceId: "", auditorLevel: "" }
      ]
    },

    "AA-12": {
      rows: [
        { evidenceId: "EV-001", domainMetric: "Curriculum", titleDescription: "BOS Minutes of Meeting", period: "2025", owner: "HOD", locationUrl: "Drive/BOS-2025.pdf", grade: "E1", verifiedBy: "Auditor 1" }
      ]
    },

    "AA-13": {
      particulars: {
        academicYear: "2025-2026",
        department: "",
        criterionDomain: "Teaching & Learning",
        metric: "",
        responsiblePerson: "",
        dataOwner: ""
      },
      fields: {
        metricDef: "",
        benchmarkL4: "",
        prevYearVal: "",
        currYearContrib: "",
        prevRollingVal: "",
        currRollingVal: "",
        levelAchieved: "Level 3",
        metricWeight: "",
        weightedScore: "",
        gapIndex: "",
        priorityGapScore: "",
        evidenceIds: "",
        auditorObservation: "",
        correctiveAction: "",
        responsiblePersonField: "",
        targetDate: ""
      }
    },

    "AA-14": {
      particulars: {
        auditDate: "",
        department: "",
        obsNo: "OBS-01",
        domain: "Research & Innovation",
        metricProcess: "",
        auditor: ""
      },
      classification: "OFI — Opportunity for Improvement",
      fields: {
        observation: "",
        evidenceExamined: "",
        expectedBenchmark: "",
        observedPerf: "",
        gapRootCause: "",
        recommendation: "",
        responsibleAuthority: "",
        targetDate: ""
      }
    },

    "AA-15": {
      rows: [
        { findingMetric: "", currentLevel: "Level 2", targetLevel: "Level 4", rootCause: "", action: "", responsibility: "", resources: "", deadline: "", kpi: "", status: "Initiated", iqacVerification: "Pending" }
      ]
    },

    "AA-16": {
      rows: [
        { previousFinding: "", actionAgreed: "", dueDate: "", actionTaken: "", evidenceId: "", status: "Completed", auditorVerification: "Verified", closureDate: "" }
      ]
    },

    "AA-17": {
      rows: [
        { domain: "AA-1 Curriculum", weight: "15", applicableWeight: "15", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" },
        { domain: "AA-2 Teaching-Learning", weight: "20", applicableWeight: "20", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" },
        { domain: "AA-3 Evaluation & Outcomes", weight: "10", applicableWeight: "10", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" },
        { domain: "AA-4 Research & Innovation", weight: "20", applicableWeight: "20", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" },
        { domain: "AA-5 Consultancy/Extension/Collaboration", weight: "10", applicableWeight: "10", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" },
        { domain: "AA-6 Student Progression", weight: "10", applicableWeight: "10", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" },
        { domain: "AA-7 Infrastructure", weight: "10", applicableWeight: "10", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" },
        { domain: "AA-8 Quality Management", weight: "5", applicableWeight: "5", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" },
        { domain: "TOTAL", weight: "100", applicableWeight: "100", pointsObtained: "", achievementPct: "", bgiPriority: "", keyFinding: "" }
      ]
    },

    "AA-18": {
      particulars: {
        academicYear: "2025-2026",
        department: "",
        school: "",
        auditDate: "",
        teamChair: "",
        prevScore: ""
      },
      indicators: {
        auditScore: "",
        classification: "Very Good (A)",
        changePrevYear: "",
        pctL4: "",
        pctL3: "",
        pctL2: "",
        pctL1: "",
        pctL0: "",
        commendationsCount: "",
        ofisCount: "",
        minorNCs: "",
        majorNCs: "",
        criticalRisks: ""
      },
      strengths: ["", "", ""],
      gaps: ["", "", ""],
      signatures: [
        { role: "Audit Team Chair", name: "", signature: "", date: "" },
        { role: "Auditor/Subject Expert", name: "", signature: "", date: "" },
        { role: "IQAC Nominee", name: "", signature: "", date: "" },
        { role: "Head/Coordinator (acknowledgement)", name: "", signature: "", date: "" }
      ]
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FORMS_METADATA,
    getDefaultFormData
  };
}

