export default function SettingsPage() {
  return (
    <div style={{
      padding: '24px',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <h1 style={{ marginBottom: '8px' }}>Settings</h1>
      <p style={{ color: '#4b5563', marginBottom: '32px' }}>
        Application settings and configuration.
      </p>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '48px 32px',
        boxShadow: '0 4px 20px rgba(15,23,42,0.07)',
        color: '#94a3b8',
        textAlign: 'center',
        fontSize: '15px',
      }}>
        ⚙️ Settings panel coming soon
      </div>
    </div>
  );
}
