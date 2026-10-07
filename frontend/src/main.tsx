// Paling awal: harus berlaku sebelum schema zod mana pun dibuat.
import './lib/zod-config'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />);
