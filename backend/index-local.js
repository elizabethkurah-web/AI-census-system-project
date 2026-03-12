const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'census_dev_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// Local JSON-backed storage for users and census records
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbFile = path.join(dataDir, 'db.json');

let db = { users: [], censusRecords: [] };
let userIdCounter = 1;
let recordIdCounter = 1;

// load existing data if present
if (fs.existsSync(dbFile)) {
  try {
    db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
    if (db.users.length > 0) {
      userIdCounter = Math.max(...db.users.map(u => u.id)) + 1;
    }
    if (db.censusRecords.length > 0) {
      recordIdCounter = Math.max(...db.censusRecords.map(r => r.id)) + 1;
    }
  } catch (err) {
    console.error('Error reading db file:', err);
  }
}

const users = new Map(db.users.map(u => [u.id, u]));
const censusRecords = db.censusRecords.slice();

function saveDb() {
  const toSave = {
    users: Array.from(users.values()),
    censusRecords,
  };
  fs.writeFileSync(dbFile, JSON.stringify(toSave, null, 2));
}

// Utility functions
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Census API running (local mode)', timestamp: new Date().toISOString() });
});

// ==================== AUTHENTICATION ROUTES ====================

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role = 'enumerator' } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user exists
    for (let user of users.values()) {
      if (user.email === email || user.username === username) {
        return res.status(409).json({ error: 'User already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = userIdCounter++;
    const newUser = {
      id: userId,
      username,
      email,
      password_hash: hashedPassword,
      role,
      status: 'active',
      created_at: new Date(),
    };

    users.set(userId, newUser);
    saveDb();

    // Generate token
    const token = generateToken(userId, role);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        username,
        email,
        role,
      },
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    let foundUser = null;
    for (let user of users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, foundUser.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(foundUser.id, foundUser.role);

    res.json({
      message: 'Login successful',
      user: {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
        role: foundUser.role,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== CENSUS DATA ROUTES ====================

// Submit single census record
app.post('/api/census/submit', verifyToken, (req, res) => {
  try {
    const {
      household_id,
      first_name,
      last_name,
      age,
      gender,
      phone,
      gps_latitude,
      gps_longitude,
      location_address,
      submission_type = 'online',
    } = req.body;

    // Validation
    if (!household_id || !first_name || !last_name) {
      return res.status(400).json({ error: 'Household ID, first name, and last name are required' });
    }

    // Check for duplicate household_id
    if (censusRecords.some(r => r.household_id === household_id)) {
      return res.status(409).json({ error: 'Household ID already exists' });
    }

    // Create record
    const recordId = recordIdCounter++;
    const newRecord = {
      id: recordId,
      enumerator_id: req.user.userId,
      household_id,
      first_name,
      last_name,
      age: age || null,
      gender: gender || null,
      phone: phone || null,
      gps_latitude: gps_latitude || null,
      gps_longitude: gps_longitude || null,
      location_address: location_address || null,
      submission_type,
      submission_timestamp: new Date(),
      sync_status: 'synced',
      is_duplicate: false,
      anomaly_flags: null,
      created_at: new Date(),
    };

    censusRecords.push(newRecord);
    saveDb();

    res.status(201).json({
      message: 'Census record submitted successfully',
      record: newRecord,
    });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Submission failed' });
  }
});

// Batch submission for offline sync
app.post('/api/census/batch', verifyToken, (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const submittedRecords = [];

    for (const record of records) {
      const {
        household_id,
        first_name,
        last_name,
        age,
        gender,
        phone,
        gps_latitude,
        gps_longitude,
        location_address,
        submission_type = 'offline',
      } = record;

      // Validate required fields
      if (!household_id || !first_name || !last_name) {
        submittedRecords.push({
          household_id: household_id || 'unknown',
          error: 'First name and last name are required',
        });
        continue;
      }

      // Check for duplicate household_id
      if (censusRecords.some(r => r.household_id === household_id)) {
        submittedRecords.push({
          household_id,
          error: 'Household ID already exists',
        });
        continue;
      }

      // Create record
      const recordId = recordIdCounter++;
      const newRecord = {
        id: recordId,
        enumerator_id: req.user.userId,
        household_id,
        first_name,
        last_name,
        age: age || null,
        gender: gender || null,
        phone: phone || null,
        gps_latitude: gps_latitude || null,
        gps_longitude: gps_longitude || null,
        location_address: location_address || null,
        submission_type,
        submission_timestamp: new Date(),
        sync_status: 'synced',
        is_duplicate: false,
        anomaly_flags: null,
        created_at: new Date(),
      };

      censusRecords.push(newRecord);
      saveDb();
      submittedRecords.push({
        id: recordId,
        household_id,
        sync_status: 'synced',
      });
    }

    res.status(201).json({
      message: `Batch submission completed. ${submittedRecords.filter(r => !r.error).length} records processed.`,
      results: submittedRecords,
    });
  } catch (err) {
    console.error('Batch submission error:', err);
    res.status(500).json({ error: 'Batch submission failed' });
  }
});

// Retrieve census records with pagination
app.get('/api/census/records', verifyToken, (req, res) => {
  try {
    const { page = 1, limit = 50, household_id, status } = req.query;
    const offset = (page - 1) * limit;

    // Filter records
    let filtered = censusRecords;

    if (household_id) {
      filtered = filtered.filter(r => r.household_id.includes(household_id));
    }

    if (status) {
      filtered = filtered.filter(r => r.sync_status === status);
    }

    // Paginate
    const total = filtered.length;
    const paginatedRecords = filtered.slice(offset, offset + parseInt(limit));

    res.json({
      data: paginatedRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Retrieve records error:', err);
    res.status(500).json({ error: 'Failed to retrieve records' });
  }
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`✓ Census API running on http://localhost:${PORT}`);
  console.log(`✓ Mode: Local Development (JSON file storage)`);
  console.log(`✓ Database file: ${dbFile}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST   /api/auth/register`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  POST   /api/census/submit`);
  console.log(`  POST   /api/census/batch`);
  console.log(`  GET    /api/census/records`);
});