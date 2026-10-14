// Self-hosted variable font (weight + width axes; see DESIGN.md), then global styles, so component
// styles can override the shared primitives.
import '@fontsource-variable/archivo/wdth.css';
import './styles/tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
