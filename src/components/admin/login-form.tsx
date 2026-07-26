"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("owner@flavourheaven.local");
  const [password, setPassword] = useState("Flavour123!");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid staff email or password.");
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div className="rounded-2xl border border-transparent bg-[#fff9dc] p-4">
        <div className="flex items-center gap-2 font-black text-[#292524]">
          <LockKeyhole size={18} className="text-[#161616]" />
          Staff access
        </div>
        <p className="mt-1 text-sm leading-6 text-[#161616]">
          Demo users are seeded with password Flavour123! for development only.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
          Email
        </span>
        <input
          className="focus-ring mt-1 w-full rounded-2xl border border-[#d6d3d1] bg-white px-4 py-3 text-[#292524]"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
          Password
        </span>
        <input
          className="focus-ring mt-1 w-full rounded-2xl border border-[#d6d3d1] bg-white px-4 py-3 text-[#292524]"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-semibold text-[#b91c1c]">
          {error}
        </p>
      ) : null}

      <button
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ffdd00] px-4 py-4 font-black text-[#161616] transition hover:bg-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

