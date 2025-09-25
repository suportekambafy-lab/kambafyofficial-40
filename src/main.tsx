import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload de rotas críticas
import "./utils/preloadCriticalRoutes.ts";

// Console de teste para área de membros
import "./utils/memberAreaTestConsole.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
