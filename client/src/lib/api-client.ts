import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL + '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      },
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage')!).state.token
        : null;
    }
    return null;
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    try {
      const response = await this.client.post('/auth/login', {
        email,
        password,
      });
      console.log('Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    additionalData?: any,
  ) {
    try {
      const response = await this.client.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
        ...additionalData,
      });
      console.log('Register response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Appointment endpoints
  async getAppointments() {
    const response = await this.client.get('/appointments/my-appointments');
    return response.data;
  }

  async bookAppointment(appointmentData: {
    therapistId: string;
    appointmentDate: string;
    duration: number;
    notes?: string;
  }) {
    const response = await this.client.post('/appointments', appointmentData);
    return response.data;
  }

  async cancelAppointment(appointmentId: string) {
    const response = await this.client.delete(`/appointments/${appointmentId}`);
    return response.data;
  }

  async updateAppointment(appointmentId: string, updates: any) {
    const response = await this.client.patch(
      `/appointments/${appointmentId}`,
      updates,
    );
    return response.data;
  }

  // Therapist endpoints
  async getTherapists() {
    const response = await this.client.get('/therapists');
    return response.data;
  }

  async getTherapist(therapistId: string) {
    const response = await this.client.get(`/therapists/${therapistId}`);
    return response.data;
  }

  // Chat endpoints
  async sendChatMessage(message: string) {
    const response = await this.client.post('/chat', { message });
    return {
      response: response.data.answer,
      type: response.data.action,
      data: response.data.rawData || response.data.actionResult,
    };
  }

  async getChatHistory(limit?: number) {
    const response = await this.client.get(
      `/chat/history${limit ? `?limit=${limit}` : ''}`,
    );
    return response.data;
  }

  // Patient endpoints
  async getPatients() {
    const response = await this.client.get('/patients');
    return response.data;
  }

  async getPatient(patientId: string) {
    const response = await this.client.get(`/patients/${patientId}`);
    return response.data;
  }

  async updatePatient(patientId: string, updates: any) {
    const response = await this.client.patch(`/patients/${patientId}`, updates);
    return response.data;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
