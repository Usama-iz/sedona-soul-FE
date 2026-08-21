"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, PauseCircle, ShieldAlert } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendPartnerSafetyForkResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PartnerSafetyForkScreenProps = {
  partnerSafetyForkData: BackendPartnerSafetyForkResponse;
};

type ChoiceKey = "continue_solo" | "pause_entirely" | "just_resources";

type SaveForkResponse = {
  setup: BackendPartnerSafetyForkResponse["setup"];
  partnerSafetyFork: BackendPartnerSafetyForkResponse["partnerSafetyFork"];
};

const triggerReasonLabels: Record<string, string> = {
  entry_assessment_g1_physical_safety: "Physical safety concern",
  entry_assessment_g2_coercive_control: "Coercive control concern",
  entry_assessment_g2_escalation: "Escalation concern",
};

const choiceToneClasses: Record<ChoiceKey, string> = {
  continue_solo: "border-sedona-sage/50 bg-[#F3FAF4] text-sedona-pineSoft",
  pause_entirely: "border-[#EAC7B7] bg-[#FFF8F4] text-sedona-pineSoft",
  just_resources: "border-[#E2D8C8] bg-white text-sedona-pineSoft",
};

export function PartnerSafetyForkScreen({
  partnerSafetyForkData,
}: PartnerSafetyForkScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [resourcesAcknowledged, setResourcesAcknowledged] = useState(
    partnerSafetyForkData.partnerSafetyFork.resourcesAcknowledged,
  );
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isSubmittingChoice, setIsSubmittingChoice] = useState<ChoiceKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supportLoopMode, setSupportLoopMode] = useState(
    partnerSafetyForkData.partnerSafetyFork.outcome === "support_loop",
  );
  const [currentOutcome, setCurrentOutcome] = useState(
    partnerSafetyForkData.partnerSafetyFork.outcome,
  );

  const triggerLabel = useMemo(() => {
    const reasonCode = partnerSafetyForkData.partnerSafetyFork.triggerReasonCode;

    if (!reasonCode) {
      return "Safety concern";
    }

    return triggerReasonLabels[reasonCode] ?? reasonCode;
  }, [partnerSafetyForkData.partnerSafetyFork.triggerReasonCode]);

  async function handleAcknowledgeResources() {
    setIsAcknowledging(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/setup/partner-safety-fork", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourcesAcknowledged: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: SaveForkResponse }
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
            ? payload.error?.message ?? "Unable to acknowledge the resources."
            : "Unable to acknowledge the resources.",
        );
      }

      setResourcesAcknowledged(
        payload.data.partnerSafetyFork.resourcesAcknowledged,
      );
      toast({
        title: "Resources acknowledged",
        description: "You can now choose how to continue.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Could not continue",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAcknowledging(false);
    }
  }

  async function handleChoice(choice: ChoiceKey) {
    setIsSubmittingChoice(choice);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/setup/partner-safety-fork", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          resourcesAcknowledged
            ? { choice }
            : { resourcesAcknowledged: true, choice },
        ),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: SaveForkResponse }
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
            ? payload.error?.message ?? "Unable to save your choice."
            : "Unable to save your choice.",
        );
      }

      setResourcesAcknowledged(
        payload.data.partnerSafetyFork.resourcesAcknowledged,
      );
      setCurrentOutcome(payload.data.partnerSafetyFork.outcome);

      const nextSetupStep = payload.data.setup.nextSetupStep;

      if (
        choice === "continue_solo" &&
        nextSetupStep &&
        isOnboardingStep(nextSetupStep)
      ) {
        router.push(getOnboardingStepHref(nextSetupStep));
        return;
      }

      setSupportLoopMode(true);
      toast({
        title:
          choice === "continue_solo"
            ? "Solo path selected"
            : "Safety hold saved",
        description:
          choice === "continue_solo"
            ? "We are moving you into the solo path."
            : "Workbook progress is paused while you focus on safety and support.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Choice could not be saved",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingChoice(null);
    }
  }

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[820px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#FFF1E8] text-sedona-clay">
              {supportLoopMode ? (
                <PauseCircle aria-hidden="true" className="h-7 w-7" />
              ) : (
                <ShieldAlert aria-hidden="true" className="h-7 w-7" />
              )}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Safety first
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                {supportLoopMode
                  ? "Pause and focus on safety"
                  : "Partner-Sourced Safety Fork"}
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              This is different from ordinary conflict. Based on what you shared,
              safety support comes first before normal workbook progression.
            </p>
            <div className="rounded-[20px] border border-[#EAC7B7] bg-[#FFF8F4] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sedona-clay">
                Trigger
              </p>
              <p className="mt-2 font-semibold text-sedona-pineSoft">
                {triggerLabel}
              </p>
              {currentOutcome ? (
                <p className="mt-2 text-sm leading-6 text-sedona-stone">
                  Current backend outcome:{" "}
                  <span className="font-semibold text-sedona-pineSoft">
                    {currentOutcome}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-6">
              <AuthFormAlert message={errorMessage} variant="error" />
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            {partnerSafetyForkData.partnerSafetyFork.resources.map((resource) => (
              <div
                className="rounded-[20px] border border-[#EAC7B7] bg-[#FFF8F4] p-5"
                key={resource.id}
              >
                <p className="font-semibold text-sedona-pineSoft">
                  {resource.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-sedona-stone">
                  {resource.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-sedona-clay">
                  {resource.phone ? (
                    <span className="inline-flex rounded-full bg-white px-3 py-2">
                      {resource.phone}
                    </span>
                  ) : null}
                  {resource.textInstruction ? (
                    <span className="inline-flex rounded-full bg-white px-3 py-2">
                      {resource.textInstruction}
                    </span>
                  ) : null}
                  {resource.url ? (
                    <a
                      className="inline-flex rounded-full bg-white px-3 py-2 underline underline-offset-4"
                      href={resource.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open resource
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {!resourcesAcknowledged ? (
            <div className="mt-6">
              <Button
                className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft"
                disabled={isAcknowledging}
                onClick={handleAcknowledgeResources}
                type="button"
              >
                {isAcknowledging ? "Saving..." : "I have reviewed these resources"}
                {!isAcknowledging ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
              </Button>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {partnerSafetyForkData.partnerSafetyFork.choices.map((choice) => {
              const isLoading = isSubmittingChoice === choice.key;

              return (
                <button
                  className={cn(
                    "rounded-[18px] border px-4 py-4 text-left transition",
                    choiceToneClasses[choice.key],
                    !resourcesAcknowledged &&
                      "cursor-not-allowed opacity-60",
                  )}
                  disabled={!resourcesAcknowledged || isSubmittingChoice !== null}
                  key={choice.key}
                  onClick={() => handleChoice(choice.key)}
                  type="button"
                >
                  <p className="font-semibold">{choice.label}</p>
                  <p className="mt-2 text-sm leading-6 text-sedona-stone">
                    {choice.key === "continue_solo"
                      ? "Continue on your own, skip the normal partner path, and move into solo acknowledgment."
                      : choice.key === "pause_entirely"
                        ? "Pause workbook progression and focus on safety first."
                        : "Stay here with the resources and return when you are ready."}
                  </p>
                  <div className="mt-3 text-sm font-bold text-sedona-clay">
                    {isLoading ? "Saving..." : "Select"}
                  </div>
                </button>
              );
            })}
          </div>

          {supportLoopMode ? (
            <div className="mt-6 rounded-[20px] border border-[#EAC7B7] bg-[#FFF8F4] p-5">
              <p className="font-semibold text-sedona-pineSoft">
                Progress is paused for now
              </p>
              <p className="mt-2 text-sm leading-6 text-sedona-stone">
                The backend is holding this user in the partner-safety route.
                Normal onboarding will not continue until the workflow changes.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft sm:flex-1"
                  onClick={() => router.push(userAppRoot)}
                  type="button"
                >
                  Return for now
                </Button>
                <Button
                  className="h-12 rounded-[16px] border-[#E2D8C8] bg-white px-6 text-sm font-bold text-sedona-stone hover:bg-[#FBF7EF] sm:flex-1"
                  onClick={() => router.refresh()}
                  type="button"
                  variant="outline"
                >
                  Refresh this safety state
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
