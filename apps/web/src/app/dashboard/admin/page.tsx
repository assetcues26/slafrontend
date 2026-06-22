'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNav from '../../../components/DashboardNav';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { useMe } from '../../../hooks/useMe';
import { fetchJson, type AdminUser } from '../../../lib/api';
import { getAccessToken } from '../../../lib/authToken';

const ROLES = ['admin', 'agent', 'viewer'];

const fmtDate = (value?: string | null) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function AdminPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuthSession();
  const { isAdmin, loading: roleLoading, me } = useMe();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [resetResult, setResetResult] = useState<{ email: string; link: string | null } | null>(null);
  const [notice, setNotice] = useState('');

  const setRowBusy = (id: string, value: boolean) =>
    setBusy((prev) => ({ ...prev, [id]: value }));

  const load = useCallback(async () => {
    setError('');
    const token = await getAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }
    try {
      const data = await fetchJson<{ users: AdminUser[] }>('/admin/users', token);
      setUsers(data.users);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!session) {
      router.replace('/');
      return;
    }
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, roleLoading, session, isAdmin, router, load]);

  const changeRole = async (user: AdminUser, role: string) => {
    setRowBusy(user.id, true);
    setError('');
    setNotice('');
    try {
      const token = await getAccessToken();
      await fetchJson(`/admin/users/${user.id}/role`, token, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
      setNotice(`Updated ${user.email} to ${role}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRowBusy(user.id, false);
    }
  };

  const toggleBan = async (user: AdminUser) => {
    const next = !user.banned;
    setRowBusy(user.id, true);
    setError('');
    setNotice('');
    try {
      const token = await getAccessToken();
      await fetchJson(`/admin/users/${user.id}/ban`, token, {
        method: 'POST',
        body: JSON.stringify({ banned: next }),
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, banned: next } : u)));
      setNotice(next ? `Revoked access for ${user.email}.` : `Restored access for ${user.email}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRowBusy(user.id, false);
    }
  };

  const removeUser = async (user: AdminUser) => {
    if (!window.confirm(`Permanently delete ${user.email}? This cannot be undone.`)) return;
    setRowBusy(user.id, true);
    setError('');
    setNotice('');
    try {
      const token = await getAccessToken();
      await fetchJson(`/admin/users/${user.id}`, token, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setNotice(`Deleted ${user.email}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRowBusy(user.id, false);
    }
  };

  const sendReset = async (user: AdminUser) => {
    setRowBusy(user.id, true);
    setError('');
    setNotice('');
    try {
      const token = await getAccessToken();
      const result = await fetchJson<{ email: string; link: string | null }>(
        `/admin/users/${user.id}/reset`,
        token,
        { method: 'POST' },
      );
      setResetResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRowBusy(user.id, false);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Reset link copied to clipboard.');
    } catch {
      setNotice('Could not copy automatically — select and copy the link manually.');
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="dash-page">
        <DashboardNav />
        <div className="table-empty">Loading…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="dash-page">
        <DashboardNav />
        <main className="dash-main">
          <div className="alert alert-error">
            Access denied. You need the admin role to manage users.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <DashboardNav />
      <main className="dash-main">
        <div className="dash-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>User management</h1>
            <p className="lead">Control access, roles, and credentials for every account.</p>
          </div>
          <span className="filter-count">{users.length} users</span>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {notice ? <div className="alert alert-breach">{notice}</div> : null}

        {resetResult ? (
          <div className="reset-banner">
            <div>
              <strong>Password reset link for {resetResult.email}</strong>
              {resetResult.link ? (
                <p className="reset-link">{resetResult.link}</p>
              ) : (
                <p>No link returned — check that the service role key is configured.</p>
              )}
            </div>
            <div className="reset-actions">
              {resetResult.link ? (
                <button type="button" className="primary" onClick={() => copyLink(resetResult.link!)}>
                  Copy link
                </button>
              ) : null}
              <button type="button" className="ghost" onClick={() => setResetResult(null)}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="ticket-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last sign-in</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === me?.id;
                const rowBusy = busy[user.id];
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <span className="dash-avatar" aria-hidden>
                          {(user.email || '?')[0]?.toUpperCase()}
                        </span>
                        <div className="user-meta">
                          <span className="user-email">
                            {user.email}
                            {isSelf ? <span className="self-tag">you</span> : null}
                          </span>
                          <span className="muted">{user.username || user.fullName || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        className={`role-select role-${user.role}`}
                        value={user.role}
                        disabled={rowBusy}
                        onChange={(e) => changeRole(user, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {user.banned ? (
                        <span className="badge badge-breach">No access</span>
                      ) : user.emailConfirmed ? (
                        <span className="badge badge-ok">Active</span>
                      ) : (
                        <span className="badge badge-warn">Unverified</span>
                      )}
                    </td>
                    <td>{fmtDate(user.createdAt)}</td>
                    <td>{fmtDate(user.lastSignInAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-btn"
                          disabled={rowBusy}
                          onClick={() => sendReset(user)}
                        >
                          Reset link
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          disabled={rowBusy || isSelf}
                          title={isSelf ? 'You cannot change your own access' : ''}
                          onClick={() => toggleBan(user)}
                        >
                          {user.banned ? 'Restore' : 'Revoke'}
                        </button>
                        <button
                          type="button"
                          className="action-btn action-danger"
                          disabled={rowBusy || isSelf}
                          title={isSelf ? 'You cannot delete your own account' : ''}
                          onClick={() => removeUser(user)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
