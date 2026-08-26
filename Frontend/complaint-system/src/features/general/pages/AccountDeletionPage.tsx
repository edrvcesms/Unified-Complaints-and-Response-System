import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, ShieldAlert } from "lucide-react";
import maryapp from "../../../assets/maryapp.jpg";
import { deleteAccount, verifyDeleteAccountOTP } from "../../../services/deletion/accountDeletion";

type Step = "request" | "verify" | "complete";

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseError = error as { response?: { data?: { detail?: string } }; message?: string };
  return responseError.response?.data?.detail || responseError.message || fallback;
};

export const AccountDeletionPage: React.FC = () => {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);

  const requestMutation = useMutation({
    mutationFn: () => deleteAccount(email.trim()),
    onSuccess: () => {
      setError("");
      setNotice("A verification code was sent to your email. It expires in 5 minutes.");
      setStep("verify");
      setTimeout(() => otpInputRef.current?.focus(), 0);
    },
    onError: (requestError) => setError(getErrorMessage(requestError, "We could not start the deletion request.")),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyDeleteAccountOTP(email.trim(), otp),
    onSuccess: () => {
      setError("");
      setNotice("");
      setStep("complete");
    },
    onError: (verificationError) => setError(getErrorMessage(verificationError, "That verification code could not be accepted.")),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (step === "request") {
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError("Enter a valid email address to continue.");
        return;
      }
      requestMutation.mutate();
      return;
    }

    if (step === "verify") {
      if (!/^\d{6}$/.test(otp)) {
        setError("Enter the 6-digit verification code from your email.");
        return;
      }
      verifyMutation.mutate();
    }
  };

  const isPending = requestMutation.isPending || verifyMutation.isPending;

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:gap-20 lg:px-12">
        <section className="flex-1 py-8 lg:py-0">
          <div className="mb-12 flex items-center gap-3">
            <img src={maryapp} alt="Mary App logo" className="h-12 w-12 rounded-full object-cover ring-2 ring-[#d6e6d8]" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#17643b]">Mary App</p>
            </div>
          </div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[#c25b35]">Privacy request</p>
          <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-[#123d2b] sm:text-6xl">Delete your account and data.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">Use this dedicated page to request permanent removal of your account and associated personal data from the complaint system.</p>
          <div className="mt-10 grid max-w-lg gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div className="flex gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#c25b35]" /><span>Deletion is permanent and cannot be undone.</span></div>
            <div className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#17643b]" /><span>A one-time code confirms ownership of the email.</span></div>
          </div>
        </section>

        <section className="w-full max-w-md rounded-2xl border border-[#dce6dd] bg-white p-6 shadow-[0_24px_70px_rgba(18,61,43,0.12)] sm:p-9">
          {step === "complete" ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-[#17643b]" />
              <h2 className="mt-6 text-2xl font-bold text-[#123d2b]">Account deleted</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">Your account and associated data have been permanently removed.</p>
              <a href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#17643b] hover:text-[#0f472a]"><ArrowLeft className="h-4 w-4" /> Return to the home page</a>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c25b35]">Step {step === "request" ? "1" : "2"} of 2</p>
                <h2 className="mt-2 text-2xl font-bold text-[#123d2b]">{step === "request" ? "Request account deletion" : "Confirm deletion"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{step === "request" ? "Enter the email address connected to your account." : `Enter the code sent to ${email.trim()}.`}</p>
              </div>
              {notice && <p role="status" className="mb-5 rounded-lg bg-[#edf7ef] px-4 py-3 text-sm leading-5 text-[#17643b]">{notice}</p>}
              {error && <p role="alert" className="mb-5 flex gap-2 rounded-lg bg-[#fff1ed] px-4 py-3 text-sm leading-5 text-[#a43e25]"><AlertCircle className="h-5 w-5 shrink-0" />{error}</p>}
              <form onSubmit={handleSubmit} className="space-y-5">
                {step === "request" ? (
                  <label className="block text-sm font-semibold text-slate-700">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-[#17643b] focus:ring-2 focus:ring-[#17643b]/15" required /></label>
                ) : (
                  <label className="block text-sm font-semibold text-slate-700">Verification code<input ref={otpInputRef} type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" placeholder="000000" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.35em] outline-none transition focus:border-[#17643b] focus:ring-2 focus:ring-[#17643b]/15" required /></label>
                )}
                <button type="submit" disabled={isPending} className="w-full rounded-lg bg-[#17643b] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#0f472a] disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "Please wait..." : step === "request" ? "Send verification code" : "Permanently delete account"}</button>
              </form>
              {step === "verify" && <button type="button" onClick={() => { setStep("request"); setOtp(""); setError(""); setNotice(""); }} className="mt-5 w-full text-sm font-semibold text-slate-500 hover:text-[#17643b]">Use a different email</button>}
              <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-400">This page is separate from the official app. Your account is only deleted after the verification code is confirmed.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
};