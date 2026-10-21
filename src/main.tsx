import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { BASE_PATH } from './lib/base'
import './styles/app.css'
import AppRoutes from './AppRoutes'
import { AuthProvider } from './store/auth'
import { DataProvider } from './store/data'
import { ToastProvider } from './store/toast'

/** Entry point, loaded by index.html. */
createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <BrowserRouter basename={BASE_PATH || undefined}>
      <DataProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
