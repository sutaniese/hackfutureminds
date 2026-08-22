import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { TenantThemeProvider } from './enterprise/TenantThemeContext'
import './index.css'
import { StudentProvider } from './state/StudentContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantThemeProvider>
      <StudentProvider>
        <BrowserRouter basename="/hub">
          <App />
        </BrowserRouter>
      </StudentProvider>
    </TenantThemeProvider>
  </StrictMode>,
)
