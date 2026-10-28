// app.js - Main Application Client Logic
let currentUser = null;
let currentDeptId = null;
let currentDeptData = null;
let currentFormIndex = 0;
let isDirty = false;
let allDepartmentsList = [];

// DOM References
const loginView = document.getElementById('loginView');
const mainView = document.getElementById('mainView');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupKeyboardShortcuts();
  checkAuthSession();
});

// Toast notification helper
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.className = `toast toast-${type} show`;
  toastIcon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
  setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

// Quick prefill helper for demo
function quickFill(user, pass) {
  usernameInput.value = user;
  passwordInput.value = pass;
}

// Keyboard shortcuts (Ctrl+S to save)
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (currentDeptData && (isDirty || currentUser.role === 'admin')) {
        saveCurrentDepartmentData();
      }
    }
  });
}

// Check session on page load
async function checkAuthSession() {
  const token = localStorage.getItem('tu_auth_token');
  if (!token) {
    showLogin();
    return;
  }

  try {
    const res = await fetch('/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      initAppForUser();
    } else {
      localStorage.removeItem('tu_auth_token');
      showLogin();
    }
  } catch (err) {
    localStorage.removeItem('tu_auth_token');
    showLogin();
  }
}

// Show Login view
function showLogin() {
  loginView.style.display = 'flex';
  mainView.style.display = 'none';
}

// Handle Login submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('tu_auth_token', data.token);
      currentUser = data.user;
      showToast(`Welcome back, ${currentUser.name}!`, 'success');
      initAppForUser();
    } else {
      showToast(data.error || 'Authentication failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In to Portal';
  }
});

// Logout
async function handleLogout() {
  const token = localStorage.getItem('tu_auth_token');
  if (token) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {}
  }
  localStorage.removeItem('tu_auth_token');
  currentUser = null;
  currentDeptId = null;
  currentDeptData = null;
  showLogin();
  showToast('Logged out successfully');
}

// Initialize App layout based on user role
async function initAppForUser() {
  loginView.style.display = 'none';
  mainView.style.display = 'block';

  document.getElementById('userDisplayName').textContent = currentUser.name;
  document.getElementById('userRoleBadge').textContent = currentUser.role === 'admin' ? 'Administrator' : `Department ID: ${currentUser.deptId}`;
  document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();

  renderSidebarNav();

  if (currentUser.role === 'admin') {
    document.getElementById('adminNavControls').style.display = 'block';
    await loadAdminDepartments();
    showAdminDirectory();
  } else {
    // Regular department user
    document.getElementById('adminNavControls').style.display = 'none';
    document.getElementById('adminInspectionBanner').style.display = 'none';
    loadDepartmentData(currentUser.deptId);
  }
}

// Render Sidebar Navigation list with all 19 forms
function renderSidebarNav() {
  const navList = document.getElementById('formsNavList');
  navList.innerHTML = '';

  FORMS_METADATA.forEach((form, idx) => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.innerHTML = `
      <a class="nav-link ${idx === currentFormIndex ? 'active' : ''}" onclick="selectForm(${idx})">
        <span class="nav-code">${form.id}</span>
        <span class="nav-title-text" title="${form.title}">${form.title}</span>
      </a>
    `;
    navList.appendChild(li);
  });
}

// Select a form
function selectForm(index) {
  if (isDirty) {
    saveCurrentDepartmentData(false);
  }
  currentFormIndex = index;
  renderSidebarNav();
  renderCurrentForm();
}

// Next / Previous Navigation
function navigateForm(direction) {
  const newIndex = currentFormIndex + direction;
  if (newIndex >= 0 && newIndex < FORMS_METADATA.length) {
    selectForm(newIndex);
  }
}

// Show Admin Directory
function showAdminDirectory() {
  document.getElementById('adminDashboardView').style.display = 'block';
  document.getElementById('formsWorkspaceView').style.display = 'none';
  document.getElementById('adminInspectionBanner').style.display = 'none';
  loadAdminDepartments();
}

// Load All 45 Departments for Admin
async function loadAdminDepartments() {
  const token = localStorage.getItem('tu_auth_token');
  try {
    const res = await fetch('/api/departments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      allDepartmentsList = data.departments;
      updateAdminDashboardStats();
      renderAdminDeptsTable(allDepartmentsList);
      populateAdminDeptSelector();
    }
  } catch (err) {
    showToast('Failed to load departments', 'error');
  }
}

// Update Admin Stats
function updateAdminDashboardStats() {
  const total = allDepartmentsList.length;
  let submitted = 0;
  let inProgress = 0;
  let notStarted = 0;

  allDepartmentsList.forEach(d => {
    if (d.status === 'Submitted' || d.status === 'Audited') submitted++;
    else if (d.status === 'In Progress') inProgress++;
    else notStarted++;
  });

  document.getElementById('statTotalDepts').textContent = total;
  document.getElementById('statSubmittedDepts').textContent = submitted;
  document.getElementById('statInProgressDepts').textContent = inProgress;
  document.getElementById('statNotStartedDepts').textContent = notStarted;
}

// Render Admin Departments Table
function renderAdminDeptsTable(list) {
  const tbody = document.getElementById('adminDeptsTableBody');
  tbody.innerHTML = '';
  document.getElementById('deptCountBadge').textContent = list.length;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">No departments match your filter.</td></tr>`;
    return;
  }

  list.forEach(dept => {
    const tr = document.createElement('tr');

    let statusClass = 'status-not-started';
    if (dept.status === 'In Progress') statusClass = 'status-in-progress';
    if (dept.status === 'Submitted') statusClass = 'status-submitted';
    if (dept.status === 'Audited') statusClass = 'status-audited';

    const lastUpdatedFormatted = dept.lastUpdated
      ? new Date(dept.lastUpdated).toLocaleString()
      : '<span style="color:#94a3b8;">Never</span>';

    const progressPct = Math.round((dept.formsFilledCount / dept.totalForms) * 100);

    tr.innerHTML = `
      <td><strong style="color: #1e3a8a;">${dept.deptId}</strong></td>
      <td><strong>${dept.deptName}</strong></td>
      <td><span class="dept-status ${statusClass}">${dept.status}</span></td>
      <td>
        <div style="font-size: 0.8rem; margin-bottom: 3px;">${dept.formsFilledCount} of ${dept.totalForms} filled (${progressPct}%)</div>
        <div style="width: 100%; background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
          <div style="width: ${progressPct}%; background: ${progressPct > 70 ? '#10b981' : progressPct > 30 ? '#f59e0b' : '#3b82f6'}; height: 100%;"></div>
        </div>
      </td>
      <td style="font-size: 0.85rem;">${lastUpdatedFormatted}</td>
      <td style="font-size: 0.85rem; color: #64748b;">${dept.updatedBy || '—'}</td>
      <td style="text-align: center;">
        <button class="btn btn-primary btn-sm" onclick="adminOpenDept('${dept.deptId}')">
          <i class="fas fa-edit"></i> Review & Edit
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Filter Departments in Admin View
function filterDeptList() {
  const search = document.getElementById('deptSearchInput').value.toLowerCase().trim();
  const status = document.getElementById('statusFilterSelect').value;

  const filtered = allDepartmentsList.filter(dept => {
    const matchesSearch = dept.deptId.toLowerCase().includes(search) || dept.deptName.toLowerCase().includes(search);
    const matchesStatus = status === 'ALL' || dept.status === status;
    return matchesSearch && matchesStatus;
  });

  renderAdminDeptsTable(filtered);
}

// Populate Admin Switcher Dropdown
function populateAdminDeptSelector() {
  const select = document.getElementById('adminDeptSelector');
  select.innerHTML = '';
  allDepartmentsList.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept.deptId;
    opt.textContent = `${dept.deptId} - ${dept.deptName}`;
    if (dept.deptId === currentDeptId) opt.selected = true;
    select.appendChild(opt);
  });
}

// Admin opens a department
function adminOpenDept(deptId) {
  loadDepartmentData(deptId);
}

// Switch department via dropdown
function switchDepartment(deptId) {
  if (isDirty) {
    saveCurrentDepartmentData(false);
  }
  loadDepartmentData(deptId);
}

// Load specific Department data
async function loadDepartmentData(deptId) {
  currentDeptId = deptId;
  const token = localStorage.getItem('tu_auth_token');

  try {
    const res = await fetch(`/api/departments/${deptId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.data) {
      currentDeptData = data.data;
      isDirty = false;
      updateDirtyIndicator();

      // Show forms workspace
      document.getElementById('adminDashboardView').style.display = 'none';
      document.getElementById('formsWorkspaceView').style.display = 'flex';

      // Update sidebar dept summary
      document.getElementById('sidebarDeptName').textContent = currentDeptData.meta.deptName || deptId;
      updateStatusBadge('sidebarDeptStatus', currentDeptData.meta.status);
      document.getElementById('formStatusSelect').value = currentDeptData.meta.status || 'Not Started';

      // If Admin, show inspection banner
      if (currentUser.role === 'admin') {
        const banner = document.getElementById('adminInspectionBanner');
        banner.style.display = 'flex';
        document.getElementById('adminActiveDeptName').textContent = `${deptId} (${currentDeptData.meta.deptName})`;
        document.getElementById('adminDeptSelector').value = deptId;
      }

      renderCurrentForm();
    } else {
      showToast(data.error || 'Failed to load department data', 'error');
    }
  } catch (err) {
    showToast('Network error while loading department data', 'error');
  }
}

