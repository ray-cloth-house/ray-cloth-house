'use client';

import { useEffect, useState } from 'react';
import {
  UserCog, Check, X, Shield, ShieldAlert, UserPlus, Eye, EyeOff,
  Copy, CheckCheck, ChevronLeft, AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  status: 'pending' | 'active' | 'suspended';
  createdAt: string;
}

interface NewUserForm {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
}

type ModalStep = 'form' | 'confirm' | 'success';

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
      title={`Copy ${label || ''}`}
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const [modalStep, setModalStep] = useState<ModalStep | null>(null);
  const [form, setForm] = useState<NewUserForm>({ name: '', email: '', password: '', role: 'staff' });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string; password: string; role: string } | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user?.role && ['owner', 'admin'].includes(data.user.role)) {
          setCurrentRole(data.user.role);
          setAuthorized(true);
          fetchUsers();
        } else {
          setAuthorized(false);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchUsers = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  const updateUser = async (id: string, body: Record<string, string>) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => u._id === id ? { ...u, ...updated } : u));
      }
    } finally {
      setUpdating(null);
    }
  };

  const openAddModal = () => {
    setForm({ name: '', email: '', password: '', role: 'staff' });
    setFormError('');
    setShowPassword(false);
    setCreatedUser(null);
    setAllCopied(false);
    setModalStep('form');
  };

  const closeModal = () => {
    setModalStep(null);
    setFormError('');
    setCreating(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setFormError('Name is required.');
    if (!form.email.trim()) return setFormError('Email is required.');
    if (!form.password) return setFormError('Password is required.');
    if (form.password.length < 6) return setFormError('Password must be at least 6 characters.');
    setModalStep('confirm');
  };

  const handleConfirm = async () => {
    setCreating(true);
    setFormError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create user.');
        setModalStep('form');
        return;
      }
      setCreatedUser({ name: form.name, email: form.email, password: form.password, role: form.role });
      setModalStep('success');
      fetchUsers();
    } finally {
      setCreating(false);
    }
  };

  const copyAll = async () => {
    if (!createdUser) return;
    const text = `Name: ${createdUser.name}\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}\nRole: ${createdUser.role.charAt(0).toUpperCase() + createdUser.role.slice(1)}`;
    await navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      staff: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || styles.staff}`}>
        {role === 'owner' && <Shield className="w-3 h-3" />}
        {role === 'admin' && <ShieldAlert className="w-3 h-3" />}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user accounts, roles, and access</p>
        </div>
        {currentRole === 'owner' && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
          >
            <UserPlus className="w-4 h-4" />
            Add Person
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <UserCog className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{user.name || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-5 py-3">{roleBadge(user.role)}</td>
                    <td className="px-5 py-3">{statusBadge(user.status)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      {user.role === 'owner' ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {user.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateUser(user._id, { status: 'active' })}
                                disabled={updating === user._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => updateUser(user._id, { status: 'suspended' })}
                                disabled={updating === user._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          {user.status === 'active' && (
                            <button
                              onClick={() => updateUser(user._id, { status: 'suspended' })}
                              disabled={updating === user._id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                            >
                              <X className="w-3 h-3" /> Suspend
                            </button>
                          )}
                          {user.status === 'suspended' && (
                            <button
                              onClick={() => updateUser(user._id, { status: 'active' })}
                              disabled={updating === user._id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" /> Reactivate
                            </button>
                          )}
                          <select
                            value={user.role}
                            onChange={e => updateUser(user._id, { role: e.target.value })}
                            disabled={updating === user._id}
                            className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                          >
                            {currentRole === 'owner' ? (
                              <>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                              </>
                            ) : (
                              <option value="staff">Staff</option>
                            )}
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={modalStep !== 'success' ? closeModal : undefined} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">

            {modalStep === 'form' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Add New Person</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Create a new account for a team member</p>
                  </div>
                  <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Ahmad Raza"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="e.g. ahmad@example.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Set a password for this account"
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    >
                      <option value="staff">Staff — Basic access</option>
                      <option value="admin">Admin — Full access (except user management)</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

            {modalStep === 'confirm' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <button
                    onClick={() => setModalStep('form')}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <UserPlus className="w-7 h-7 text-primary-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Confirm New Account</h2>
                  <p className="text-sm text-gray-500 mt-1">Please review the details before creating this account.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
                  {[
                    { label: 'Name', value: form.name },
                    { label: 'Email', value: form.email },
                    { label: 'Role', value: form.role.charAt(0).toUpperCase() + form.role.slice(1) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
                      <span className="text-sm font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setModalStep('form')}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={creating}
                    className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
                  >
                    {creating ? 'Creating...' : 'Confirm & Create'}
                  </button>
                </div>
              </div>
            )}

            {modalStep === 'success' && createdUser && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-7 h-7 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Account Created!</h2>
                  <p className="text-sm text-gray-500 mt-1">Share these credentials with the new team member.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
                  {[
                    { label: 'Name', value: createdUser.name },
                    { label: 'Email', value: createdUser.email },
                    { label: 'Password', value: createdUser.password },
                    { label: 'Role', value: createdUser.role.charAt(0).toUpperCase() + createdUser.role.slice(1) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-gray-500 uppercase w-20 shrink-0">{label}</span>
                      <span className="text-sm font-medium text-gray-900 flex-1 truncate font-mono">{value}</span>
                      <CopyButton value={value} label={label} />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copyAll}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    {allCopied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {allCopied ? 'Copied!' : 'Copy All'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
