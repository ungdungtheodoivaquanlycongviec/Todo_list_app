// Debug script to test API endpoints
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function testEndpoints() {
  console.log('Testing API endpoints...');
  console.log('API Base URL:', API_BASE);
  
  const endpoints = [
    '/tasks',
    '/users/me',
    '/auth/me'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      console.log(`${endpoint}:`, {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.log('Response body:', text.substring(0, 200));
      }
    } catch (error) {
      console.error(`${endpoint} error:`, error.message);
    }
  }
}

// Run if in browser
if (typeof window !== 'undefined') {
  testEndpoints();
}
