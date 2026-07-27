"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setSending(true); setMessage("");
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/cards` },
    });
    setMessage(error ? error.message : "Check your email for the secure sign-in link.");
    setSending(false);
  }

  return <main className="login-page"><section className="login-card">
    <Link className="cms-logo" href="/"><span className="brand-mark"><span>TG</span></span><b>TGMAX</b></Link>
    <span className="kicker">Private control room</span><h1>Sign in to the CMS</h1>
    <p>Enter your approved email address. We’ll send you a secure sign-in link—no password required.</p>
    <form onSubmit={signIn}><label>Email address<input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label><button disabled={sending}>{sending ? "Sending…" : "Email me a sign-in link →"}</button></form>
    {message && <div className="login-message">{message}</div>}
    <Link className="back-shop" href="/">← Back to TGMAX</Link>
  </section></main>;
}
