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
      <VerifyOtpClient initialEmail={initialEmail} reason={reason} />
    </main>
  );
}