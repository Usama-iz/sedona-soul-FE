"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, HeartHandshake, Users } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PartnerStatusScreenProps = {
  setupData: BackendSetupResponse;
};

type PartnerStatusOption =
  | "together"
  | "solo_partner_disengaged"
  | "solo_separated"
  | "solo_preparing";

type CompleteStepResponse = {
  setup: BackendSetupResponse["setup"];
};

const partnerStatusOptions: Array<{
  value: PartnerStatusOption;
  label: string;
  description: string;
}> = [
  {
    value: "together",
    label: "We’re both doing this work",
    description: "Your partner is actively participating in the process with you.",
  },
  {
    value: "solo_partner_disengaged",
    label: "I’m doing this alone — my partner isn’t participating",
    description: "You want to continue, but your partner is not engaged right now.",
  },
  {
    value: "solo_separated",
    label: "I’m doing this alone — we’re separated",
    description: "You are currently doing this work from a separated relationship state.",
  },
  {
    value: "solo_preparing",
    label: "I’m single or preparing for what comes next",
    description: "You are doing this for your own clarity and what comes next in your life.",
  },
];

export function PartnerStatusScreen({ setupData }: PartnerStatusScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<PartnerStatusOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleContinue() {
    if (!selectedStatus) {
      setErrorMessage("Choose the option that best matches your current partner situation.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/setup/steps/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "partner_status",
          flowContext: {
            partnerStatus: selectedStatus,
          },
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
            ? payload.error?.message ?? "Unable to save partner status."
            : "Unable to save partner status.",
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
        title: "Partner status could not continue",
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
              <Users aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Partner routing
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                Partner Engagement Status
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              Tell us whether your partner is part of this process too. This is one of the
              strongest routing signals in Phase 1.
            </p>
            <div className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F3E1D6] text-sedona-clay">
                  <HeartHandshake aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">
                    This changes the path, not your worth
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    If your partner is not participating, you can still continue on a valid solo path.
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

          <div className="mt-6 space-y-3">
            {partnerStatusOptions.map((option) => {
              const selected = selectedStatus === option.value;

              return (
                <button
                  className={cn(
                    "w-full rounded-[18px] border px-4 py-4 text-left transition",
                    selected
                      ? "border-sedona-clay bg-[#FFF8F4] text-sedona-pineSoft"
                      : "border-[#D9CDC0] bg-white text-sedona-stone hover:border-sedona-sage/60",
                  )}
                  key={option.value}
                  onClick={() => {
                    setSelectedStatus(option.value);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  <p className="font-semibold text-sedona-pineSoft">{option.label}</p>
                  <p className="mt-2 text-sm leading-6">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-sedona-taupe">
              Current backend step: {setupData.setup.currentFlowStep ?? "partner_status"}
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
