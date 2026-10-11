const TOKEN_KEY = 'lms_token'
const USER_DATA_KEY = 'lms_user_data'

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export const removeToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

export const isAuthenticated = (): boolean => {
  return getToken() !== null
}

export const getUserData = (): any | null => {
  if (typeof window === 'undefined') return null
  const userData = localStorage.getItem(USER_DATA_KEY)
  return userData ? JSON.parse(userData) : null
}

export const setUserData = (userData: any): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))
}

export const removeUserData = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_DATA_KEY)
}

export const getUserRole = (): string | null => {
  const userData = getUserData()
  return userData?.role || null
}

export const logout = (): void => {
  removeToken()
  removeUserData()
}
