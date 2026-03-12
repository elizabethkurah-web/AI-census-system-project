# Census Backend API

A Node.js/Express server with PostgreSQL for census data collection, validation, and geospatial analysis.

## Architecture

```
backend/
├─ config/
│  └─ database.js          # PostgreSQL connection pool
├─ db/
│  └─ schema.js            # Database initialization & schema
├─ middleware/
│  ├─ auth.js              # JWT authentication
│  └─ errorHandler.js      # Global error handler
├─ routes/
│  ├─ auth.js              # User registration/login
│  └─ census.js            # Census data submission & retrieval
├─ schema/
│  └─ validation.js        # Joi validation schemas
├─ index.js                # Main server entry
├─ .env.example            # Environment variables template
└─ package.json
```

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update:
```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=census_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
PORT=3000
NODE_ENV=development
```

### 3. Create PostgreSQL Database (optional)
If you prefer a full SQL database, install PostgreSQL and run:
```bash
psql -U postgres
CREATE DATABASE census_db;
\q
```
Set the environment variables accordingly and start with `npm run dev`.

### 4. Use Local JSON Database (no external DB required)
A lightweight local database is included; it stores data in `backend/data/db.json`.
Data persists between restarts but is simple JSON.
Use this for quick development without installing PostgreSQL:
```bash
npm run dev-local
```

### 5. Start Server
**Development (with hot reload and chosen storage):**
```bash
npm run dev          # uses PostgreSQL if configured, otherwise in-memory
npm run dev-local    # uses JSON file storage locally
```

**Production:**
```bash
npm start
```

Server will initialize tables automatically on startup (for SQL) or load JSON data.

---

## API Endpoints

### Authentication

**Register User**
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "enumerator1",
  "email": "enum@example.com",
  "password": "securepass123",
  "role": "enumerator"  // or "supervisor", "admin"
}

Response: 201
{
  "message": "User registered successfully",
  "user": { "id": 1, "username": "enumerator1", "role": "enumerator" },
  "token": "eyJhbGc..."
}
```

**Login User**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "enum@example.com",
  "password": "securepass123"
}

Response: 200
{
  "message": "Login successful",
  "user": { "id": 1, "username": "enumerator1", "role": "enumerator" },
  "token": "eyJhbGc..."
}
```

### Census Data

All census endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

**Submit Single Record**
```
POST /api/census/submit
Content-Type: application/json

{
  "household_id": "HH-001-2024",
  "first_name": "John",
  "last_name": "Doe",
  "age": 35,
  "gender": "M",
  "phone": "2348012345678",
  "gps_latitude": 6.5244,
  "gps_longitude": 3.3792,
  "location_address": "123 Main St, Lagos",
  "submission_type": "online"
}

Response: 201
{
  "message": "Census record submitted successfully",
  "record": { "id": 1, "household_id": "HH-001-2024", ... }
}
```

**Batch Submission (Offline Sync)**
```
POST /api/census/batch
Content-Type: application/json

{
  "records": [
    { "household_id": "HH-001", "first_name": "John", ... },
    { "household_id": "HH-002", "first_name": "Jane", ... }
  ]
}

Response: 201
{
  "message": "Batch submission completed. 2 records processed.",
  "results": [ { "id": 1, "household_id": "HH-001", ... }, ... ]
}
```

**Retrieve Records**
```
GET /api/census/records?page=1&limit=50&household_id=HH-001&status=synced

Response: 200
{
  "data": [ { "id": 1, "household_id": "HH-001", ... }, ... ],
  "pagination": { "page": 1, "limit": 50, "total": 100, "pages": 2 }
}
```

---

## Database Schema

### Users Table (RBAC)
```sql
id, username, email, password_hash, role, status, created_at, updated_at
```

Roles: `enumerator`, `supervisor`, `admin`

### Census Records Table
```sql
id, enumerator_id, household_id, first_name, last_name, age, gender, phone,
gps_latitude, gps_longitude, location_address, submission_type,
submission_timestamp, sync_status, is_duplicate, anomaly_flags, 
created_at, updated_at
```

### Audit Logs Table
```sql
id, user_id, action, entity_type, entity_id, changes, created_at
```

---

## Features Roadmap

- ✅ User authentication with JWT
- ✅ Role-based access control (RBAC)
- ✅ Single & batch census data submission
- ✅ Data validation with Joi schemas
- ⏳ **AI Anomaly Detection** - ML models to flag duplicates & outliers
- ⏳ **Geospatial Verification** - PostGIS integration for coverage mapping
- ⏳ **Sync Queue Management** - Handle offline submissions on reconnect
- ⏳ **Audit Logging** - Track all data modifications

---

## Development Notes

- JWT tokens expire after 7 days (configurable in `.env`)
- Transactions used for batch submissions to ensure data consistency
- Indexes created on `gps_latitude`, `gps_longitude`, `household_id` for fast queries
- Unique constraint on `household_id` prevents duplicate entries
- Error handling with try-catch and global middleware