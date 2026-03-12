import React, { useState, useEffect } from 'react';

function CensusForm({ token, isOnline }) {
  const [formData, setFormData] = useState({
    household_id: '',
    first_name: '',
    last_name: '',
    age: '',
    gender: '',
    phone: '',
    location_address: '',
    gps_latitude: null,
    gps_longitude: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState(
    JSON.parse(localStorage.getItem('pendingSubmissions') || '[]')
  );
  const [currentLocation, setCurrentLocation] = useState(null);

  // Get GPS location
  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setFormData(prev => ({
          ...prev,
          gps_latitude: latitude,
          gps_longitude: longitude,
        }));
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get location. Please enter address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Generate unique household ID
  const generateHouseholdId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `HH-${timestamp}-${random}`;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submissionData = {
      ...formData,
      submission_type: isOnline ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
    };

    if (isOnline) {
      try {
        const response = await fetch('http://localhost:3001/api/census/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(submissionData),
        });

        const data = await response.json();
        if (response.ok) {
          alert('Census record submitted successfully!');
          resetForm();
        } else {
          alert('Submission failed: ' + data.error);
        }
      } catch (error) {
        alert('Network error. Storing for offline sync.');
        storeForOfflineSync(submissionData);
      }
    } else {
      storeForOfflineSync(submissionData);
      alert('Stored for offline sync. Will submit when online.');
    }

    setIsSubmitting(false);
  };

  // Store submission for offline sync
  const storeForOfflineSync = (data) => {
    const updatedPending = [...pendingSubmissions, data];
    setPendingSubmissions(updatedPending);
    localStorage.setItem('pendingSubmissions', JSON.stringify(updatedPending));
  };

  // Sync pending submissions when back online
  const syncPendingSubmissions = async () => {
    if (!isOnline || pendingSubmissions.length === 0) return;

    const successfulSyncs = [];
    for (const submission of pendingSubmissions) {
      try {
        const response = await fetch('http://localhost:3001/api/census/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(submission),
        });

        if (response.ok) {
          successfulSyncs.push(submission);
        }
      } catch (error) {
        console.error('Sync failed for submission:', submission);
      }
    }

    if (successfulSyncs.length > 0) {
      const remaining = pendingSubmissions.filter(
        sub => !successfulSyncs.includes(sub)
      );
      setPendingSubmissions(remaining);
      localStorage.setItem('pendingSubmissions', JSON.stringify(remaining));
      alert(`Synced ${successfulSyncs.length} pending submissions!`);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      household_id: '',
      first_name: '',
      last_name: '',
      age: '',
      gender: '',
      phone: '',
      location_address: '',
      gps_latitude: null,
      gps_longitude: null,
    });
    setCurrentLocation(null);
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && token) {
      syncPendingSubmissions();
    }

    // Listen for sync events from service worker
    const handleSyncEvent = () => {
      if (isOnline && token) {
        syncPendingSubmissions();
      }
    };

    window.addEventListener('syncPendingSubmissions', handleSyncEvent);

    return () => {
      window.removeEventListener('syncPendingSubmissions', handleSyncEvent);
    };
  }, [isOnline, token]);

  return (
    <div className="census-form-container">
      <div className="form-header">
        <h2>Household Census Data Collection</h2>
        {pendingSubmissions.length > 0 && (
          <div className="pending-notice">
            📱 {pendingSubmissions.length} submissions pending sync
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="census-form">
        <div className="form-section">
          <h3>Household Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Household ID:</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={formData.household_id}
                  onChange={(e) => setFormData({...formData, household_id: e.target.value})}
                  placeholder="Auto-generate or enter manually"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, household_id: generateHouseholdId()})}
                  className="generate-btn"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Personal Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label>First Name:</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name:</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Age:</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                min="0"
                max="150"
                required
              />
            </div>

            <div className="form-group">
              <label>Gender:</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                required
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number:</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+234xxxxxxxxxx"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Location Information</h3>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Address:</label>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({...formData, location_address: e.target.value})}
                placeholder="Street address, city, state"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GPS Location:</label>
              <button
                type="button"
                onClick={getLocation}
                className="gps-btn"
                disabled={!navigator.geolocation}
              >
                📍 Get Current Location
              </button>
            </div>

            {currentLocation && (
              <div className="location-display">
                <small>
                  Lat: {currentLocation.latitude.toFixed(6)},<br />
                  Lng: {currentLocation.longitude.toFixed(6)}
                </small>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-btn"
          >
            {isSubmitting ? 'Submitting...' : isOnline ? 'Submit Online' : 'Store for Later'}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="reset-btn"
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
}

export default CensusForm;