function updateStatusBadge(elementId, status) {
  const el = document.getElementById(elementId);
  el.textContent = status || 'Not Started';
  el.className = 'dept-status';
  if (status === 'In Progress') el.classList.add('status-in-progress');
  else if (status === 'Submitted') el.classList.add('status-submitted');
  else if (status === 'Audited') el.classList.add('status-audited');
  else el.classList.add('status-not-started');
}

function markDirty() {
  isDirty = true;
  updateDirtyIndicator();
}

function updateDirtyIndicator() {
  const indicator = document.getElementById('saveStatusIndicator');
  if (isDirty) {
    indicator.className = 'dirty-indicator';
    indicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Unsaved changes (Ctrl+S to save)</span>';
  } else {
    indicator.className = 'clean-indicator';
    indicator.innerHTML = '<i class="fas fa-check-circle"></i> <span>All changes saved</span>';
  }
}

// Save Current Department Data
async function saveCurrentDepartmentData(showSuccessToast = true) {
  if (!currentDeptData || !currentDeptId) return;

  const token = localStorage.getItem('tu_auth_token');
  const selectedStatus = document.getElementById('formStatusSelect').value;

  const payload = {
    forms: currentDeptData.forms,
    status: selectedStatus,
    deptName: currentDeptData.meta.deptName
  };

  const btn = document.getElementById('btnSaveData');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const res = await fetch(`/api/departments/${currentDeptId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      currentDeptData.meta = result.meta;
      isDirty = false;
      updateDirtyIndicator();
      updateStatusBadge('sidebarDeptStatus', result.meta.status);
      if (showSuccessToast) {
        showToast('All changes saved successfully!', 'success');
      }
    } else {
      showToast(result.error || 'Failed to save', 'error');
    }
  } catch (err) {
    showToast('Network error while saving data', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Changes (Ctrl+S)';
  }
}

// RENDER CURRENT FORM
function renderCurrentForm() {
  const formMeta = FORMS_METADATA[currentFormIndex];
  document.getElementById('currentFormCode').textContent = formMeta.code;
  document.getElementById('currentFormTitle').textContent = formMeta.title;
  document.getElementById('currentFormDesc').textContent = formMeta.description;

  const container = document.getElementById('formContentArea');
  container.innerHTML = '';

  const formKey = formMeta.id;
  if (!currentDeptData.forms[formKey]) {
    const defaultData = getDefaultFormData();
    currentDeptData.forms[formKey] = defaultData[formKey];
  }

  const formData = currentDeptData.forms[formKey];

  // Dispatch renderer based on form ID
  switch (formKey) {
    case 'AA-00':
      renderFormAA00(container, formData);
      break;
    case 'AA-01':
      renderFormAA01(container, formData);
      break;
    case 'AA-02':
      renderFormAA02(container, formData);
      break;
    case 'AA-03':
      renderFormAA03(container, formData);
      break;
    case 'AA-04':
      renderFormAA04(container, formData);
      break;
    case 'AA-05':
      renderFormAA05(container, formData);
      break;
    case 'AA-06':
      renderFormAA06(container, formData);
      break;
    case 'AA-07':
      renderFormAA07(container, formData);
      break;
    case 'AA-08':
      renderFormAA08(container, formData);
      break;
    case 'AA-09':
      renderFormAA09(container, formData);
      break;
    case 'AA-10':
      renderFormAA10(container, formData);
      break;
    case 'AA-11':
      renderFormAA11(container, formData);
      break;
    case 'AA-12':
      renderFormAA12(container, formData);
      break;
    case 'AA-13':
      renderFormAA13(container, formData);
      break;
    case 'AA-14':
      renderFormAA14(container, formData);
      break;
    case 'AA-15':
      renderFormAA15(container, formData);
      break;
    case 'AA-16':
      renderFormAA16(container, formData);
      break;
    case 'AA-17':
      renderFormAA17(container, formData);
      break;
    case 'AA-18':
      renderFormAA18(container, formData);
      break;
    default:
      container.innerHTML = `<p>Form not implemented</p>`;
  }
}

// -------------------------------------------------------------
// SPECIFIC FORM RENDERERS
// -------------------------------------------------------------

// FORM AA-00: Department Academic Self-Assessment Cover Sheet (Particulars + Certification)
function renderFormAA00(container, data) {
  const p = data.particulars;
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin-bottom: 1.25rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-id-card"></i> Section A: Department Particulars
    </h3>
    <div class="particulars-grid">
      <div class="particulars-item">
        <label class="particulars-label">Academic Year</label>
        <input type="text" class="form-control" value="${escapeHtml(p.academicYear || '')}" oninput="currentDeptData.forms['AA-00'].particulars.academicYear=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Faculty</label>
        <input type="text" class="form-control" placeholder="e.g. Faculty of Engineering / Science" value="${escapeHtml(p.faculty || '')}" oninput="currentDeptData.forms['AA-00'].particulars.faculty=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Department / Centre</label>
        <input type="text" class="form-control" placeholder="Department name" value="${escapeHtml(p.departmentCentre || '')}" oninput="currentDeptData.forms['AA-00'].particulars.departmentCentre=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Head / Head (i/c) / Coordinator</label>
        <input type="text" class="form-control" placeholder="Name of Head" value="${escapeHtml(p.headName || '')}" oninput="currentDeptData.forms['AA-00'].particulars.headName=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Date of Submission</label>
        <input type="date" class="form-control" value="${escapeHtml(p.submissionDate || '')}" oninput="currentDeptData.forms['AA-00'].particulars.submissionDate=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Date of Audit</label>
        <input type="date" class="form-control" value="${escapeHtml(p.auditDate || '')}" oninput="currentDeptData.forms['AA-00'].particulars.auditDate=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Number of Programmes</label>
        <input type="number" class="form-control" placeholder="e.g. 3" value="${escapeHtml(p.numProgrammes || '')}" oninput="currentDeptData.forms['AA-00'].particulars.numProgrammes=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Total Students</label>
        <input type="number" class="form-control" placeholder="Total student count" value="${escapeHtml(p.totalStudents || '')}" oninput="currentDeptData.forms['AA-00'].particulars.totalStudents=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Sanctioned Faculty</label>
        <input type="number" class="form-control" placeholder="Sanctioned posts" value="${escapeHtml(p.sanctionedFaculty || '')}" oninput="currentDeptData.forms['AA-00'].particulars.sanctionedFaculty=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Faculty in Position</label>
        <input type="number" class="form-control" placeholder="Current faculty" value="${escapeHtml(p.facultyInPosition || '')}" oninput="currentDeptData.forms['AA-00'].particulars.facultyInPosition=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Number of Research Scholars</label>
        <input type="number" class="form-control" placeholder="Scholars count" value="${escapeHtml(p.researchScholars || '')}" oninput="currentDeptData.forms['AA-00'].particulars.researchScholars=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Department Data Coordinator</label>
        <input type="text" class="form-control" placeholder="Name / Designation" value="${escapeHtml(p.dataCoordinator || '')}" oninput="currentDeptData.forms['AA-00'].particulars.dataCoordinator=this.value; markDirty()">
      </div>
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-signature"></i> Section B: Certification
    </h3>
    <div style="background: #f1f5f9; padding: 0.85rem 1rem; border-radius: 6px; font-style: italic; font-size: 0.9rem; color: #334155; margin-bottom: 1rem;">
      "I certify that the information and evidence submitted for Academic Audit are complete and accurate to the best of my knowledge and are traceable to institutional records."
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 38%;">Name / Designation</th>
            <th style="width: 32%;">Digital Signature / Signee Name</th>
            <th style="width: 30%;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${data.certifications.map((cert, cIdx) => `
            <tr>
              <td>
                <strong>${escapeHtml(cert.role)}</strong>
                <input type="text" class="table-cell-input" placeholder="Full Name & Designation" value="${escapeHtml(cert.name || '')}" oninput="currentDeptData.forms['AA-00'].certifications[${cIdx}].name=this.value; markDirty()" style="margin-top: 4px;">
              </td>
              <td>
                <input type="text" class="table-cell-input" placeholder="Type signature / verified name" value="${escapeHtml(cert.signature || '')}" oninput="currentDeptData.forms['AA-00'].certifications[${cIdx}].signature=this.value; markDirty()">
              </td>
              <td>
                <input type="date" class="table-cell-input" value="${escapeHtml(cert.date || '')}" oninput="currentDeptData.forms['AA-00'].certifications[${cIdx}].date=this.value; markDirty()">
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-01: Department Academic Profile (Fixed Table - 17 items)
function renderFormAA01(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="margin-bottom: 1rem; color: #64748b; font-size: 0.9rem;">
      Fill in the 17 core institutional metrics comparing Current Year and Previous Year with Evidence references.
    </div>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th style="width: 35%;">Item</th>
            <th style="width: 20%;">Current Year</th>
            <th style="width: 20%;">Previous Year</th>
            <th>Remarks / Evidence ID</th>
          </tr>
        </thead>
        <tbody>
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.item)}</strong></td>
              <td>
                <input type="text" class="table-cell-input" placeholder="Enter value" value="${escapeHtml(row.currentYear || '')}" oninput="currentDeptData.forms['AA-01'].rows[${idx}].currentYear=this.value; markDirty()">
              </td>
              <td>
                <input type="text" class="table-cell-input" placeholder="Enter value" value="${escapeHtml(row.previousYear || '')}" oninput="currentDeptData.forms['AA-01'].rows[${idx}].previousYear=this.value; markDirty()">
              </td>
              <td>
                <input type="text" class="table-cell-input" placeholder="Evidence ID or comments" value="${escapeHtml(row.remarks || '')}" oninput="currentDeptData.forms['AA-01'].rows[${idx}].remarks=this.value; markDirty()">
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-02: Curriculum, Academic Flexibility & Enrichment (DYNAMIC TABLE with + button)
function renderFormAA02(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <div style="color: #64748b; font-size: 0.9rem;">
        Click <strong>+ Add Programme Row</strong> to add new academic programme curriculum details.
      </div>
      <button type="button" class="btn btn-primary btn-sm" onclick="addDynamicRow('AA-02')">
        <i class="fas fa-plus"></i> Add Programme Row
      </button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="min-width: 150px;">Programme</th>
            <th style="min-width: 100px;">Total Courses</th>
            <th style="min-width: 110px;">New/Revised</th>
            <th style="min-width: 80px;">%</th>
            <th style="min-width: 180px;">Value-added / Online / SWAM / NPTL etc.</th>
            <th style="min-width: 150px;">Field / Research Project</th>
            <th style="min-width: 120px;">Internship</th>
            <th style="min-width: 130px;">Feedback & ATR</th>
            <th style="min-width: 110px;">Evidence ID</th>
            <th style="min-width: 110px;">Auditor Level</th>
            <th style="width: 60px; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="dynamicTbody_AA-02">
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><input type="text" class="table-cell-input" placeholder="e.g. B.Tech CSE" value="${escapeHtml(row.programme || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].programme=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.totalCourses || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].totalCourses=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.newRevised || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].newRevised=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(row.pct || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].pct=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Details" value="${escapeHtml(row.valueAdded || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].valueAdded=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Project details" value="${escapeHtml(row.fieldProject || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].fieldProject=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Internships" value="${escapeHtml(row.internship || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].internship=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="ATR status" value="${escapeHtml(row.feedbackAtr || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].feedbackAtr=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-001" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Level 0-4" value="${escapeHtml(row.auditorLevel || '')}" oninput="currentDeptData.forms['AA-02'].rows[${idx}].auditorLevel=this.value; markDirty()"></td>
              <td style="text-align: center;">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDynamicRow('AA-02', ${idx})" title="Delete row">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-top: 1.5rem;">
      <label style="font-weight: 700; font-size: 0.9rem; color: #1e3a8a; display: block; margin-bottom: 0.5rem;">
        Auditor observations / academic relevance / stakeholder feedback:
      </label>
      <textarea class="form-control" rows="4" placeholder="Enter auditor observations and stakeholder notes..." oninput="currentDeptData.forms['AA-02'].observations=this.value; markDirty()">${escapeHtml(data.observations || '')}</textarea>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-03: Teaching-Learning & Faculty Quality (Fixed Table - 10 indicators)
function renderFormAA03(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 30%;">Indicator</th>
            <th style="width: 15%;">Raw Data / Value</th>
            <th style="width: 15%;">Benchmark / Target</th>
            <th style="width: 12%;">Level 0–4</th>
            <th style="width: 13%;">Evidence ID</th>
            <th>Auditor Remark</th>
          </tr>
        </thead>
        <tbody>
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.indicator)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="Value" value="${escapeHtml(row.rawData || '')}" oninput="currentDeptData.forms['AA-03'].rows[${idx}].rawData=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Target" value="${escapeHtml(row.benchmark || '')}" oninput="currentDeptData.forms['AA-03'].rows[${idx}].benchmark=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="0-4" value="${escapeHtml(row.level || '')}" oninput="currentDeptData.forms['AA-03'].rows[${idx}].level=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-03'].rows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Remarks" value="${escapeHtml(row.remark || '')}" oninput="currentDeptData.forms['AA-03'].rows[${idx}].remark=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-04: Faculty Academic Profile (DYNAMIC TABLE with + button)
function renderFormAA04(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <div style="color: #64748b; font-size: 0.9rem;">
        Add all faculty members of the department using the <strong>+ Add Faculty</strong> button.
      </div>
      <button type="button" class="btn btn-primary btn-sm" onclick="addDynamicRow('AA-04')">
        <i class="fas fa-plus"></i> Add Faculty
      </button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="min-width: 140px;">Faculty Name</th>
            <th style="min-width: 120px;">Designation</th>
            <th style="min-width: 130px;">Highest Qualification</th>
            <th style="min-width: 110px;">Experience (Total)</th>
            <th style="min-width: 140px;">Courses/Credits Offered</th>
            <th style="min-width: 90px;">FDP (Y/N)</th>
            <th style="min-width: 110px;">ICT/LMS</th>
            <th style="min-width: 110px;">Mentoring (Number)</th>
            <th style="min-width: 180px;">Research Output (Pub/Patent)</th>
            <th style="min-width: 100px;">Evidence ID</th>
            <th style="width: 60px; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="dynamicTbody_AA-04">
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><input type="text" class="table-cell-input" placeholder="Dr. / Prof. Name" value="${escapeHtml(row.faculty || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].faculty=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Professor / Asso." value="${escapeHtml(row.designation || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].designation=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Ph.D." value="${escapeHtml(row.qualification || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].qualification=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="e.g. 12 Yrs" value="${escapeHtml(row.experience || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].experience=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Courses/Credits" value="${escapeHtml(row.coursesCredits || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].coursesCredits=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Y/N" value="${escapeHtml(row.fdp || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].fdp=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Moodle / Canvas" value="${escapeHtml(row.ictLms || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].ictLms=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="e.g. 20" value="${escapeHtml(row.mentoring || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].mentoring=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Publications / Patents" value="${escapeHtml(row.researchOutput || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].researchOutput=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-04'].rows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td style="text-align: center;">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDynamicRow('AA-04', ${idx})" title="Delete faculty">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-05: Evaluation, Examination & Learning Outcomes (Dynamic Exam table + Fixed Outcome table)
function renderFormAA05(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3 style="font-size: 1.1rem; color: #1e3a8a; font-weight: 700;">
        <i class="fas fa-poll"></i> Examination Results & Grievances
      </h3>
      <button type="button" class="btn btn-primary btn-sm" onclick="addDynamicRow('AA-05-exam')">
        <i class="fas fa-plus"></i> Add Programme / Semester
      </button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="min-width: 140px;">Programme / Semester</th>
            <th style="min-width: 110px;">Exam End Date</th>
            <th style="min-width: 110px;">Result Date</th>
            <th style="min-width: 70px;">Days</th>
            <th style="min-width: 80px;">Appeared</th>
            <th style="min-width: 80px;">Passed</th>
            <th style="min-width: 80px;">Pass %</th>
            <th style="min-width: 110px;">Grievances</th>
            <th style="min-width: 90px;">Grievance %</th>
            <th style="min-width: 100px;">Evidence</th>
            <th style="width: 60px; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="dynamicTbody_AA-05-exam">
          ${data.examRows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><input type="text" class="table-cell-input" placeholder="B.Tech Sem 6" value="${escapeHtml(row.programmeSemester || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].programmeSemester=this.value; markDirty()"></td>
              <td><input type="date" class="table-cell-input" value="${escapeHtml(row.examEndDate || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].examEndDate=this.value; markDirty()"></td>
              <td><input type="date" class="table-cell-input" value="${escapeHtml(row.resultDate || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].resultDate=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.days || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].days=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.appeared || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].appeared=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.passed || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].passed=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(row.passPct || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].passPct=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.grievances || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].grievances=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(row.grievancePct || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].grievancePct=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidence || '')}" oninput="currentDeptData.forms['AA-05'].examRows[${idx}].evidence=this.value; markDirty()"></td>
              <td style="text-align: center;">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDynamicRow('AA-05-exam', ${idx})" title="Delete row">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 1.5rem;">
      <i class="fas fa-check-double"></i> Outcome Process Compliance
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 40%;">Outcome Process</th>
            <th style="width: 20%;">Yes / No / Value</th>
            <th style="width: 15%;">Evidence ID</th>
            <th>Auditor Observation</th>
          </tr>
        </thead>
        <tbody>
          ${data.processRows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.process)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="Yes / No / Value" value="${escapeHtml(row.status || '')}" oninput="currentDeptData.forms['AA-05'].processRows[${idx}].status=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-05'].processRows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Observations" value="${escapeHtml(row.observation || '')}" oninput="currentDeptData.forms['AA-05'].processRows[${idx}].observation=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-06: Research, Innovation, IPR & Ethics (Fixed Indicators + Fixed Ethics)
function renderFormAA06(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin-bottom: 1rem; font-weight: 700;">
      <i class="fas fa-microscope"></i> Research & Innovation Indicators
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 35%;">Indicator</th>
            <th style="width: 15%;">Current Year</th>
            <th style="width: 15%;">Rolling Value</th>
            <th style="width: 12%;">Benchmark</th>
            <th style="width: 10%;">Level</th>
            <th>Evidence ID</th>
          </tr>
        </thead>
        <tbody>
          ${data.indicatorRows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.indicator)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="Value" value="${escapeHtml(row.currentYear || '')}" oninput="currentDeptData.forms['AA-06'].indicatorRows[${idx}].currentYear=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Rolling" value="${escapeHtml(row.rollingValue || '')}" oninput="currentDeptData.forms['AA-06'].indicatorRows[${idx}].rollingValue=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Benchmark" value="${escapeHtml(row.benchmark || '')}" oninput="currentDeptData.forms['AA-06'].indicatorRows[${idx}].benchmark=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="0-4" value="${escapeHtml(row.level || '')}" oninput="currentDeptData.forms['AA-06'].indicatorRows[${idx}].level=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-06'].indicatorRows[${idx}].evidenceId=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 1.5rem;">
      <i class="fas fa-balance-scale"></i> Research Ethics Control
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 45%;">Research Ethics Control</th>
            <th style="width: 20%;">Status</th>
            <th style="width: 15%;">Evidence ID</th>
            <th>Auditor Comment</th>
          </tr>
        </thead>
        <tbody>
          ${data.ethicsRows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.process)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="Status" value="${escapeHtml(row.status || '')}" oninput="currentDeptData.forms['AA-06'].ethicsRows[${idx}].status=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-06'].ethicsRows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Comments" value="${escapeHtml(row.comment || '')}" oninput="currentDeptData.forms['AA-06'].ethicsRows[${idx}].comment=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-07: Individual Faculty Research Record (DYNAMIC TABLE with + button)
function renderFormAA07(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <div style="color: #64748b; font-size: 0.9rem;">
        Add faculty individual research output rows using <strong>+ Add Faculty Research Record</strong>.
      </div>
      <button type="button" class="btn btn-primary btn-sm" onclick="addDynamicRow('AA-07')">
        <i class="fas fa-plus"></i> Add Faculty Research Record
      </button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="min-width: 140px;">Faculty Name</th>
            <th style="min-width: 120px;">Scopus/WoS Papers</th>
            <th style="min-width: 120px;">Books/Chapters</th>
            <th style="min-width: 90px;">Citations</th>
            <th style="min-width: 130px;">Patents Filed/Awarded</th>
            <th style="min-width: 150px;">Projects Submitted/Sanctioned</th>
            <th style="min-width: 110px;">Funding ₹ lakh</th>
            <th style="min-width: 100px;">PhD Awards</th>
            <th style="min-width: 120px;">Consultancy ₹ lakh</th>
            <th style="min-width: 110px;">Evidence</th>
            <th style="width: 60px; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="dynamicTbody_AA-07">
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><input type="text" class="table-cell-input" placeholder="Faculty Name" value="${escapeHtml(row.faculty || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].faculty=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.scopusPapers || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].scopusPapers=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.booksChapters || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].booksChapters=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.citations || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].citations=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Patents count" value="${escapeHtml(row.patents || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].patents=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Projects count" value="${escapeHtml(row.projects || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].projects=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="₹ lakh" value="${escapeHtml(row.funding || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].funding=this.value; markDirty()"></td>
              <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(row.phdAwards || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].phdAwards=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="₹ lakh" value="${escapeHtml(row.consultancy || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].consultancy=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidence || '')}" oninput="currentDeptData.forms['AA-07'].rows[${idx}].evidence=this.value; markDirty()"></td>
              <td style="text-align: center;">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDynamicRow('AA-07', ${idx})" title="Delete row">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-08: Consultancy, Extension & Collaboration (DYNAMIC TABLE with + button)
function renderFormAA08(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <div>
        <div style="color: #64748b; font-size: 0.9rem;">
          Consultancy, MoUs, Extension activities, and collaborative agreements.
        </div>
        <div style="font-size: 0.8rem; color: #475569; margin-top: 2px;">
          Type: Consultancy / Corporate Training / Extension / MoU / Internship / Exchange / Collaborative Research / Other
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-sm" onclick="addDynamicRow('AA-08')">
        <i class="fas fa-plus"></i> Add Activity / Partner
      </button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="min-width: 160px;">Activity / Partner</th>
            <th style="min-width: 140px;">Type</th>
            <th style="min-width: 110px;">Period</th>
            <th style="min-width: 140px;">Students/Faculty Involved</th>
            <th style="min-width: 130px;">Revenue/Funding ₹ lakh</th>
            <th style="min-width: 150px;">Outcome / Impact</th>
            <th style="min-width: 90px;">Functional?</th>
            <th style="min-width: 100px;">Evidence ID</th>
            <th style="width: 60px; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="dynamicTbody_AA-08">
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><input type="text" class="table-cell-input" placeholder="Partner/Company Name" value="${escapeHtml(row.activityPartner || '')}" oninput="currentDeptData.forms['AA-08'].rows[${idx}].activityPartner=this.value; markDirty()"></td>
              <td>
                <select class="table-cell-input" onchange="currentDeptData.forms['AA-08'].rows[${idx}].type=this.value; markDirty()">
                  ${['Consultancy', 'Corporate Training', 'Extension', 'MoU', 'Internship', 'Exchange', 'Collaborative Research', 'Other'].map(opt => `
                    <option value="${opt}" ${row.type === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </td>
              <td><input type="text" class="table-cell-input" placeholder="e.g. 2024-2026" value="${escapeHtml(row.period || '')}" oninput="currentDeptData.forms['AA-08'].rows[${idx}].period=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Counts / Names" value="${escapeHtml(row.participants || '')}" oninput="currentDeptData.forms['AA-08'].rows[${idx}].participants=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="₹ lakh" value="${escapeHtml(row.revenue || '')}" oninput="currentDeptData.forms['AA-08'].rows[${idx}].revenue=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Outcome description" value="${escapeHtml(row.outcome || '')}" oninput="currentDeptData.forms['AA-08'].rows[${idx}].outcome=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Yes / No" value="${escapeHtml(row.functional || 'Yes')}" oninput="currentDeptData.forms['AA-08'].rows[${idx}].functional=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-08'].rows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td style="text-align: center;">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDynamicRow('AA-08', ${idx})" title="Delete row">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-09: Student Support, Progression & Achievement (Fixed indicators + Fixed activities)
function renderFormAA09(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin-bottom: 1rem; font-weight: 700;">
      <i class="fas fa-user-graduate"></i> Student Progression & Outcomes
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 32%;">Indicator</th>
            <th style="width: 11%;">Numerator</th>
            <th style="width: 11%;">Denominator</th>
            <th style="width: 12%;">Value / %</th>
            <th style="width: 11%;">Benchmark</th>
            <th style="width: 10%;">Level</th>
            <th>Evidence ID</th>
          </tr>
        </thead>
        <tbody>
          ${data.indicatorRows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.indicator)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="0" value="${escapeHtml(row.numerator || '')}" oninput="currentDeptData.forms['AA-09'].indicatorRows[${idx}].numerator=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="0" value="${escapeHtml(row.denominator || '')}" oninput="currentDeptData.forms['AA-09'].indicatorRows[${idx}].denominator=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(row.valuePct || '')}" oninput="currentDeptData.forms['AA-09'].indicatorRows[${idx}].valuePct=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Target" value="${escapeHtml(row.benchmark || '')}" oninput="currentDeptData.forms['AA-09'].indicatorRows[${idx}].benchmark=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="0-4" value="${escapeHtml(row.level || '')}" oninput="currentDeptData.forms['AA-09'].indicatorRows[${idx}].level=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-09'].indicatorRows[${idx}].evidenceId=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 1.5rem;">
      <i class="fas fa-hand-holding-heart"></i> Capability Enhancement & Life Skills Development
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 32%;">Support / Activity</th>
            <th style="width: 14%;">Conducted?</th>
            <th style="width: 15%;">Number / Reach</th>
            <th>Outcome</th>
            <th style="width: 14%;">Evidence ID</th>
          </tr>
        </thead>
        <tbody>
          ${data.activityRows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.activity)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="Yes / No" value="${escapeHtml(row.conducted || '')}" oninput="currentDeptData.forms['AA-09'].activityRows[${idx}].conducted=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Students count" value="${escapeHtml(row.numberReach || '')}" oninput="currentDeptData.forms['AA-09'].activityRows[${idx}].numberReach=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Outcome description" value="${escapeHtml(row.outcome || '')}" oninput="currentDeptData.forms['AA-09'].activityRows[${idx}].outcome=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-09'].activityRows[${idx}].evidenceId=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-10: Academic Infrastructure & Learning Resources (Fixed Table)
function renderFormAA10(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 28%;">Facility / Indicator</th>
            <th style="width: 14%;">Available / Value</th>
            <th style="width: 12%;">Functional</th>
            <th style="width: 12%;">Utilisation %</th>
            <th style="width: 14%;">Maintenance Status</th>
            <th style="width: 12%;">Gap</th>
            <th>Evidence ID</th>
          </tr>
        </thead>
        <tbody>
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.facility)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="Available" value="${escapeHtml(row.available || '')}" oninput="currentDeptData.forms['AA-10'].rows[${idx}].available=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Yes / No" value="${escapeHtml(row.functional || '')}" oninput="currentDeptData.forms['AA-10'].rows[${idx}].functional=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(row.utilisationPct || '')}" oninput="currentDeptData.forms['AA-10'].rows[${idx}].utilisationPct=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Good / AMC" value="${escapeHtml(row.maintenance || '')}" oninput="currentDeptData.forms['AA-10'].rows[${idx}].maintenance=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Deficit" value="${escapeHtml(row.gap || '')}" oninput="currentDeptData.forms['AA-10'].rows[${idx}].gap=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-10'].rows[${idx}].evidenceId=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-11: Department Academic Quality Management (Fixed Table)
function renderFormAA11(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 28%;">Quality Process</th>
            <th style="width: 16%;">Status</th>
            <th style="width: 16%;">Frequency / Date</th>
            <th style="width: 22%;">Outcome / Action</th>
            <th style="width: 12%;">Evidence ID</th>
            <th>Auditor Level</th>
          </tr>
        </thead>
        <tbody>
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${escapeHtml(row.process)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="Status" value="${escapeHtml(row.status || '')}" oninput="currentDeptData.forms['AA-11'].rows[${idx}].status=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Frequency / Date" value="${escapeHtml(row.frequencyDate || '')}" oninput="currentDeptData.forms['AA-11'].rows[${idx}].frequencyDate=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Action taken" value="${escapeHtml(row.outcomeAction || '')}" oninput="currentDeptData.forms['AA-11'].rows[${idx}].outcomeAction=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-11'].rows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="0-4" value="${escapeHtml(row.auditorLevel || '')}" oninput="currentDeptData.forms['AA-11'].rows[${idx}].auditorLevel=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-12: Evidence Register (DYNAMIC TABLE with + button)
function renderFormAA12(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <div style="color: #64748b; font-size: 0.9rem;">
        Register institutional evidence files, URLs, and folders. Grade: <strong>E1</strong> (High verification), <strong>E2</strong> (Moderate), <strong>E3</strong> (Self-attested).
      </div>
      <button type="button" class="btn btn-primary btn-sm" onclick="addDynamicRow('AA-12')">
        <i class="fas fa-plus"></i> Add Evidence Record
      </button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="min-width: 100px;">Evidence ID</th>
            <th style="min-width: 140px;">Domain / Metric</th>
            <th style="min-width: 180px;">Title / Description</th>
            <th style="min-width: 90px;">Period</th>
            <th style="min-width: 110px;">Owner</th>
            <th style="min-width: 180px;">Location / URL / File Ref</th>
            <th style="min-width: 110px;">Grade E1/E2/E3</th>
            <th style="min-width: 120px;">Verified By</th>
            <th style="width: 60px; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="dynamicTbody_AA-12">
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><input type="text" class="table-cell-input" placeholder="EV-001" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-12'].rows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="e.g. Curriculum" value="${escapeHtml(row.domainMetric || '')}" oninput="currentDeptData.forms['AA-12'].rows[${idx}].domainMetric=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Document title" value="${escapeHtml(row.titleDescription || '')}" oninput="currentDeptData.forms['AA-12'].rows[${idx}].titleDescription=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="2025" value="${escapeHtml(row.period || '')}" oninput="currentDeptData.forms['AA-12'].rows[${idx}].period=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="HOD / Faculty" value="${escapeHtml(row.owner || '')}" oninput="currentDeptData.forms['AA-12'].rows[${idx}].owner=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Drive / Cloud Link" value="${escapeHtml(row.locationUrl || '')}" oninput="currentDeptData.forms['AA-12'].rows[${idx}].locationUrl=this.value; markDirty()"></td>
              <td>
                <select class="table-cell-input" onchange="currentDeptData.forms['AA-12'].rows[${idx}].grade=this.value; markDirty()">
                  <option value="E1" ${row.grade === 'E1' ? 'selected' : ''}>E1 (Statutory/Direct)</option>
                  <option value="E2" ${row.grade === 'E2' ? 'selected' : ''}>E2 (Internal Verified)</option>
                  <option value="E3" ${row.grade === 'E3' ? 'selected' : ''}>E3 (Self-Attested)</option>
                </select>
              </td>
              <td><input type="text" class="table-cell-input" placeholder="Auditor Name" value="${escapeHtml(row.verifiedBy || '')}" oninput="currentDeptData.forms['AA-12'].rows[${idx}].verifiedBy=this.value; markDirty()"></td>
              <td style="text-align: center;">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDynamicRow('AA-12', ${idx})" title="Delete evidence">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-13: Benchmark Performance Card (Particulars + Key-Value Fields)
function renderFormAA13(container, data) {
  const p = data.particulars;
  const f = data.fields;
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin-bottom: 1.25rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-chart-line"></i> Benchmark Particulars
    </h3>
    <div class="particulars-grid">
      <div class="particulars-item">
        <label class="particulars-label">Academic Year</label>
        <input type="text" class="form-control" value="${escapeHtml(p.academicYear || '')}" oninput="currentDeptData.forms['AA-13'].particulars.academicYear=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Department</label>
        <input type="text" class="form-control" placeholder="Department" value="${escapeHtml(p.department || '')}" oninput="currentDeptData.forms['AA-13'].particulars.department=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Criterion / Domain</label>
        <input type="text" class="form-control" placeholder="Criterion" value="${escapeHtml(p.criterionDomain || '')}" oninput="currentDeptData.forms['AA-13'].particulars.criterionDomain=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Metric</label>
        <input type="text" class="form-control" placeholder="Metric Name" value="${escapeHtml(p.metric || '')}" oninput="currentDeptData.forms['AA-13'].particulars.metric=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Responsible Person</label>
        <input type="text" class="form-control" placeholder="Responsible faculty" value="${escapeHtml(p.responsiblePerson || '')}" oninput="currentDeptData.forms['AA-13'].particulars.responsiblePerson=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Data Owner</label>
        <input type="text" class="form-control" placeholder="Data owner" value="${escapeHtml(p.dataOwner || '')}" oninput="currentDeptData.forms['AA-13'].particulars.dataOwner=this.value; markDirty()">
      </div>
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-list-ol"></i> Metric & Gap Score Evaluation
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 45%;">Field</th>
            <th style="width: 55%;">Entry</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Metric definition</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Definition" value="${escapeHtml(f.metricDef || '')}" oninput="currentDeptData.forms['AA-13'].fields.metricDef=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>University Level-4 benchmark</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Level-4 target" value="${escapeHtml(f.benchmarkL4 || '')}" oninput="currentDeptData.forms['AA-13'].fields.benchmarkL4=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Previous-year value</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Value" value="${escapeHtml(f.prevYearVal || '')}" oninput="currentDeptData.forms['AA-13'].fields.prevYearVal=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Current-year contribution</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Contribution" value="${escapeHtml(f.currYearContrib || '')}" oninput="currentDeptData.forms['AA-13'].fields.currYearContrib=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Previous rolling value</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Value" value="${escapeHtml(f.prevRollingVal || '')}" oninput="currentDeptData.forms['AA-13'].fields.prevRollingVal=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Current rolling value</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Value" value="${escapeHtml(f.currRollingVal || '')}" oninput="currentDeptData.forms['AA-13'].fields.currRollingVal=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Benchmark level achieved (0–4)</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="e.g. Level 3" value="${escapeHtml(f.levelAchieved || '')}" oninput="currentDeptData.forms['AA-13'].fields.levelAchieved=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Metric weight</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Weight" value="${escapeHtml(f.metricWeight || '')}" oninput="currentDeptData.forms['AA-13'].fields.metricWeight=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Weighted score</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Weighted score" value="${escapeHtml(f.weightedScore || '')}" oninput="currentDeptData.forms['AA-13'].fields.weightedScore=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Benchmark Gap Index</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="BGI value" value="${escapeHtml(f.gapIndex || '')}" oninput="currentDeptData.forms['AA-13'].fields.gapIndex=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Priority Gap Score</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Score" value="${escapeHtml(f.priorityGapScore || '')}" oninput="currentDeptData.forms['AA-13'].fields.priorityGapScore=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Evidence ID(s)</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="e.g. EV-001, EV-004" value="${escapeHtml(f.evidenceIds || '')}" oninput="currentDeptData.forms['AA-13'].fields.evidenceIds=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Auditor observation</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Auditor observation text" value="${escapeHtml(f.auditorObservation || '')}" oninput="currentDeptData.forms['AA-13'].fields.auditorObservation=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Corrective action</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Action required" value="${escapeHtml(f.correctiveAction || '')}" oninput="currentDeptData.forms['AA-13'].fields.correctiveAction=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Responsible person</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Name" value="${escapeHtml(f.responsiblePersonField || '')}" oninput="currentDeptData.forms['AA-13'].fields.responsiblePersonField=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Target date</strong></td>
            <td><input type="date" class="table-cell-input" value="${escapeHtml(f.targetDate || '')}" oninput="currentDeptData.forms['AA-13'].fields.targetDate=this.value; markDirty()"></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-14: Auditor Observation / Finding (Particulars + Classification + Fields)
function renderFormAA14(container, data) {
  const p = data.particulars;
  const f = data.fields;
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin-bottom: 1.25rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-clipboard-check"></i> Audit Finding Particulars
    </h3>
    <div class="particulars-grid">
      <div class="particulars-item">
        <label class="particulars-label">Audit Date</label>
        <input type="date" class="form-control" value="${escapeHtml(p.auditDate || '')}" oninput="currentDeptData.forms['AA-14'].particulars.auditDate=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Department</label>
        <input type="text" class="form-control" placeholder="Department" value="${escapeHtml(p.department || '')}" oninput="currentDeptData.forms['AA-14'].particulars.department=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Observation No.</label>
        <input type="text" class="form-control" placeholder="e.g. OBS-01" value="${escapeHtml(p.obsNo || '')}" oninput="currentDeptData.forms['AA-14'].particulars.obsNo=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Domain</label>
        <input type="text" class="form-control" placeholder="Domain" value="${escapeHtml(p.domain || '')}" oninput="currentDeptData.forms['AA-14'].particulars.domain=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Metric / Process</label>
        <input type="text" class="form-control" placeholder="Metric / Process" value="${escapeHtml(p.metricProcess || '')}" oninput="currentDeptData.forms['AA-14'].particulars.metricProcess=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Auditor</label>
        <input type="text" class="form-control" placeholder="Auditor Name" value="${escapeHtml(p.auditor || '')}" oninput="currentDeptData.forms['AA-14'].particulars.auditor=this.value; markDirty()">
      </div>
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-tag"></i> Classification
    </h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;">
      ${[
        'C — Commendation',
        'OFI — Opportunity for Improvement',
        'NC-Minor — Minor Non-Conformity',
        'NC-Major — Major Non-Conformity',
        'CR — Critical Risk'
      ].map(opt => `
        <label style="display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; padding: 0.6rem 0.85rem; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer;">
          <input type="radio" name="aa14_class" value="${opt}" ${data.classification === opt ? 'checked' : ''} onchange="currentDeptData.forms['AA-14'].classification=this.value; markDirty()">
          <span style="font-size: 0.85rem; font-weight: 600;">${opt}</span>
        </label>
      `).join('')}
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-file-alt"></i> Finding Details & Root Cause Analysis
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35%;">Field</th>
            <th style="width: 65%;">Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Observation</strong></td>
            <td><textarea class="form-control" rows="2" oninput="currentDeptData.forms['AA-14'].fields.observation=this.value; markDirty()">${escapeHtml(f.observation || '')}</textarea></td>
          </tr>
          <tr>
            <td><strong>Evidence examined</strong></td>
            <td><textarea class="form-control" rows="2" oninput="currentDeptData.forms['AA-14'].fields.evidenceExamined=this.value; markDirty()">${escapeHtml(f.evidenceExamined || '')}</textarea></td>
          </tr>
          <tr>
            <td><strong>Expected benchmark / requirement</strong></td>
            <td><textarea class="form-control" rows="2" oninput="currentDeptData.forms['AA-14'].fields.expectedBenchmark=this.value; markDirty()">${escapeHtml(f.expectedBenchmark || '')}</textarea></td>
          </tr>
          <tr>
            <td><strong>Observed performance</strong></td>
            <td><textarea class="form-control" rows="2" oninput="currentDeptData.forms['AA-14'].fields.observedPerf=this.value; markDirty()">${escapeHtml(f.observedPerf || '')}</textarea></td>
          </tr>
          <tr>
            <td><strong>Gap / root cause</strong></td>
            <td><textarea class="form-control" rows="2" oninput="currentDeptData.forms['AA-14'].fields.gapRootCause=this.value; markDirty()">${escapeHtml(f.gapRootCause || '')}</textarea></td>
          </tr>
          <tr>
            <td><strong>Recommendation</strong></td>
            <td><textarea class="form-control" rows="2" oninput="currentDeptData.forms['AA-14'].fields.recommendation=this.value; markDirty()">${escapeHtml(f.recommendation || '')}</textarea></td>
          </tr>
          <tr>
            <td><strong>Responsible authority</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Authority" value="${escapeHtml(f.responsibleAuthority || '')}" oninput="currentDeptData.forms['AA-14'].fields.responsibleAuthority=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Target completion date</strong></td>
            <td><input type="date" class="table-cell-input" value="${escapeHtml(f.targetDate || '')}" oninput="currentDeptData.forms['AA-14'].fields.targetDate=this.value; markDirty()"></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-15: Corrective Action & Benchmark Improvement Plan (DYNAMIC TABLE with + button)
function renderFormAA15(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <div>
        <div style="color: #64748b; font-size: 0.9rem;">
          Track root causes, corrective actions, responsibility, milestones, and IQAC verification.
        </div>
        <div style="font-size: 0.8rem; color: #475569; margin-top: 2px;">
          Status: Not Started / Initiated / In Progress / Completed / Verified. An item is closed only after verification.
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-sm" onclick="addDynamicRow('AA-15')">
        <i class="fas fa-plus"></i> Add Action Plan Row
      </button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="min-width: 140px;">Finding / Metric</th>
            <th style="min-width: 110px;">Current Level</th>
            <th style="min-width: 110px;">Target Level</th>
            <th style="min-width: 140px;">Root Cause</th>
            <th style="min-width: 160px;">Action</th>
            <th style="min-width: 120px;">Responsibility</th>
            <th style="min-width: 110px;">Resources</th>
            <th style="min-width: 110px;">Deadline</th>
            <th style="min-width: 110px;">KPI</th>
            <th style="min-width: 130px;">Status</th>
            <th style="min-width: 130px;">IQAC Verification</th>
            <th style="width: 60px; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="dynamicTbody_AA-15">
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><input type="text" class="table-cell-input" placeholder="Metric Name" value="${escapeHtml(row.findingMetric || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].findingMetric=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Level 1" value="${escapeHtml(row.currentLevel || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].currentLevel=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Level 4" value="${escapeHtml(row.targetLevel || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].targetLevel=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Root cause" value="${escapeHtml(row.rootCause || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].rootCause=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Action proposed" value="${escapeHtml(row.action || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].action=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Responsible authority" value="${escapeHtml(row.responsibility || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].responsibility=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Budget / Lab" value="${escapeHtml(row.resources || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].resources=this.value; markDirty()"></td>
              <td><input type="date" class="table-cell-input" value="${escapeHtml(row.deadline || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].deadline=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="KPI indicator" value="${escapeHtml(row.kpi || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].kpi=this.value; markDirty()"></td>
              <td>
                <select class="table-cell-input" onchange="currentDeptData.forms['AA-15'].rows[${idx}].status=this.value; markDirty()">
                  ${['Not Started', 'Initiated', 'In Progress', 'Completed', 'Verified'].map(s => `
                    <option value="${s}" ${row.status === s ? 'selected' : ''}>${s}</option>
                  `).join('')}
                </select>
              </td>
              <td><input type="text" class="table-cell-input" placeholder="Pending / Verified" value="${escapeHtml(row.iqacVerification || '')}" oninput="currentDeptData.forms['AA-15'].rows[${idx}].iqacVerification=this.value; markDirty()"></td>
              <td style="text-align: center;">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDynamicRow('AA-15', ${idx})" title="Delete row">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-16: Previous Audit Compliance Report (DYNAMIC TABLE with + button)
function renderFormAA16(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <div style="color: #64748b; font-size: 0.9rem;">
        Follow-up audit compliance report on items agreed during the previous AAA cycle.
      </div>
      <button type="button" class="btn btn-primary btn-sm" onclick="addDynamicRow('AA-16')">
        <i class="fas fa-plus"></i> Add Compliance Row
      </button>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="min-width: 160px;">Previous Finding</th>
            <th style="min-width: 150px;">Action Agreed</th>
            <th style="min-width: 110px;">Due Date</th>
            <th style="min-width: 160px;">Action Taken</th>
            <th style="min-width: 110px;">Evidence ID</th>
            <th style="min-width: 120px;">Status</th>
            <th style="min-width: 140px;">Auditor Verification</th>
            <th style="min-width: 110px;">Closure Date</th>
            <th style="width: 60px; text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody id="dynamicTbody_AA-16">
          ${data.rows.map((row, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><input type="text" class="table-cell-input" placeholder="Finding description" value="${escapeHtml(row.previousFinding || '')}" oninput="currentDeptData.forms['AA-16'].rows[${idx}].previousFinding=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Agreed action" value="${escapeHtml(row.actionAgreed || '')}" oninput="currentDeptData.forms['AA-16'].rows[${idx}].actionAgreed=this.value; markDirty()"></td>
              <td><input type="date" class="table-cell-input" value="${escapeHtml(row.dueDate || '')}" oninput="currentDeptData.forms['AA-16'].rows[${idx}].dueDate=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Action taken details" value="${escapeHtml(row.actionTaken || '')}" oninput="currentDeptData.forms['AA-16'].rows[${idx}].actionTaken=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="EV-ID" value="${escapeHtml(row.evidenceId || '')}" oninput="currentDeptData.forms['AA-16'].rows[${idx}].evidenceId=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Completed / Pending" value="${escapeHtml(row.status || '')}" oninput="currentDeptData.forms['AA-16'].rows[${idx}].status=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Verified / Not Closed" value="${escapeHtml(row.auditorVerification || '')}" oninput="currentDeptData.forms['AA-16'].rows[${idx}].auditorVerification=this.value; markDirty()"></td>
              <td><input type="date" class="table-cell-input" value="${escapeHtml(row.closureDate || '')}" oninput="currentDeptData.forms['AA-16'].rows[${idx}].closureDate=this.value; markDirty()"></td>
              <td style="text-align: center;">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDynamicRow('AA-16', ${idx})" title="Delete row">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-17: Domain Score Sheet (Fixed Table with Weights)
function renderFormAA17(container, data) {
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 30%;">Domain</th>
            <th style="width: 10%;">Weight</th>
            <th style="width: 12%;">Applicable Weight</th>
            <th style="width: 12%;">Points Obtained</th>
            <th style="width: 12%;">Achievement %</th>
            <th style="width: 12%;">BGI / Priority</th>
            <th>Key Finding</th>
          </tr>
        </thead>
        <tbody>
          ${data.rows.map((row, idx) => `
            <tr style="${row.domain === 'TOTAL' ? 'font-weight: 700; background-color: #f1f5f9;' : ''}">
              <td style="text-align: center; color: #64748b;">${idx === data.rows.length - 1 ? 'Σ' : idx + 1}</td>
              <td><strong>${escapeHtml(row.domain)}</strong></td>
              <td><input type="text" class="table-cell-input" value="${escapeHtml(row.weight || '')}" oninput="currentDeptData.forms['AA-17'].rows[${idx}].weight=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="App. Weight" value="${escapeHtml(row.applicableWeight || '')}" oninput="currentDeptData.forms['AA-17'].rows[${idx}].applicableWeight=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Points" value="${escapeHtml(row.pointsObtained || '')}" oninput="currentDeptData.forms['AA-17'].rows[${idx}].pointsObtained=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(row.achievementPct || '')}" oninput="currentDeptData.forms['AA-17'].rows[${idx}].achievementPct=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="BGI" value="${escapeHtml(row.bgiPriority || '')}" oninput="currentDeptData.forms['AA-17'].rows[${idx}].bgiPriority=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Key finding summary" value="${escapeHtml(row.keyFinding || '')}" oninput="currentDeptData.forms['AA-17'].rows[${idx}].keyFinding=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// FORM AA-18: Final Department Academic Audit Scorecard (Particulars + Indicators + Strengths/Gaps + Signatures)
function renderFormAA18(container, data) {
  const p = data.particulars;
  const ind = data.indicators;
  const panel = document.createElement('div');
  panel.className = 'form-panel';

  panel.innerHTML = `
    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin-bottom: 1.25rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-file-contract"></i> Scorecard Particulars
    </h3>
    <div class="particulars-grid">
      <div class="particulars-item">
        <label class="particulars-label">Academic Year</label>
        <input type="text" class="form-control" value="${escapeHtml(p.academicYear || '')}" oninput="currentDeptData.forms['AA-18'].particulars.academicYear=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Department</label>
        <input type="text" class="form-control" placeholder="Department" value="${escapeHtml(p.department || '')}" oninput="currentDeptData.forms['AA-18'].particulars.department=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">School</label>
        <input type="text" class="form-control" placeholder="School of..." value="${escapeHtml(p.school || '')}" oninput="currentDeptData.forms['AA-18'].particulars.school=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Audit Date</label>
        <input type="date" class="form-control" value="${escapeHtml(p.auditDate || '')}" oninput="currentDeptData.forms['AA-18'].particulars.auditDate=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Audit Team Chair</label>
        <input type="text" class="form-control" placeholder="Chairperson Name" value="${escapeHtml(p.teamChair || '')}" oninput="currentDeptData.forms['AA-18'].particulars.teamChair=this.value; markDirty()">
      </div>
      <div class="particulars-item">
        <label class="particulars-label">Previous Audit Score</label>
        <input type="text" class="form-control" placeholder="e.g. 78.5%" value="${escapeHtml(p.prevScore || '')}" oninput="currentDeptData.forms['AA-18'].particulars.prevScore=this.value; markDirty()">
      </div>
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-trophy"></i> Performance Indicators
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50%;">Performance Indicator</th>
            <th style="width: 50%;">Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Academic Audit Score (%)</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="e.g. 84.5%" value="${escapeHtml(ind.auditScore || '')}" oninput="currentDeptData.forms['AA-18'].indicators.auditScore=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Classification</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="Excellent (A+) / Very Good (A)" value="${escapeHtml(ind.classification || '')}" oninput="currentDeptData.forms['AA-18'].indicators.classification=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Change from previous year</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="+4.2%" value="${escapeHtml(ind.changePrevYear || '')}" oninput="currentDeptData.forms['AA-18'].indicators.changePrevYear=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>% applicable metrics at Level 4</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(ind.pctL4 || '')}" oninput="currentDeptData.forms['AA-18'].indicators.pctL4=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>% applicable metrics at Level 3</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(ind.pctL3 || '')}" oninput="currentDeptData.forms['AA-18'].indicators.pctL3=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>% applicable metrics at Level 2</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(ind.pctL2 || '')}" oninput="currentDeptData.forms['AA-18'].indicators.pctL2=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>% applicable metrics at Level 1</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(ind.pctL1 || '')}" oninput="currentDeptData.forms['AA-18'].indicators.pctL1=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>% applicable metrics at Level 0</strong></td>
            <td><input type="text" class="table-cell-input" placeholder="%" value="${escapeHtml(ind.pctL0 || '')}" oninput="currentDeptData.forms['AA-18'].indicators.pctL0=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Number of Commendations</strong></td>
            <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(ind.commendationsCount || '')}" oninput="currentDeptData.forms['AA-18'].indicators.commendationsCount=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Number of OFIs</strong></td>
            <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(ind.ofisCount || '')}" oninput="currentDeptData.forms['AA-18'].indicators.ofisCount=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Minor NCs</strong></td>
            <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(ind.minorNCs || '')}" oninput="currentDeptData.forms['AA-18'].indicators.minorNCs=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Major NCs</strong></td>
            <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(ind.majorNCs || '')}" oninput="currentDeptData.forms['AA-18'].indicators.majorNCs=this.value; markDirty()"></td>
          </tr>
          <tr>
            <td><strong>Critical Risks</strong></td>
            <td><input type="number" class="table-cell-input" placeholder="0" value="${escapeHtml(ind.criticalRisks || '')}" oninput="currentDeptData.forms['AA-18'].indicators.criticalRisks=this.value; markDirty()"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-thumbs-up"></i> Top Strengths / Commendations
    </h3>
    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
      ${[0, 1, 2].map(i => `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-weight: 700; color: #1e3a8a; font-size: 0.95rem;">${i + 1}.</span>
          <input type="text" class="form-control" placeholder="Strength ${i + 1}..." value="${escapeHtml(data.strengths[i] || '')}" oninput="currentDeptData.forms['AA-18'].strengths[${i}]=this.value; markDirty()">
        </div>
      `).join('')}
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-exclamation-triangle"></i> Top Benchmark Gaps / Priorities
    </h3>
    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
      ${[0, 1, 2].map(i => `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-weight: 700; color: #dc2626; font-size: 0.95rem;">${i + 1}.</span>
          <input type="text" class="form-control" placeholder="Priority Gap ${i + 1}..." value="${escapeHtml(data.gaps[i] || '')}" oninput="currentDeptData.forms['AA-18'].gaps[${i}]=this.value; markDirty()">
        </div>
      `).join('')}
    </div>

    <h3 style="font-size: 1.1rem; color: #1e3a8a; margin: 2rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">
      <i class="fas fa-file-signature"></i> Audit Team Sign-Off
    </h3>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35%;">Role</th>
            <th style="width: 25%;">Name</th>
            <th style="width: 25%;">Signature</th>
            <th style="width: 15%;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${data.signatures.map((sig, sIdx) => `
            <tr>
              <td><strong>${escapeHtml(sig.role)}</strong></td>
              <td><input type="text" class="table-cell-input" placeholder="Full Name" value="${escapeHtml(sig.name || '')}" oninput="currentDeptData.forms['AA-18'].signatures[${sIdx}].name=this.value; markDirty()"></td>
              <td><input type="text" class="table-cell-input" placeholder="Signature" value="${escapeHtml(sig.signature || '')}" oninput="currentDeptData.forms['AA-18'].signatures[${sIdx}].signature=this.value; markDirty()"></td>
              <td><input type="date" class="table-cell-input" value="${escapeHtml(sig.date || '')}" oninput="currentDeptData.forms['AA-18'].signatures[${sIdx}].date=this.value; markDirty()"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(panel);
}

// -------------------------------------------------------------
// DYNAMIC TABLE HELPERS (+ Add Row / Delete Row)
// -------------------------------------------------------------

function addDynamicRow(tableKey) {
  if (!currentDeptData) return;

  switch (tableKey) {
    case 'AA-02':
      currentDeptData.forms['AA-02'].rows.push({
        programme: "", totalCourses: "", newRevised: "", pct: "", valueAdded: "", fieldProject: "", internship: "", feedbackAtr: "", evidenceId: "", auditorLevel: ""
      });
      break;

    case 'AA-04':
      currentDeptData.forms['AA-04'].rows.push({
        faculty: "", designation: "", qualification: "", experience: "", coursesCredits: "", fdp: "Y", ictLms: "", mentoring: "", researchOutput: "", evidenceId: ""
      });
      break;

    case 'AA-05-exam':
      currentDeptData.forms['AA-05'].examRows.push({
        programmeSemester: "", examEndDate: "", resultDate: "", days: "", appeared: "", passed: "", passPct: "", grievances: "", grievancePct: "", evidence: ""
      });
      break;

    case 'AA-07':
      currentDeptData.forms['AA-07'].rows.push({
        faculty: "", scopusPapers: "", booksChapters: "", citations: "", patents: "", projects: "", funding: "", phdAwards: "", consultancy: "", evidence: ""
      });
      break;

    case 'AA-08':
      currentDeptData.forms['AA-08'].rows.push({
        activityPartner: "", type: "MoU", period: "", participants: "", revenue: "", outcome: "", functional: "Yes", evidenceId: ""
      });
      break;

    case 'AA-12':
      currentDeptData.forms['AA-12'].rows.push({
        evidenceId: `EV-${String(currentDeptData.forms['AA-12'].rows.length + 1).padStart(3, '0')}`,
        domainMetric: "", titleDescription: "", period: "", owner: "", locationUrl: "", grade: "E1", verifiedBy: ""
      });
      break;

    case 'AA-15':
      currentDeptData.forms['AA-15'].rows.push({
        findingMetric: "", currentLevel: "Level 1", targetLevel: "Level 4", rootCause: "", action: "", responsibility: "", resources: "", deadline: "", kpi: "", status: "Initiated", iqacVerification: "Pending"
      });
      break;

    case 'AA-16':
      currentDeptData.forms['AA-16'].rows.push({
        previousFinding: "", actionAgreed: "", dueDate: "", actionTaken: "", evidenceId: "", status: "Initiated", auditorVerification: "Pending", closureDate: ""
      });
      break;
  }

  markDirty();
  renderCurrentForm();
  showToast('Row added. Fill in the columns.', 'success');
}

function deleteDynamicRow(tableKey, index) {
  if (!currentDeptData) return;
  if (!confirm('Are you sure you want to remove this row?')) return;

  switch (tableKey) {
    case 'AA-02':
      currentDeptData.forms['AA-02'].rows.splice(index, 1);
      break;
    case 'AA-04':
      currentDeptData.forms['AA-04'].rows.splice(index, 1);
      break;
    case 'AA-05-exam':
      currentDeptData.forms['AA-05'].examRows.splice(index, 1);
      break;
    case 'AA-07':
      currentDeptData.forms['AA-07'].rows.splice(index, 1);
      break;
    case 'AA-08':
      currentDeptData.forms['AA-08'].rows.splice(index, 1);
      break;
    case 'AA-12':
      currentDeptData.forms['AA-12'].rows.splice(index, 1);
      break;
    case 'AA-15':
      currentDeptData.forms['AA-15'].rows.splice(index, 1);
      break;
    case 'AA-16':
      currentDeptData.forms['AA-16'].rows.splice(index, 1);
      break;
  }

  markDirty();
  renderCurrentForm();
  showToast('Row removed.', 'success');
}

// Print Current Form
function printCurrentForm() {
  window.print();
}

// Utility: HTML escape
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

