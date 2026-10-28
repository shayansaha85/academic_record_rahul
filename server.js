// server.js - Dependency-free Node.js Academic Audit Portal Server
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FORMS_METADATA, getDefaultFormData } = require('./public/js/forms-config.js');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DEPTS_DIR = path.join(DATA_DIR, 'departments');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Active sessions in memory: token -> { username, role, deptId, expiresAt }
const sessions = new Map();

// Generate credentials for 46 users
const USERS = {
  rahul: {
    username: 'rahul',
    password: 'rahul',
    role: 'admin',
    name: 'Academic Audit Admin (Rahul)',
    deptId: null
  }
};

for (let i = 1; i <= 45; i++) {
  const padNum = String(i).padStart(3, '0');
  const deptUser = `dep_${padNum}`;
  USERS[deptUser] = {
    username: deptUser,
    password: deptUser,
    role: 'department',
    name: `Department ${padNum}`,
    deptId: deptUser
  };
}

// Ensure data directories exist
function initDirectories() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DEPTS_DIR)) fs.mkdirSync(DEPTS_DIR, { recursive: true });

  // Initialize all 45 department files if they do not exist
  for (let i = 1; i <= 45; i++) {
    const padNum = String(i).padStart(3, '0');
    const deptId = `dep_${padNum}`;
    const filePath = path.join(DEPTS_DIR, `${deptId}.json`);

    if (!fs.existsSync(filePath)) {
      const initialRecord = {
        meta: {
          deptId: deptId,
          deptName: `Department ${padNum}`,
          status: 'Not Started', // Not Started | In Progress | Submitted | Audited
          lastUpdated: null,
          updatedBy: null,
          createdAt: new Date().toISOString()
        },
        forms: getDefaultFormData()
      };
      fs.writeFileSync(filePath, JSON.stringify(initialRecord, null, 2), 'utf8');
    }
  }
}

// Helper: Calculate forms filled count
function countFormsFilled(forms) {
  if (!forms) return 0;
  let count = 0;
  for (const formKey of Object.keys(forms)) {
    const data = forms[formKey];
    let hasContent = false;
    if (data.particulars) {
      for (const k in data.particulars) {
        if (data.particulars[k] && data.particulars[k] !== '2025-2026' && String(data.particulars[k]).trim() !== '') {
          hasContent = true;
          break;
        }
      }
    }
    if (!hasContent && data.rows && data.rows.length > 0) {
      for (const row of data.rows) {
        for (const k in row) {
          if (k !== 'item' && k !== 'indicator' && k !== 'process' && k !== 'facility' && k !== 'domain' && k !== 'weight' && row[k] && String(row[k]).trim() !== '') {
            hasContent = true;
            break;
          }
        }
        if (hasContent) break;
      }
    }
    if (!hasContent && data.indicatorRows && data.indicatorRows.length > 0) {
      for (const row of data.indicatorRows) {
        if ((row.currentYear && row.currentYear.trim() !== '') || (row.rawData && row.rawData.trim() !== '') || (row.numerator && row.numerator.trim() !== '')) {
          hasContent = true;
          break;
        }
      }
    }
    if (!hasContent && data.examRows && data.examRows.length > 0) {
      for (const row of data.examRows) {
        if (row.programmeSemester && row.programmeSemester.trim() !== '') {
          hasContent = true;
          break;
        }
      }
    }
    if (hasContent) count++;
  }
  return count;
}

