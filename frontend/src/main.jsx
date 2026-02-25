import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './responsive-fixes.css'
import { AuthProvider } from './context/AuthContext.jsx'

import { TutorialProvider } from './contexts/TutorialContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <TutorialProvider>
        <App />
      </TutorialProvider>
    </AuthProvider>
  </React.StrictMode>,
)
