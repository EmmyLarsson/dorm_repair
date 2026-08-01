import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
// import './index.css'
import './moderator.css'
import Moderator from './Moderator.jsx'
// import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
     {/* <App /> */}
      <Moderator />
    </BrowserRouter>
  </StrictMode>
)