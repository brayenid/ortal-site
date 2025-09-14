"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [ok, setOk] = useState<boolean>(false);
  const [error, setError] = useState<string|undefined>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const res = await fetch("/api/register", { method: "POST", body: JSON.stringify({ email, name, password }) });
    if (res.ok) setOk(true); else setError("Gagal mendaftar");
  }

  return (
    <div className="container py-16 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Daftar</h1>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm mb-1">Nama</label>
          <input value={name} onChange={e=>setName(e.target.value)} required className="w-full rounded-xl border-slate-300" />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="w-full rounded-xl border-slate-300" />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required className="w-full rounded-xl border-slate-300" />
        </div>
        {ok && <div className="text-sm text-green-700">Berhasil! Silakan masuk.</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="btn w-full">Daftar</button>
      </form>
    </div>
  );
}
