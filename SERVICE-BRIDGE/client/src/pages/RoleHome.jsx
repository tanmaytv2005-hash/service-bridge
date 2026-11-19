import { useAuth } from '../AuthContext.jsx';

export default function RoleHome({ title, next }) {
  const { user } = useAuth();
  return (
    <main className="wrap">
      <h1>{title}</h1>
      <div className="card">
        <p>Welcome, <strong>{user.name}</strong>. You are signed in as <strong>{user.role}</strong> ({user.email}).</p>
      </div>
      <h2>Planned modules (not built yet)</h2>
      <ul className="card">{next.map((n) => <li key={n}>{n}</li>)}</ul>
    </main>
  );
}
