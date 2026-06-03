// pages/admin/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminDashboard() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loading && !auth) router.replace('/admin/login');
  }, [auth, loading]);

  useEffect(() => {
    if (!auth) return;
    apiFetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => setStats(d.summary))
      .catch(() => {});
  }, [auth]);

  if (loading || !auth) return null;

  const cards = [
    { href: '/admin/suggestions', icon: '💡', label: 'Suggestions', desc: 'Review song suggestions from users', color: '#6C8EFF' },
    { href: '/admin/playlists', icon: '🎶', label: 'Playlists', desc: 'Manage song playlists', color: '#34D399' },
    { href: '/admin/polls', icon: '🗳️', label: 'Polls', desc: 'Create and manage voting polls', color: '#F59E0B' },
    { href: '/admin/topics', icon: '📚', label: 'Topics', desc: 'Build and publish topic collections', color: '#F87171' },
    { href: '/admin/analytics', icon: '📊', label: 'Analytics', desc: 'Vote stats and insights', color: '#A78BFA' },
    { href: '/admin/access', icon: '🔑', label: 'Access', desc: 'Approve admin access requests', color: '#FB923C' },
  ];

  return (
    <>
      <Head><title>Admin Dashboard — Tamil Lyrics</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { display: flex; min-height: 100vh; }
        .main { flex: 1; padding: 2rem; max-width: 960px; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .topbar h1 { color: var(--admin-text); font-size: 1.5rem; font-weight: 600; }
        .topbar-right { display: flex; align-items: center; gap: 1rem; }
        .email { color: var(--admin-muted); font-size: 0.82rem; }
        .logout-btn { font-size: 0.82rem; color: var(--admin-muted); background: none; border: 1px solid var(--admin-border); padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; }
        .logout-btn:hover { color: var(--admin-text); }
        .home-link { font-size: 0.82rem; color: var(--admin-accent); text-decoration: none; }
        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 2rem; }
        .stat { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1rem; }
        .stat-num { font-size: 2rem; font-weight: 700; color: var(--admin-text); }
        .stat-lbl { font-size: 0.72rem; color: var(--admin-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 12px; padding: 1.5rem; text-decoration: none; display: block; transition: border-color 0.15s; }
        .card:hover { border-color: var(--admin-accent); }
        .card-icon { font-size: 1.8rem; margin-bottom: 0.75rem; }
        .card-title { color: var(--admin-text); font-size: 1rem; font-weight: 600; margin-bottom: 0.3rem; }
        .card-desc { color: var(--admin-muted); font-size: 0.82rem; line-height: 1.5; }
        .card-arrow { color: var(--admin-accent); font-size: 0.8rem; margin-top: 0.75rem; display: block; }
      `}</style>
      <div className="wrap">
        <div className="main">
          <div className="topbar">
            <h1>Admin Dashboard</h1>
            <div className="topbar-right">
              <Link href="/" className="home-link">← Public site</Link>
              <span className="email">{auth.user.email}</span>
              <button className="logout-btn" onClick={async () => { const { getAuth } = await import('firebase/auth'); await getAuth().signOut(); router.replace('/admin/login'); }}>Sign out</button>
            </div>
          </div>

          {stats && (
            <div className="stats-row">
              {[
                { num: stats.totalVotes, lbl: 'Total votes' },
                { num: stats.uniqueVoters, lbl: 'Unique voters' },
                { num: stats.activePolls, lbl: 'Active polls' },
                { num: stats.totalTopics, lbl: 'Topics' },
              ].map((s, i) => (
                <div key={i} className="stat">
                  <div className="stat-num">{s.num ?? '—'}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid">
            {cards.map(c => (
              <Link key={c.href} href={c.href} className="card">
                <div className="card-icon">{c.icon}</div>
                <div className="card-title">{c.label}</div>
                <div className="card-desc">{c.desc}</div>
                <span className="card-arrow">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
