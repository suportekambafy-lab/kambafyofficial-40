import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload de rotas críticas
import "./utils/preloadCriticalRoutes.ts";

// Nova estrutura de membros
import '@/utils/membersLinks';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
