import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './localization/i18n'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { attachReactQueryFetchLogger } from './utils/fetchLogger'

export const queryClient = new QueryClient()

attachReactQueryFetchLogger(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    </QueryClientProvider>
</StrictMode>
)
