import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App';

// Error handling wrapper
const WrappedApp = () => {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

const container = document.getElementById('root');
if (!container) {
  document.body.innerHTML = '<div style="color:white;padding:20px;">Error: Root element not found</div>';
} else {
  const root = createRoot(container);
  root.render(<WrappedApp />);
}
