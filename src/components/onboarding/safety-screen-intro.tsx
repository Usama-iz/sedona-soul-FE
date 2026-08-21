"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";

type BeforeWeBeginScreenProps = {
  setupData: BackendSetupResponse;
};

type CompleteStepResponse = {
  setup: BackendSetupResponse["setup"];
};

export function SafetyScreenIntro({ setupData }: BeforeWeBeginScreenProps) {
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
          step: "safety_screen_intro",
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
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#E4EFE8] text-sedona-sage">
              <ShieldCheck aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Phase 1 setup
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                Before We Begin
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-5 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              Before any workbook or relationship work begins, we start with a few calm safety questions.
              This is not a test to pass. It is how we make sure today is safe enough to continue.
            </p>
            <p>
              There are no right answers here, and there is no shame in needing support. Honest answers help
              us guide you to the correct next step instead of rushing you forward.
            </p>
            <div className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F3E1D6] text-sedona-clay">
                  <AlertCircle aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">No shame. Just data.</p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    If something is not safe today, the app will help you pause and move toward the right support first.
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
              Current backend step: {setupData.setup.currentFlowStep ?? "safety_screen_intro"}
            </p>
            <Button
              className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft"
              disabled={isSubmitting}
              onClick={handleContinue}
              type="button"
            >
              {isSubmitting ? "Saving..." : "Continue"}
              {!isSubmitting ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
