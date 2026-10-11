const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    message: string
    details?: any
  }
}

interface ApiError {
  message: string
  statusCode?: number
  details?: any
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lms_token') : null
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw {
        message: errorData.error?.message || errorData.message || 'Request failed',
        statusCode: response.status,
        details: errorData.error?.details,
      } as ApiError
    }

    const data = await response.json()
    return data.data || data
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    return this.handleResponse<T>(response)
  }

  async upload<T>(endpoint: string, file: File): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lms_token') : null
    const formData = new FormData()
    formData.append('file', file)

    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    })

    return this.handleResponse<T>(response)
  }
}

export const api = new ApiClient(API_URL)

// Auth APIs
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  register: (data: { fullName: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),

  googleAuth: (data: { email: string; name: string; googleId: string }) =>
    api.post('/api/auth/google', data),
}

// Loan Application APIs
export const loanApi = {
  submitApplication: (data: any) =>
    api.post('/api/loan-applications', data),

  getApplications: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/api/loan-applications', params),

  getApplicationById: (id: string) =>
    api.get(`/api/loan-applications/${id}`),

  getStatistics: () =>
    api.get('/api/loan-applications/statistics'),
}

// Document APIs
export const documentApi = {
  uploadSalarySlip: (file: File) =>
    api.upload('/api/documents/salary-slip', file),
}

// Sales APIs
export const salesApi = {
  getBorrowers: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) =>
    api.get('/api/sales/borrowers', params),

  getBorrowerDetails: (borrowerId: string) =>
    api.get(`/api/sales/borrowers/${borrowerId}`),

  getStatistics: () =>
    api.get('/api/sales/statistics'),
}

// Sanction APIs
export const sanctionApi = {
  getApplications: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string; mySanctions?: boolean }) =>
    api.get('/api/sanction/applications', params),

  getStatistics: () =>
    api.get('/api/sanction/statistics'),

  getRecentActivity: () =>
    api.get('/api/sanction/recent-activity'),

  approveApplication: (id: string, approvalReason?: string) =>
    api.post(`/api/sanction/applications/${id}/approve`, approvalReason ? { approvalReason } : {}),

  rejectApplication: (id: string, rejectionReason: string) =>
    api.post(`/api/sanction/applications/${id}/reject`, { rejectionReason }),
}

// Disbursement APIs
export const disbursementApi = {
  getSanctionedLoans: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/api/disbursement/loans', params),

  disburseLoan: (id: string) =>
    api.post(`/api/disbursement/loans/${id}/disburse`),

  getStatistics: () =>
    api.get('/api/disbursement/statistics'),

  getRecentActivity: () =>
    api.get('/api/disbursement/recent-activity'),
}

// Collection APIs
export const collectionApi = {
  getActiveLoans: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) =>
    api.get('/api/collection/loans', params),

  getLoanDetails: (loanId: string) =>
    api.get(`/api/collection/loans/${loanId}`),

  recordPayment: (loanId: string, data: { utr: string; amount: number; paymentDate: string }) =>
    api.post(`/api/collection/loans/${loanId}/payments`, data),

  getPaymentHistory: (loanId: string) =>
    api.get(`/api/collection/loans/${loanId}/payments`),

  getStatistics: () =>
    api.get('/api/collection/statistics'),
}

// Eligibility APIs
export const eligibilityApi = {
  checkEligibility: (data: any) =>
    api.post('/api/eligibility/check', data),
}
