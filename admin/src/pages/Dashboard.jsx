import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Dashboard Admin</h2>
      <p>Halo, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
      <p style={{ color: '#888', marginTop: 24 }}>
        Menu Kelola Era, Tahun, Section, Tokoh akan ditambahkan di sesi berikutnya (Design.md §4).
      </p>
    </div>
  );
}
