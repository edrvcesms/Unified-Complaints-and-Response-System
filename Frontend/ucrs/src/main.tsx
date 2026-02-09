import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const query_client = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={query_client}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
