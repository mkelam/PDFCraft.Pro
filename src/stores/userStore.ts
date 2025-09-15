import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  isVerified: boolean
}

interface UserState {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<User>) => void
  clearError: () => void
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          // TODO: Implement actual authentication
          console.log('Login attempt:', { email, password })

          // Mock successful login for development
          const mockUser: User = {
            id: '1',
            email,
            name: 'Test User',
            plan: 'pro',
            isVerified: true
          }

          set({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          })
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null
        })
      },

      // Update profile
      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } })
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null })
      }
    }),
    { name: 'user-store' }
  )
)