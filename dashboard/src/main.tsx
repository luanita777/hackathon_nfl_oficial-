import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { FiltrosProvider } from './FiltrosContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FiltrosProvider>
      <App />
    </FiltrosProvider>
  </React.StrictMode>,
)
