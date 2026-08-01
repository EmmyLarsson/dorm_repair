import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
// import './index.css'
import './modeator.css'
import Modeartor from './modeartor.jsx'
// import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
     {/* <App /> */}
      <Moderator />
    </BrowserRouter>
  </StrictMode>
)