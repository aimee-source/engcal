"use client";

import { useState } from "react";
import { db } from "@/lib/db";

const ALLOWED_EMAILS = [
  "aimee@system2.fitness",
  "kunal@system2.fitness",
  "michaelsholler@system2.fitness",
  "yuran@system2.fitness",
  "dilan@system2.fitness",
  "patrick.k@system2.fitness",
  "buddhi@system2.fitness",
  "emiliano@system2.fitness",
];

export default function LoginPage() {
  const { isLoading, user } = db.useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) return null;
  if (user) {
    window.location.href = "/";
    return null;
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!ALLOWED_EMAILS.includes(email.toLowerCase().trim())) {
      setError("This email isn't authorized to access engcal.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await db.auth.sendMagicCode({ email });
      setCodeSent(true);
    } catch {
      setError("Failed to send code. Check your email address.");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      await db.auth.signInWithMagicCode({ email, code });
      window.location.href = "/";
    } catch {
      setError("Invalid or expired code. Try again.");
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-white mb-1">engcal</h1>
        <p className="text-sm text-zinc-400 mb-6">
          {codeSent ? `Enter the code sent to ${email}` : "Sign in to view engineering velocity"}
        </p>

        {!codeSent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send magic code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center text-lg"
              maxLength={6}
              required
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={verifying}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {verifying ? "Verifying..." : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => { setCodeSent(false); setCode(""); setError(""); }}
              className="w-full text-sm text-zinc-500 hover:text-zinc-300"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
