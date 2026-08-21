"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";

type SoloAcknowledgmentScreenProps = {
  setupData: BackendSetupResponse;
};

type CompleteStepResponse = {
  setup: BackendSetupResponse["setup"];
};

export function SoloAcknowledgmentScreen({
  setupData,
}: SoloAcknowledgmentScreenProps) {
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
          step: "solo_acknowledgment",
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
        error instanceof Error ? error.message : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Solo path could not continue",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[820px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#E4EFE8] text-sedona-sage">
              <HeartHandshake aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Solo path
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                Solo Work Is Real Work
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              Doing this work alone does not make it lesser work. It is still real,
              meaningful effort, and it can still shift the field around you.
            </p>
            <div className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F3E1D6] text-sedona-clay">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">
                    Solo work is not martyrdom
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    It does not mean tolerating harm or doing your work and your partner’s work while pretending everything is fine.
                  </p>
                </div>
              </div>
            </div>
            <p>
              This path honors the reality that you may be the only one in the room right now,
              and it still leads into real support and structure.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-6">
              <AuthFormAlert message={errorMessage} variant="error" />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-sedona-taupe">
              Current backend step: {setupData.setup.currentFlowStep ?? "solo_acknowledgment"}
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
