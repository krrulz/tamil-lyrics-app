// pages/admin/analytics.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminAnalytics() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState(null);

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  useEffect(() => {
    if (!auth) return;
    apiFetch('/api/admin/analytics').then(r => r.json()).then(d => { setData(d); setFetching(false); }).catch(() => setFetching(false));
  }, [auth]);

  if (loading || !auth || fetching) return (
    <div style={{ background: 'var(--admin-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--admin-muted)' }}>Loading analytics…</span>
    </div>
  );

  const { summary = {}, topSongsGlobal = [], pollBreakdowns = [], voterLeaderboard = [] } = data || {};
  const activePoll = selectedPoll ? pollBreakdowns.find(p => p.id === selectedPoll) : null;
  const displayBreakdown = activePoll || (pollBreakdowns[0] || null);

  return (
    <>
      <Head><title>Analytics — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 1100px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .topbar h1 { color: var(--admin-text); font-size: 1.3rem; font-weight: 600; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 2rem; }
        .stat { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1rem 1.25rem; }
        .stat-num { font-size: 2.2rem; font-weight: 700; color: var(--admin-text); line-height: 1; }
        .stat-lbl { font-size: 0.72rem; color: var(--admin-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 6px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } }
        .panel { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.25rem; }
        .panel-title { font-size: 0.78rem; color: var(--admin-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1rem; font-weight: 600; }
        .song-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .rank { font-size: 0.75rem; color: var(--admin-muted); width: 20px; flex-shrink: 0; }
        .song-info { flex: 1; min-width: 0; }
        .song-name { font-size: 0.88rem; color: var(--admin-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .song-movie { font-size: 0.72rem; color: var(--admin-muted); }
        .vote-count { font-size: 0.88rem; font-weight: 700; color: var(--admin-accent); flex-shrink: 0; }
        .bar-wrap { height: 3px; background: rgba(255,255,255,0.07); border-radius: 2px; margin-top: 4px; }
        .bar-fill { height: 3px; background: var(--admin-accent); border-radius: 2px; transition: width 0.4s; }
        .voter-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--admin-border); }
        .voter-row:last-child { border-bottom: none; }
        .voter-name { font-size: 0.85rem; color: var(--admin-text); }
        .voter-count { font-size: 0.85rem; font-weight: 600; color: var(--admin-accent); }
        .poll-select { background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.82rem; padding: 0.35rem 0.6rem; outline: none; margin-bottom: 1rem; width: 100%; }
        .poll-stats { display: flex; gap: 16px; margin-bottom: 1rem; }
        .poll-stat { font-size: 0.8rem; color: var(--admin-muted); }
        .poll-stat strong { color: var(--admin-text); font-size: 1.1rem; display: block; }
        .full-row { margin-bottom: 16px; }
        .empty-msg { color: var(--admin-muted); font-size: 0.85rem; text-align: center; padding: 1rem; }
      `}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>📊 Analytics</h1>
          <Link href="/admin" className="back">← Dashboard</Link>
        </div>

        <div className="stats-grid">
          {[
            { num: summary.totalVotes ?? 0, lbl: 'Total votes cast' },
            { num: summary.uniqueVoters ?? 0, lbl: 'Unique voters' },
            { num: summary.totalPolls ?? 0, lbl: 'Total polls' },
            { num: summary.activePolls ?? 0, lbl: 'Active polls' },
            { num: summary.totalTopics ?? 0, lbl: 'Published topics' },
            { num: summary.maxVoterCount ?? 0, lbl: 'Max songs / voter' },
          ].map((s, i) => (
            <div key={i} className="stat">
              <div className="stat-num">{s.num}</div>
              <div className="stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        <div className="two-col">
          {/* Top songs globally */}
          <div className="panel">
            <div className="panel-title">Top songs (all polls)</div>
            {topSongsGlobal.length === 0 && <div className="empty-msg">No votes yet</div>}
            {topSongsGlobal.slice(0, 10).map((song, i) => {
              const maxV = topSongsGlobal[0]?.votes || 1;
              return (
                <div key={song.songId} className="song-row">
                  <span className="rank">#{i + 1}</span>
                  <div className="song-info">
                    <div className="song-name">{song.name}</div>
                    {song.movie && <div className="song-movie">{song.movie}</div>}
                    <div className="bar-wrap"><div className="bar-fill" style={{ width: `${Math.round(song.votes / maxV * 100)}%` }} /></div>
                  </div>
                  <span className="vote-count">{song.votes}</span>
                </div>
              );
            })}
          </div>

          {/* Voter leaderboard */}
          <div className="panel">
            <div className="panel-title">Voter leaderboard</div>
            {voterLeaderboard.length === 0 && <div className="empty-msg">No named votes yet</div>}
            {voterLeaderboard.map((v, i) => (
              <div key={i} className="voter-row">
                <span className="voter-name">{i + 1}. {v.name}</span>
                <span className="voter-count">{v.count} songs</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-poll breakdown */}
        <div className="full-row">
          <div className="panel">
            <div className="panel-title">Poll breakdown</div>
            {pollBreakdowns.length === 0 && <div className="empty-msg">No polls yet</div>}
            {pollBreakdowns.length > 0 && (
              <>
                <select className="poll-select" value={selectedPoll || ''} onChange={e => setSelectedPoll(e.target.value || null)}>
                  {pollBreakdowns.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.status}) — {p.totalVotes} votes</option>
                  ))}
                </select>
                {displayBreakdown && (
                  <>
                    <div className="poll-stats">
                      <div className="poll-stat"><strong>{displayBreakdown.totalVotes}</strong> total votes</div>
                      <div className="poll-stat"><strong>{displayBreakdown.uniqueVoters}</strong> unique voters</div>
                      <div className="poll-stat"><strong>{displayBreakdown.topSongs?.length}</strong> songs</div>
                    </div>
                    {(displayBreakdown.topSongs || []).map((song, i) => {
                      const maxV = displayBreakdown.topSongs[0]?.votes || 1;
                      return (
                        <div key={song.songId} className="song-row">
                          <span className="rank">#{i + 1}</span>
                          <div className="song-info">
                            <div className="song-name">{song.name}</div>
                            {song.movie && <div className="song-movie">{song.movie}</div>}
                            <div className="bar-wrap"><div className="bar-fill" style={{ width: `${Math.round(song.votes / maxV * 100)}%` }} /></div>
                          </div>
                          <span className="vote-count">{song.votes}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
