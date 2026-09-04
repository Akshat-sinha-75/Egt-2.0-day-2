// frontend/src/utils/api.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function parseResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Server returned an invalid response (Status ${response.status}). Is the backend running?`);
  }
}

/**
 * Login to get JWT token.
 * @param {string} teamId
 * @param {string} pass
 * @returns {Promise<{token: string, teamId: string, message: string}>}
 */
export async function loginApi(teamId, pass) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, pass }),
  });
  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }
  return data;
}

/**
 * Fetch questions from the backend.
 * @param {string} token
 * @returns {Promise<{roundStatus: string, timeRemaining: number, questions: Array, q11: string}>}
 */
export async function fetchQuestionsApi(token) {
  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch questions');
  }
  return data;
}

/**
 * Submit final code.
 * @param {string} token
 * @param {string} code
 * @returns {Promise<{result: string, rank: number, message: string}>}
 */
export async function submitCodeApi(token, code) {
  const response = await fetch(`${API_BASE_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ code })
  });
  const data = await parseResponse(response);
  // Backend returns 403 on time expired, or 400 on incorrect code.
  if (!response.ok) {
     if (data.result === 'INCORRECT' || data.result === 'TIME_EXPIRED' || data.result === 'ERROR') {
         return data; 
     }
    throw new Error(data.error || data.message || 'Submission failed');
  }
  return data;
}
