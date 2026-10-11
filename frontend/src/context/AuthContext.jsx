import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, getMe } from '../lib/api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  const formatUser = (userData) => {
    if (!userData) return null
    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      full_name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
      role: userData.role,
      is_admin: userData.role === 'ADMIN',
      department: userData.faculty?.department || null,
      subjects: userData.faculty?.subjects || [],
      createdAt: userData.createdAt || null
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      getMe()
        .then(r => setUser(formatUser(r.data.user)))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const r = await apiLogin(email, password)
    localStorage.setItem('token', r.data.token)
    // Refetch me to get full faculty & academic associations
    try {
      const meRes = await getMe()
      setUser(formatUser(meRes.data.user))
    } catch {
      setUser(formatUser(r.data.user))
    }
    return r.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
