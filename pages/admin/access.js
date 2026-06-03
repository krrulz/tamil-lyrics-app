// pages/admin/access.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminAccess() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState('');
  const [approvedResult, setApprovedResult] = useState(null);

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  const load = async () => {
    if (!auth) return;
    const res = await apiFetch('/api/admin/access-requests');
    const data = await res.json();
    setRequests(data.requests || []);
    setFetching(false);
  };

  useEffect(() => { load(); }, [auth]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const doAction = async (id, action) => {
    setActionId(id);
    const res = await apiFetch(`/api/admin/access-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
    const data = await res.json();
    if (res.ok) {
      if (action === 'approve' && data.tempPassword) {
        setApprovedResult({ email: data.email, tempPassword: data.tempPassword });
      }
      showToast(action === 'approve' ? `✓ Approved! Share the password below with ${data.email}` : '✓ Rejected');
      load();
    } else {
      showToast('⚠ ' + (data.error || 'Failed'));
    }
    setActionId(null);
  };

  const copyPassword = () => {
    if (!approvedResult) return;
    navigator.clipboard.writeText(`Your Tamil Lyrics Admin login:\nEmail: ${approvedResult.email}\nPassword: ${approvedResult.tempPassword}\nLogin at: ${window.location.origin}/admin/login`);
    showToast('✓ Copied to clipboard');
  };

  const statusColors = { pending: '#FBBF24', approved: '#34D399', rejected: '#FC8181' };

  if (loading || !auth) return null;

  return (
    <>
      <Head><title>Access Requests — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 800px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .topbar h1 { color: var(--admin-text); font-size: 1.3rem; font-weight: 600; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; }
        .notice { background: rgba(108,142,255,0.1); border: 1px solid var(--admin-accent); border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: var(--admin-text); line-height: 1.6; }
        .notice strong { color: var(--admin-accent); }
        .approval-box { background: rgba(52,211,153,0.08); border: 1px solid var(--success); border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .approval-box h3 { color: var(--success); font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; }
        .creds { font-family: monospace; font-size: 0.85rem; background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 6px; color: var(--admin-text); margin-bottom: 0.75rem; white-space: pre-wrap; }
        .copy-btn { padding: 0.4rem 0.85rem; background: rgba(52,211,153,0.15); color: var(--success); border: 1px solid var(--success); border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
        .card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.25rem; margin-bottom: 12px; }
        .req-email { font-size: 1rem; font-weight: 600; color: var(--admin-text); margin-bottom: 4px; }
        .req-reason { font-size: 0.85rem; color: var(--admin-muted); margin-bottom: 8px; line-height: 1.5; font-style: italic; }
        .req-meta { font-size: 0.75rem; color: var(--admin-muted); margin-bottom: 10px; }
        .badge { display: inline-block; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; margin-left: 8px; }
        .actions { display: flex; gap: 8px; }
        .btn { padding: 0.4rem 1rem; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid; display: flex; align-items: center; gap: 5px; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-approve { background: rgba(52,211,153,0.1); color: var(--success); border-color: var(--success); }
        .btn-reject { background: rgba(252,129,129,0.08); color: var(--error); border-color: var(--error); }
        .empty { color: var(--admin-muted); text-align: center; padding: 3rem; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; max-width: 400px; text-align: center; }
      `}</style>
      <div className="wrap">
        {toast && <div className="toast">{toast}</div>}
        <div className="topbar">
          <h1>🔑 Access Requests</h1>
          <Link href="/admin" className="back">← Dashboard</Link>
        </div>

        <div className="notice">
          Access requests are sent by users who want admin privileges. When you approve a request, a Firebase Auth account is created and a temporary password is generated. <strong>Copy and send it to them via email</strong> — they can change it after first login.
        </div>

        {approvedResult && (
          <div className="approval-box">
            <h3>✓ Account created — share these credentials</h3>
            <div className="creds">{`Email: ${approvedResult.email}\nPassword: ${approvedResult.tempPassword}`}</div>
            <button className="copy-btn" onClick={copyPassword}>📋 Copy login details</button>
          </div>
        )}

        {fetching && <div className="empty">Loading…</div>}
        {!fetching && requests.length === 0 && <div className="empty">No access requests yet.</div>}
        {requests.map(r => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="req-email">{r.email}</span>
              <span className="badge" style={{ background: `${statusColors[r.status]}22`, color: statusColors[r.status] }}>{r.status}</span>
            </div>
            <div className="req-reason">"{r.reason}"</div>
            <div className="req-meta">Submitted {r.createdAt?.slice(0, 10)}{r.reviewedBy ? ` · Reviewed by ${r.reviewedBy}` : ''}</div>
            {r.status === 'pending' && (
              <div className="actions">
                <button className="btn btn-approve" disabled={actionId === r.id} onClick={() => doAction(r.id, 'approve')}>
                  {actionId === r.id ? <><span className="spinner" /> Processing…</> : '✓ Approve'}
                </button>
                <button className="btn btn-reject" disabled={actionId === r.id} onClick={() => doAction(r.id, 'reject')}>✕ Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
