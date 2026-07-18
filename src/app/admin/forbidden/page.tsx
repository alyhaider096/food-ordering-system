import { LockKeyhole } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-[#fafaf9]">
      <section className="fh-container flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-xl rounded-3xl border border-[#f1d400] bg-white p-6 text-center shadow-warm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff9dc] text-[#161616]">
            <LockKeyhole size={26} />
          </div>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
            Access blocked
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#292524]">Role permission required</h1>
          <p className="mt-3 text-[#78716c]">
            Your current staff role cannot open this screen by changing the URL.
          </p>
          <a
            className="mt-6 inline-flex justify-center rounded-2xl bg-[#ffdd00] px-5 py-3 font-black text-[#161616]"
            href="/admin"
          >
            Back to dashboard
          </a>
        </div>
      </section>
    </main>
  );
}

