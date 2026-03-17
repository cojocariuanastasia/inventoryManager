import { NavLink } from 'react-router-dom';
import styles from './NavBar.module.css';

const navLinks = [
  { to: '/', label: 'Overview', end: true },
  { to: '/ai-transfers', label: 'AI Transfers' },
  { to: '/store-inventory', label: 'Store Inventory' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/products', label: 'Products' },
];

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>
        📦 InventoryMgr
      </span>

      {navLinks.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            color: isActive ? '#e2e8f0' : '#64748b',
            textDecoration: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: isActive ? '#1e2235' : 'transparent',
          })}
        >
          {label}
        </NavLink>
      ))}

      <NavLink
        to="/settings"
        style={({ isActive }) => ({
          marginLeft: 'auto',
          color: isActive ? '#e2e8f0' : '#64748b',
          textDecoration: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '14px',
          backgroundColor: isActive ? '#1e2235' : 'transparent',
        })}
      >
        ⚙️ Settings
      </NavLink>
    </nav>
  );
}
