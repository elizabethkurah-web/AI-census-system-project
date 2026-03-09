# Census API Testing Guide

Quick reference for testing the Census Backend API using cURL or Postman.

## Prerequisites
- PostgreSQL running locally
- Backend server running on http://localhost:3000
- Create `.env` file with database credentials

## Test Flow

### 1. Register an Enumerator
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "enum_john",
    "email": "john@census.com",
    "password": "SecurePass123",
    "role": "enumerator"
  }'
```

**Save the token from response**

### 2. Login (Alternative)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@census.com",
    "password": "SecurePass123"
  }'
```

### 3. Submit Single Census Record
Replace `YOUR_TOKEN` with the token from registration/login:

```bash
curl -X POST http://localhost:3000/api/census/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "household_id": "HH-LAG-001-2024",
    "first_name": "John",
    "last_name": "Okafor",
    "age": 45,
    "gender": "M",
    "phone": "2348012345678",
    "gps_latitude": 6.5244,
    "gps_longitude": 3.3792,
    "location_address": "12 Lekki Close, Lagos",
    "submission_type": "online"
  }'
```

### 4. Submit Batch Records (Offline Sync)
```bash
curl -X POST http://localhost:3000/api/census/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "records": [
      {
        "household_id": "HH-LAG-002-2024",
        "first_name": "Jane",
        "last_name": "Adeyemi",
        "age": 38,
        "gender": "F",
        "phone": "2348012345679",
        "gps_latitude": 6.5245,
        "gps_longitude": 3.3793,
        "location_address": "14 Lekki Close, Lagos",
        "submission_type": "offline"
      },
      {
        "household_id": "HH-LAG-003-2024",
        "first_name": "Ahmed",
        "last_name": "Hassan",
        "age": 52,
        "gender": "M",
        "phone": "2348012345680",
        "gps_latitude": 6.5246,
        "gps_longitude": 3.3794,
        "location_address": "16 Lekki Close, Lagos",
        "submission_type": "offline"
      }
    ]
  }'
```

### 5. Retrieve All Records
```bash
curl -X GET http://localhost:3000/api/census/records \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Retrieve with Filters & Pagination
```bash
curl -X GET "http://localhost:3000/api/census/records?page=1&limit=10&household_id=HH-LAG" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Postman Collection

Import this into Postman for easier testing:

### Environment Variables
```json
{
  "base_url": "http://localhost:3000",
  "token": ""
}
```

### Register Request
```
POST {{base_url}}/api/auth/register
Body (raw JSON):
{
  "username": "enum_test",
  "email": "test@census.com",
  "password": "TestPass123",
  "role": "enumerator"
}
```

After registration, copy the token and set it in Postman as:
```
Headers: Authorization: Bearer {token}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (validation error) |
| 401  | Unauthorized (missing/invalid token) |
| 409  | Conflict (e.g., duplicate household_id) |
| 500  | Internal Server Error |

---

## Next Steps

After confirming API works:
1. Connect the frontend PWA to these endpoints
2. Implement offline sync queue in frontend
3. Add AI/ML model endpoints for anomaly detection
4. Implement geospatial verification with PostGIS