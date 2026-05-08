import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import ChallengePage from './pages/ChallengePage'
import AdminPage from './pages/AdminPage'
import RuletaPage from './pages/RuletaPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen paper-bg flex items-center justify-center">
      <p className="font-mono text-ink-300 text-sm">Cargando...</p>
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/challenge/:id" element={<ProtectedRoute><ChallengePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/ruleta" element={<ProtectedRoute><RuletaPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
