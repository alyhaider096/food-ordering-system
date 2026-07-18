import { LoginForm } from "@/components/admin/login-form";
import { Clock, LockKeyhole, ShieldCheck, Utensils } from "lucide-react";


export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="min-h-screen bg-[#1c1917] text-white">
      <section className="fh-container grid min-h-screen items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="max-w-xl">
          <a
            className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80"
            href="/"
          >
            Back to customer website
          </a>
          <p className="mt-10 text-sm font-bold uppercase tracking-[0.18em] text-[#fbbf24]">
            Flavour Heaven Staff Portal
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            Separate login for cafe operations.
          </h1>
          <p className="mt-4 max-w-lg leading-7 text-white/70">
            Owner, manager, cashier, kitchen, rider, and menu teams sign in here. Public
            customers never need this screen to order food.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Secure sessions", icon: ShieldCheck },
              { label: "Role screens", icon: LockKeyhole },
              { label: "Live orders", icon: Utensils },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4" key={item.label}>
                  <Icon className="text-[#fbbf24]" size={22} />
                  <p className="mt-3 text-sm font-black">{item.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-bold text-white/75">
            <Clock size={16} /> Operations access only
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white p-6 text-[#292524] shadow-warm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
            Sign in
          </p>
          <h2 className="mt-2 text-3xl font-black">Staff credentials</h2>
          <p className="mt-2 text-[#78716c]">
            Changing URLs is not enough. Every admin screen and API checks this role on the server.
          </p>
          <LoginForm callbackUrl={callbackUrl ?? "/admin"} />
        </div>
      </section>
    </main>
  );
}



