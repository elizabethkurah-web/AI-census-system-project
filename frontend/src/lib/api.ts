const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface CensusData {
  household_id: string;
  first_name: string;
  last_name: string;
  age: string;
  gender: string;
  phone: string;
  location_address: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  submission_type: string;
  timestamp: string;
  employment_status?: string;
  education_level?: string;
  health_status?: string;
  has_disability?: boolean;
  disability_type?: string;
}

export const api = {
  login: async (data: LoginData) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  register: async (data: RegisterData) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  },

  submitCensus: async (data: CensusData, token: string) => {
    const res = await fetch(`${API_BASE}/api/census/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Submission failed');
    return res.json();
  },
};