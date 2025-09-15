import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Performance } from './pages/Performance'
import { DocumentViewer } from './pages/DocumentViewer'
import { Login } from './pages/Login'
import { APIKeys } from './pages/APIKeys'
import { Developers } from './pages/Developers'
import { Landing } from './pages/Landing'
import { useAuth } from './services/authService'

// Auth guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/developers" element={<Developers />} />
        <Route path="/login" element={<Login />} />

        {/* API Keys route - Protected */}
        <Route path="/api-keys" element={
          <ProtectedRoute>
            <APIKeys />
          </ProtectedRoute>
        } />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/document/:id" element={
          <ProtectedRoute>
            <DocumentViewer />
          </ProtectedRoute>
        } />
        <Route path="*" element={
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
              <p className="text-slate-600">Page Not Found</p>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App