import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'error' ? 'var(--danger)' : t.type === 'warning' ? 'var(--warning)' : 'var(--success)',
            color: '#fff', padding: '10px 18px', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,.15)', fontSize: 14, maxWidth: 340,
            animation: 'slideIn .2s ease',
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity:0 } to { transform: none; opacity:1 } }`}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
