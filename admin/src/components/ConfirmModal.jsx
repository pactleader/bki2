export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 28, width: 400, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,.2)',
      }}>
        <h3 style={{ marginBottom: 8, fontSize: 16 }}>{title || 'Confirm'}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={cancelBtn}>Cancel</button>
          <button onClick={onConfirm} style={dangerBtn}>Delete</button>
        </div>
      </div>
    </div>
  );
}

const cancelBtn = {
  padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)',
  background: '#fff', fontSize: 14, cursor: 'pointer',
};
const dangerBtn = {
  padding: '8px 16px', borderRadius: 6, border: 'none',
  background: 'var(--danger)', color: '#fff', fontSize: 14, cursor: 'pointer',
};