// Authentication token helper
function authenticateRequest(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  const token = parts[1];
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// Read body helper
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Static File Mime Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Serve static file
function serveStatic(req, res, filePath) {
  let normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isDirectory()) {
    normalizedPath = path.join(normalizedPath, 'index.html');
  }

  fs.readFile(normalizedPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return fs.createReadStream(indexPath).pipe(res);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
      }
      res.writeHead(500);
      return res.end('Server Error');
    }
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// Main HTTP Server
const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  try {
    // API Routes
    if (pathname.startsWith('/api/')) {
      // 1. Login
      if (pathname === '/api/login' && req.method === 'POST') {
        const { username, password } = await parseJsonBody(req);
        if (!username || !password) {
          return sendJson(res, 400, { success: false, error: 'Username and password required' });
        }

        const user = USERS[username.trim().toLowerCase()];
        if (!user || user.password !== password.trim()) {
          return sendJson(res, 401, { success: false, error: 'Invalid username or password' });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const session = {
          username: user.username,
          role: user.role,
          name: user.name,
          deptId: user.deptId,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        };
        sessions.set(token, session);

        return sendJson(res, 200, {
          success: true,
          token,
          user: {
            username: user.username,
            role: user.role,
            name: user.name,
            deptId: user.deptId
          }
        });
      }

      // Auth middleware for all other /api routes
      const session = authenticateRequest(req);
      if (!session) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized. Please log in.' });
      }

      // 2. Current User Profile
      if (pathname === '/api/me' && req.method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          user: {
            username: session.username,
            role: session.role,
            name: session.name,
            deptId: session.deptId
          }
        });
      }

      // 3. Logout
      if (pathname === '/api/logout' && req.method === 'POST') {
        const authHeader = req.headers['authorization'];
        if (authHeader) {
          const token = authHeader.split(' ')[1];
          sessions.delete(token);
        }
        return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
      }

      // 4. Admin: List All 45 Departments with progress stats
      if (pathname === '/api/departments' && req.method === 'GET') {
        if (session.role !== 'admin') {
          return sendJson(res, 403, { success: false, error: 'Access denied: Admin only' });
        }

        const deptList = [];
        for (let i = 1; i <= 45; i++) {
          const padNum = String(i).padStart(3, '0');
          const deptId = `dep_${padNum}`;
          const filePath = path.join(DEPTS_DIR, `${deptId}.json`);

          if (fs.existsSync(filePath)) {
            try {
              const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              const formsFilled = countFormsFilled(fileContent.forms);
              deptList.push({
                deptId: deptId,
                deptName: fileContent.meta.deptName || `Department ${padNum}`,
                status: fileContent.meta.status || 'Not Started',
                lastUpdated: fileContent.meta.lastUpdated,
                updatedBy: fileContent.meta.updatedBy,
                formsFilledCount: formsFilled,
                totalForms: 19
              });
            } catch (e) {
              deptList.push({
                deptId: deptId,
                deptName: `Department ${padNum}`,
                status: 'Error',
                formsFilledCount: 0,
                totalForms: 19
              });
            }
          }
        }

        return sendJson(res, 200, { success: true, departments: deptList });
      }

      // 5. Get Department Data (Forms + Meta)
      const deptMatch = pathname.match(/^\/api\/departments\/([a-zA-Z0-9_-]+)$/);
      if (deptMatch && req.method === 'GET') {
        const targetDeptId = deptMatch[1];

        // Check authorization: Admin can view any, department can only view its own
        if (session.role !== 'admin' && session.deptId !== targetDeptId) {
          return sendJson(res, 403, { success: false, error: 'Unauthorized to view this department data' });
        }

        const filePath = path.join(DEPTS_DIR, `${targetDeptId}.json`);
        if (!fs.existsSync(filePath)) {
          return sendJson(res, 404, { success: false, error: 'Department data not found' });
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        const deptData = JSON.parse(raw);
        return sendJson(res, 200, { success: true, data: deptData });
      }

      // 6. Save/Update Department Forms
      if (deptMatch && req.method === 'POST') {
        const targetDeptId = deptMatch[1];

        // Check authorization: Admin can edit any, department can edit its own
        if (session.role !== 'admin' && session.deptId !== targetDeptId) {
          return sendJson(res, 403, { success: false, error: 'Unauthorized to edit this department data' });
        }

        const body = await parseJsonBody(req);
        const filePath = path.join(DEPTS_DIR, `${targetDeptId}.json`);

        let existing = {
          meta: { deptId: targetDeptId, deptName: `Department ${targetDeptId.replace('dep_', '')}` },
          forms: getDefaultFormData()
        };

        if (fs.existsSync(filePath)) {
          try {
            existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } catch (e) {}
        }

        // Merge incoming forms
        if (body.forms) {
          existing.forms = { ...existing.forms, ...body.forms };
        }

        // Update status if provided or adjust automatically
        if (body.status) {
          existing.meta.status = body.status;
        } else if (existing.meta.status === 'Not Started') {
          existing.meta.status = 'In Progress';
        }

        if (body.deptName) {
          existing.meta.deptName = body.deptName;
        }

        existing.meta.lastUpdated = new Date().toISOString();
        existing.meta.updatedBy = session.username;

        // Atomic write
        const tempPath = `${filePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(existing, null, 2), 'utf8');
        fs.renameSync(tempPath, filePath);

        return sendJson(res, 200, {
          success: true,
          message: 'Data saved successfully',
          meta: existing.meta
        });
      }

      // 7. Reset Department Data (Admin only)
      const resetMatch = pathname.match(/^\/api\/departments\/([a-zA-Z0-9_-]+)\/reset$/);
      if (resetMatch && req.method === 'POST') {
        if (session.role !== 'admin') {
          return sendJson(res, 403, { success: false, error: 'Admin only' });
        }
        const targetDeptId = resetMatch[1];
        const filePath = path.join(DEPTS_DIR, `${targetDeptId}.json`);

        const resetData = {
          meta: {
            deptId: targetDeptId,
            deptName: `Department ${targetDeptId.replace('dep_', '')}`,
            status: 'Not Started',
            lastUpdated: new Date().toISOString(),
            updatedBy: `Admin Reset (${session.username})`,
            createdAt: new Date().toISOString()
          },
          forms: getDefaultFormData()
        };

        fs.writeFileSync(filePath, JSON.stringify(resetData, null, 2), 'utf8');
        return sendJson(res, 200, { success: true, message: 'Department reset to default template', data: resetData });
      }

      return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
    }

    // Static files delivery
    let safePath = path.join(PUBLIC_DIR, pathname);
    serveStatic(req, res, safePath);

  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { success: false, error: 'Internal Server Error', message: err.message });
  }
});

// Initialize directories and start server
initDirectories();
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Academic Audit Portal Server running at: http://localhost:${PORT}`);
  console.log(`Admin account: rahul / rahul`);
  console.log(`Department accounts: dep_001 / dep_001 ... dep_045 / dep_045`);
  console.log(`Total 46 user logins initialized`);
  console.log(`====================================================`);
});

