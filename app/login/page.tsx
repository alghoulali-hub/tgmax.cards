"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recovery, setRecovery] = useState(false);

  async function passwordSignIn(event: FormEvent) {
    event.preventDefault();
    setSending(true); setMessage("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const result = await response.json() as { error?: string };
    if (response.ok) window.location.href = "/cards";
    else { setMessage(result.error ?? "Unable to sign in"); setSending(false); }
  }

  async function magicLinkSignIn(event: FormEvent) {
    event.preventDefault();
    setSending(true); setMessage("");
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback?next=/cards` } });
    setMessage(error ? error.message : "Check your email for the secure sign-in link.");
    setSending(false);
  }

  return <main className="login-page"><section className="login-card">
    <Link className="cms-logo" href="/"><span className="brand-mark"><span>TG</span></span><b>TGMAX</b></Link>
    <span className="kicker">Private control room</span><h1>Sign in to the CMS</h1>
    {!recovery ? <>
      <p>Use the username and password assigned to your TGMAX account.</p>
      <form onSubmit={passwordSignIn}>
        <label>Username or email<input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="your-username" /></label>
        <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" /></label>
        <button disabled={sending}>{sending ? "Signing in…" : "Sign in →"}</button>
      </form>
      <button className="login-switch" onClick={() => { setRecovery(true); setMessage(""); }}>Use an email sign-in link</button>
    </> : <>
      <p>Enter your approved email address and we’ll send a recovery sign-in link.</p>
      <form onSubmit={magicLinkSignIn}><label>Email address<input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label><button disabled={sending}>{sending ? "Sending…" : "Email me a sign-in link →"}</button></form>
      <button className="login-switch" onClick={() => { setRecovery(false); setMessage(""); }}>Back to username login</button>
    </>}
    {message && <div className="login-message">{message}</div>}
    <Link className="back-shop" href="/">← Back to TGMAX</Link>
  </section></main>;
}
