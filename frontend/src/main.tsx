import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/context/AuthContext'
import { OrganizationProvider } from './features/organization/context/OrganizationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OrganizationProvider>
        <App />
      </OrganizationProvider>
    </AuthProvider>
  </StrictMode>,
)
