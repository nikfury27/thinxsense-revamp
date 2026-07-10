import React, { useState } from 'react';

const MOCK_USERS = [
  {
    username: 'shwetha',
    password: 'admin123',
    role: 'ADMIN',
    initials: 'S',
    shift: 'Day Shift · 09:30 – 18:30',
    lastLogoutAt: new Date(Date.now() - 16.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    username: 'rajesh',
    password: 'operator1',
    role: 'OPERATOR',
    initials: 'R',
    shift: 'Night Shift · 21:30 – 06:30',
    lastLogoutAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
  },
];

export { MOCK_USERS };

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const user = MOCK_USERS.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin({ ...user, currentLoginAt: new Date().toISOString() });
    } else {
      setError('Invalid username or password.');
    }
    setLoading(false);
  };

  const quickFill = (u) => { setUsername(u.username); setPassword(u.password); setError(''); };

  return (
    <div className="min-h-screen w-screen bg-surface-container-low flex items-center justify-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3154ca, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #b7c4ff, transparent)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4 space-y-4">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="material-symbols-outlined text-white text-[28px]">sensors</span>
          </div>
          <h1 className="text-2xl font-black italic text-primary tracking-tight">thinxsense</h1>
          <p className="text-sm text-secondary mt-1">Industrial IoT Platform · GND Solutions</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl border border-outline-variant p-7">
          <h2 className="font-bold text-lg text-on-surface mb-0.5">Welcome back</h2>
          <p className="text-xs text-secondary mb-5">Sign in to your operator account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="e.g. shwetha"
                autoFocus
                className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-error bg-error-container/30 border border-error/20 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[15px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
                : <><span className="material-symbols-outlined text-[18px]">login</span>Sign In</>
              }
            </button>
          </form>
        </div>

        {/* POC quick-fill */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 text-xs space-y-2">
          <div className="font-semibold text-primary mb-2">POC Demo — click to fill</div>
          {MOCK_USERS.map(u => (
            <button
              key={u.username}
              onClick={() => quickFill(u)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">{u.initials}</div>
                <span className="font-semibold text-on-surface">{u.username}</span>
                <span className="text-secondary">· {u.role}</span>
              </div>
              <span className="text-secondary font-mono">{u.shift.split('·')[0].trim()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
