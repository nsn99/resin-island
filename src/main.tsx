import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
// GPU resources are explicitly owned and disposed by their hooks.
// No external models or image textures are loaded; Environment is the sole HDR asset.
createRoot(document.getElementById('root')!).render(<App/>);
