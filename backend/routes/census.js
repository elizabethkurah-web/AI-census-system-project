const express = require('express');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { censusRecordSchema, batchSubmissionSchema } = require('../schema/validation');

const router = express.Router();

// Submit a single census record
router.post('/submit', verifyToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = censusRecordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

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
      submission_type,
    } = value;

    // Insert census record
    const result = await pool.query(
      `INSERT INTO census_records 
       (enumerator_id, household_id, first_name, last_name, age, gender, phone, 
        gps_latitude, gps_longitude, location_address, submission_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user.userId,
        household_id,
        first_name,
        last_name,
        age,
        gender,
        phone,
        gps_latitude,
        gps_longitude,
        location_address,
        submission_type,
      ]
    );

    res.status(201).json({
      message: 'Census record submitted successfully',
      record: result.rows[0],
    });
  } catch (err) {
    console.error('Submission error:', err);
    if (err.code === '23505') {
      // Unique constraint violation - likely duplicate household_id
      return res.status(409).json({ error: 'Household ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch submission for offline sync
router.post('/batch', verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    // Validate input
    const { error, value } = batchSubmissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { records } = value;

    // Start transaction
    await client.query('BEGIN');

    const submittedRecords = [];

    // Insert each record
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
        submission_type,
      } = record;

      try {
        const result = await client.query(
          `INSERT INTO census_records 
           (enumerator_id, household_id, first_name, last_name, age, gender, phone, 
            gps_latitude, gps_longitude, location_address, submission_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id, household_id, sync_status`,
          [
            req.user.userId,
            household_id,
            first_name,
            last_name,
            age,
            gender,
            phone,
            gps_latitude,
            gps_longitude,
            location_address,
            submission_type,
          ]
        );
        submittedRecords.push(result.rows[0]);
      } catch (recordErr) {
        if (recordErr.code === '23505') {
          // Duplicate household_id - skip or flag
          submittedRecords.push({
            household_id: record.household_id,
            error: 'Duplicate household ID',
          });
        } else {
          throw recordErr;
        }
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: `Batch submission completed. ${submittedRecords.length} records processed.`,
      results: submittedRecords,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Batch submission error:', err);
    res.status(500).json({ error: 'Batch submission failed' });
  } finally {
    client.release();
  }
});

// Retrieve census records (with pagination and filtering)
router.get('/records', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, household_id, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM census_records WHERE 1=1';
    const params = [];

    if (household_id) {
      query += ` AND household_id ILIKE $${params.length + 1}`;
      params.push(`%${household_id}%`);
    }

    if (status) {
      query += ` AND sync_status = $${params.length + 1}`;
      params.push(status);
    }

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM census_records WHERE 1=1';
    const countParams = [];

    if (household_id) {
      countQuery += ` AND household_id ILIKE $${countParams.length + 1}`;
      countParams.push(`%${household_id}%`);
    }

    if (status) {
      countQuery += ` AND sync_status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Retrieve records error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
