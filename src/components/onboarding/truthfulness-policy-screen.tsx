"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, HeartHandshake, ShieldAlert } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";

type TruthfulnessPolicyScreenProps = {
  setupData: BackendSetupResponse;
};

type CompleteStepResponse = {
  setup: BackendSetupResponse["setup"];
};

export function TruthfulnessPolicyScreen({
  setupData,
}: TruthfulnessPolicyScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleContinue() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/setup/steps/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "truthfulness_policy",
          metadata: {
            source: "richard_v2_1_setup",
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: CompleteStepResponse }
        | {
            ok: false;
            error?: {
              code?: string;
              message?: string;
            };
          }
        | null;

      if (!response.ok || !payload || payload.ok === false) {
        throw new Error(
          payload && "error" in payload
            ? payload.error?.message ?? "Unable to continue setup."
            : "Unable to continue setup.",
        );
      }

      const nextSetupStep = payload.data.setup.nextSetupStep;

      if (nextSetupStep && isOnboardingStep(nextSetupStep)) {
        router.push(getOnboardingStepHref(nextSetupStep));
        return;
      }

      if (payload.data.setup.isComplete) {
        router.push(userAppRoot);
        return;
      }

      throw new Error("Backend did not return the next onboarding step.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Setup could not continue",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[760px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#F3E1D6] text-sedona-clay">
              <HeartHandshake aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Phase 1 setup
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                Answering Truthfully
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-5 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              One important thing before we begin. This work only helps if your
              answers are honest, especially the safety questions.
            </p>
            <p>
              They are not a test to pass. They are how we keep you safe. If
              something is not safe, saying so plainly is what helps us route
              you to the right support.
            </p>
            <div className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#FFF1E8] text-sedona-clay">
                  <ShieldAlert aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">
                    This is care, not interrogation
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    No one is grading you here. Truthful answers make the
                    experience safer and more useful for you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-6">
              <AuthFormAlert message={errorMessage} variant="error" />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-sedona-taupe">
              Current backend step: {setupData.setup.currentFlowStep ?? "truthfulness_policy"}
            </p>
            <Button
              className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft"
              disabled={isSubmitting}
              onClick={handleContinue}
              type="button"
            >
              {isSubmitting ? "Saving..." : "I understand"}
              {!isSubmitting ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
