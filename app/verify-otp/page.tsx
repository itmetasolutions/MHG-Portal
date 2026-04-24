import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import VerifyOtpClient from "./verify-otp-client";

type SearchParams = {
  email?: string | string[];
  initialEmail?: string | string[];
  reason?: string | string[];
};

function toSingle(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getAuthSession();

  if (session) {
    redirect(session.role === UserRole.ADMIN ? "/admin" : "/dashboard");
  }

  const initialEmail = toSingle(searchParams?.email) ?? toSingle(searchParams?.initialEmail);
  const reason = toSingle(searchParams?.reason);

  return (
    <main className="auth-page auth-page--otp">
      <div className="auth-page__glow auth-page__glow--gold" aria-hidden="true" />
      <div className="auth-page__glow auth-page__glow--soft" aria-hidden="true" />

      <section className="auth-page__shell">
        <div className="auth-page__lead">
          <span className="auth-page__eyebrow">Step 2 of 2</span>
          <h1 className="auth-page__title">Verify your secure access</h1>
          <p className="auth-page__copy">
            We sent a one-time verification code to your email. Enter it below to open the
            correct workspace without interrupting the secure login flow.
          </p>
        </div>

        <VerifyOtpClient initialEmail={initialEmail} reason={reason} />
      </section>
    </main>
  );
}