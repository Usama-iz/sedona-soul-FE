"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, MailCheck, RefreshCw } from "lucide-react";

import {
  AuthFormAlert,
  AuthFormCard,
  AuthPrimaryButton,
  AuthTextField,
} from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import {
  resendVerificationEmail,
  verifyEmailToken,
} from "@/lib/auth/email-verification-service";
import { signInUrl, signUpUrl } from "@/lib/auth/routes";
import { validateEmail } from "@/lib/auth/auth-form-validation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AlertState = {
  message: string;
  status: "error" | "success";
};

export function VerifyEmailCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token")?.trim() ?? "";
  const initialEmail = searchParams.get("email")?.trim() ?? "";
  const expiresInHours = searchParams.get("expiresInHours")?.trim() ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  const pageMode = token ? "verify-token" : "pending-verification";
  const expiryLabel = useMemo(() => {
    if (!expiresInHours) {
      return "A verification link has been sent to your inbox.";
    }

    return `The verification link expires in ${expiresInHours} hours.`;
  }, [expiresInHours]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function runVerification() {
      setIsVerifyingToken(true);
      setAlert(null);

      try {
        const result = await verifyEmailToken(token);

        if (cancelled) {
          return;
        }

        setVerificationComplete(true);
        setAlert({
          status: "success",
          message: `${result.user.email} has been verified. You can sign in now.`,
        });
        toast({
          title: "Email verified",
          description: "Your account is ready. Sign in to continue.",
          variant: "success",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "That verification link is invalid or expired.";

        setAlert({
          status: "error",
          message,
        });
        toast({
          title: "Verification failed",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsVerifyingToken(false);
        }
      }
    }

    void runVerification();

    return () => {
      cancelled = true;
    };
  }, [toast, token]);

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = validateEmail(email);

    if (nextEmailError) {
      setEmailError(nextEmailError);
      setAlert({
        status: "error",
        message: "Enter a valid email to resend the verification link.",
      });
      return;
    }

    setEmailError(undefined);
    setAlert(null);
    setIsSubmitting(true);

    try {
      const result = await resendVerificationEmail(email.trim().toLowerCase());

      setAlert({
        status: "success",
        message: `A fresh verification link was sent. It expires in ${result.expiresInHours} hours.`,
      });
      toast({
        title: "Verification email sent",
        description: "Check your inbox and spam folder for the new link.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We could not resend the verification email right now.";

      setAlert({
        status: "error",
        message,
      });
      toast({
        title: "Resend failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pageMode === "verify-token") {
    return (
      <AuthFormCard>
        <div className="mb-5 flex items-center gap-3 rounded-[18px] border border-[#D9CDC0] bg-white/55 p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#E4EFE8] text-sedona-sage">
            <MailCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sedona-blue">Email verification</p>
            <h1 className="font-serif text-[28px] leading-tight text-sedona-pineSoft sm:text-[32px]">
              Confirming your account
            </h1>
          </div>
        </div>

        <AuthFormAlert
          message={alert?.message}
          variant={alert?.status === "success" ? "success" : "error"}
        />

        {isVerifyingToken ? (
          <div className="mt-5 rounded-[18px] border border-[#D9CDC0] bg-white/60 p-5 text-center">
            <LoaderCircle
              aria-hidden="true"
              className="mx-auto h-6 w-6 animate-spin text-sedona-clay"
            />
            <p className="mt-3 text-sm font-semibold text-sedona-pineSoft">
              Verifying your email address...
            </p>
          </div>
        ) : null}

        {!isVerifyingToken ? (
          <div className="mt-5 space-y-4">
            <div
              className={cn(
                "rounded-[18px] border p-5",
                verificationComplete
                  ? "border-[#CFE2D6] bg-[#F3FAF4]"
                  : "border-[#EAC7B7] bg-[#FFF8F4]",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]",
                    verificationComplete
                      ? "bg-[#E4EFE8] text-sedona-sage"
                      : "bg-[#F4E2D6] text-sedona-clay",
                  )}
                >
                  {verificationComplete ? (
                    <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                  ) : (
                    <RefreshCw aria-hidden="true" className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">
                    {verificationComplete
                      ? "Your email is verified"
                      : "This link needs attention"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    {verificationComplete
                      ? "Your account is ready. Sign in and we’ll continue from there."
                      : "If your link expired, you can request a new verification email below."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <AuthPrimaryButton
                className="sm:flex-1"
                disabled={false}
                onClick={() => router.push(signInUrl)}
                type="button"
              >
                Go to sign in
              </AuthPrimaryButton>
              {!verificationComplete ? (
                <Button
                  className="h-[54px] rounded-[16px] border-sedona-creamLine bg-white px-5 text-base font-bold text-sedona-clay hover:bg-[#FFF8F4] sm:h-[58px]"
                  onClick={() => {
                    const nextSearchParams = new URLSearchParams(searchParams);
                    nextSearchParams.delete("token");
                    router.replace(`/verify-email?${nextSearchParams.toString()}`);
                  }}
                  type="button"
                  variant="outline"
                >
                  Request a new link
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard>
      <div className="mb-5 flex items-center gap-3 rounded-[18px] border border-[#D9CDC0] bg-white/55 p-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#E8ECF5] text-sedona-blue">
          <MailCheck aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sedona-blue">
            Check your email
          </p>
          <h1 className="font-serif text-[28px] leading-tight text-sedona-pineSoft sm:text-[32px]">
            Verification required
          </h1>
        </div>
      </div>

      <p className="text-sm leading-6 text-sedona-stone">
        {expiryLabel}
      </p>

      {initialEmail ? (
        <p className="mt-3 rounded-[16px] bg-white/60 px-4 py-3 text-sm font-semibold text-sedona-pineSoft">
          We sent it to <span className="text-sedona-clay">{initialEmail}</span>.
        </p>
      ) : null}

      <div className="mt-5 rounded-[18px] border border-[#E2D8C8] bg-white/60 p-4 text-sm leading-6 text-sedona-stone">
        Open the verification email and click the link before signing in. If you do not see it, check your spam or promotions folder.
      </div>

      <form className="mt-5 space-y-3" noValidate onSubmit={handleResend}>
        <AuthFormAlert
          message={alert?.message}
          variant={alert?.status === "success" ? "success" : "error"}
        />

        <AuthTextField
          autoComplete="email"
          disabled={isSubmitting}
          error={emailError}
          id="verification-email"
          label="Email"
          onBlur={() => setEmailError(validateEmail(email))}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(undefined);
          }}
          placeholder="Email"
          type="email"
          value={email}
        />

        <Button
          className="h-[54px] w-full rounded-[16px] border-sedona-creamLine bg-white px-5 text-base font-bold text-sedona-clay hover:bg-[#FFF8F4] sm:h-[58px]"
          disabled={isSubmitting}
          type="submit"
          variant="outline"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
              Resending...
            </>
          ) : (
            "Resend verification email"
          )}
        </Button>
      </form>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex h-[54px] items-center justify-center rounded-[16px] border border-[#E2D8C8] bg-white px-5 text-sm font-bold text-sedona-stone transition hover:bg-[#FBF7EF] sm:flex-1"
          href={signUpUrl}
        >
          Use a different email
        </Link>
        <Link
          className="inline-flex h-[54px] items-center justify-center rounded-[16px] bg-sedona-pine px-5 text-sm font-bold text-white transition hover:bg-sedona-pineSoft sm:flex-1"
          href={signInUrl}
        >
          Back to sign in
        </Link>
      </div>
    </AuthFormCard>
  );
}
