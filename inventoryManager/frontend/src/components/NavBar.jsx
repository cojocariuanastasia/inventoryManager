import { NavLink } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/ai-transfers', label: 'AI Transfers' },
  { to: '/store-inventory', label: 'Store Inventory' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/products', label: 'Products' },
];

export default function NavBar() {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '0 32px',
      height: '60px',
      backgroundColor: '#1e293b',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      position: 'sticky',
      top: 0,
      zIndex: 10000,
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    }}>
      <span style={{
        fontWeight: 700,
        fontSize: '17px',
        color: '#f8fafc',
        marginRight: '20px',
        letterSpacing: '-0.3px',
      }}>
        📦 InventoryMgr
      </span>

      {navLinks.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            color: isActive ? '#f1f5f9' : '#94a3b8',
            textDecoration: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: isActive ? '#334155' : 'transparent',
          })}
        >
          {label}
        </NavLink>
      ))}

      <NavLink
        to="/settings"
        style={({ isActive }) => ({
          marginLeft: 'auto',
          color: isActive ? '#f1f5f9' : '#94a3b8',
          textDecoration: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '14px',
          backgroundColor: isActive ? '#334155' : 'transparent',
        })}
      >
        ⚙️ Settings
      </NavLink>
    </nav>
  );
}
