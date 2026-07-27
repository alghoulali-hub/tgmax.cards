"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function passwordSignIn(event: FormEvent) {
    event.preventDefault();
    setSending(true); setMessage("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const result = await response.json() as { error?: string };
    if (response.ok) window.location.href = "/cards";
    else { setMessage(result.error ?? "Unable to sign in"); setSending(false); }
  }

  return <main className="login-page"><section className="login-card">
    <Link className="cms-logo" href="/"><span className="brand-mark"><span>TG</span></span><b>TGMAX</b></Link>
    <span className="kicker">Private control room</span><h1>Sign in to the CMS</h1>
    <p>Use the username and password assigned to your TGMAX account.</p>
    <form onSubmit={passwordSignIn}>
      <label>Username<input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="your-username" /></label>
      <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" /></label>
      <button disabled={sending}>{sending ? "Signing in…" : "Sign in →"}</button>
    </form>
    {message && <div className="login-message">{message}</div>}
    <Link className="back-shop" href="/">← Back to TGMAX</Link>
  </section></main>;
}
