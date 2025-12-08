const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get token from localStorage (chỉ trên client)
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log('Making API request to:', url, 'with config:', config);
      
      let response: Response;
      try {
        response = await fetch(url, config);
      } catch (fetchError) {
        // Handle network errors (Failed to fetch)
        const errorMessage = fetchError instanceof Error 
          ? fetchError.message 
          : 'Network error occurred';
        
        console.error('Network error:', {
          url,
          error: errorMessage,
          message: 'Cannot connect to server. Please check if the backend server is running.'
        });
        
        // Provide more helpful error message
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          throw new Error('Cannot connect to server. Please check if the backend server is running and the API URL is correct.');
        }
        throw fetchError;
      }

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        console.error('API request failed:', { url, status: response.status, message: errorMessage });
        
        // Handle 401 Unauthorized - clear tokens and redirect to login
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            // Don't redirect here, let the component handle it
          }
        }
        
        throw new Error(errorMessage);
      }

      // Parse JSON only if response is ok
      let data;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // If response is not JSON, return empty object or handle accordingly
          const text = await response.text();
          console.warn('Response is not JSON:', { url, contentType, text });
          data = text ? JSON.parse(text) : {};
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Invalid response format from server');
      }

      console.log('API response received:', { url, status: response.status, data });

      return data;
    } catch (error) {
      // Improve error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = {
        url,
        error: errorMessage,
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
      };
      
      console.error('API request failed completely:', errorDetails);
      
      // Re-throw with improved error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(errorMessage);
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient();
export default apiClient;