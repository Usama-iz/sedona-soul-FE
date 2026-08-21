"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, LoaderCircle, MapPinned } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CrisisContextScreenProps = {
  setupData: BackendSetupResponse;
};

type EntryAssessmentResponses = {
  a1BaselineWellbeing?: {
    emotionalSafety?: "yes" | "no" | "sometimes";
    freeOfSuicidalThoughts?: "yes" | "no" | "sometimes";
    freeOfSelfHarmUrges?: "yes" | "no" | "sometimes";
    supportPersonAvailable?: "yes" | "no" | "sometimes";
    sleepingAtLeastFiveHours?: "yes" | "no" | "sometimes";
    eatingAtLeastOneRealMeal?: "yes" | "no" | "sometimes";
    soberAndClearHeaded?: "yes" | "no" | "sometimes";
  };
  a2CoerciveControl?: {
    physicalSafety?: string[];
    controlPatterns?: string[];
    recentEscalation?: string[];
    noneApply?: boolean;
  };
  a4DigitalSafety?: {
    sharedDevice?: boolean;
    browsingHistoryVisible?: boolean;
    sharedCloudAccounts?: boolean;
    locationTracked?: boolean;
    acknowledged?: boolean;
  };
  sectionBCrisisContext?: {
    selections?: string[];
    otherText?: string | null;
  };
};

type EntryAssessmentResponse = {
  id: string | null;
  assessmentType: "phase_1_entry";
  status: "in_progress" | "completed";
  isComplete: boolean;
  responses: EntryAssessmentResponses;
};

type DraftDecision = {
  action: "continue";
  nextSuggestedScreen: "partner_status";
  reasonCode: null;
};

type SaveDraftResponse = {
  entryAssessment: EntryAssessmentResponse;
  decision: DraftDecision;
};

type FinalizeResponse = {
  setup: BackendSetupResponse["setup"];
  entryAssessment: {
    status: "completed";
    isComplete: true;
  };
};

type CrisisSelection = "active_rupture" | "slow_erosion";

const crisisOptions: Array<{
  value: CrisisSelection;
  label: string;
  description: string;
}> = [
  {
    value: "active_rupture",
    label: "Active rupture",
    description: "A recent betrayal, blow-up, or disclosure is shaping the current crisis.",
  },
  {
    value: "slow_erosion",
    label: "Slow erosion",
    description: "Contempt, disconnection, or distance has been building over a longer period.",
  },
];

export function CrisisContextScreen({ setupData }: CrisisContextScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selections, setSelections] = useState<CrisisSelection[]>([]);
  const [otherText, setOtherText] = useState("");
  const [fullResponses, setFullResponses] = useState<EntryAssessmentResponses | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      setIsLoadingDraft(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/setup/entry-assessment", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              data: {
                entryAssessment: EntryAssessmentResponse;
              };
            }
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
              ? payload.error?.message ?? "Unable to load crisis context."
              : "Unable to load crisis context.",
          );
        }

        if (cancelled) {
          return;
        }

        const responses = payload.data.entryAssessment.responses;
        setFullResponses(responses);
        setSelections(
          (responses.sectionBCrisisContext?.selections ?? []).filter(
            (value): value is CrisisSelection =>
              value === "active_rupture" || value === "slow_erosion",
          ),
        );
        setOtherText(responses.sectionBCrisisContext?.otherText ?? "");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unable to load crisis context.";
        setErrorMessage(message);
        toast({
          title: "Step could not load",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsLoadingDraft(false);
        }
      }
    }

    void loadDraft();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  function toggleSelection(value: CrisisSelection) {
    setSelections((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setErrorMessage(null);
  }

  async function handleSaveAndContinue() {
    if (selections.length === 0) {
      setErrorMessage("Select at least one crisis context option before continuing.");
      return;
    }

    if (!fullResponses) {
      setErrorMessage("The earlier assessment data has not loaded yet. Please try again.");
      return;
    }

    setIsSaving(true);
    setIsFinalizing(false);
    setErrorMessage(null);

    try {
      const saveResponse = await fetch("/api/setup/entry-assessment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          responses: {
            sectionBCrisisContext: {
              selections,
              otherText: otherText.trim() || null,
            },
          },
        }),
      });
      const savePayload = (await saveResponse.json().catch(() => null)) as
        | { ok: true; data: SaveDraftResponse }
        | {
            ok: false;
            error?: {
              message?: string;
            };
          }
        | null;

      if (!saveResponse.ok || !savePayload || savePayload.ok === false) {
        throw new Error(
          savePayload && "error" in savePayload
            ? savePayload.error?.message ?? "Unable to save crisis context."
            : "Unable to save crisis context.",
        );
      }

      setIsFinalizing(true);

      const nextResponses: EntryAssessmentResponses = {
        ...fullResponses,
        sectionBCrisisContext: {
          selections,
          otherText: otherText.trim() || null,
        },
      };

      const finalizeResponse = await fetch("/api/setup/entry-assessment/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          responses: nextResponses,
        }),
      });
      const finalizePayload = (await finalizeResponse.json().catch(() => null)) as
        | { ok: true; data: FinalizeResponse }
        | {
            ok: false;
            error?: {
              message?: string;
            };
          }
        | null;

      if (!finalizeResponse.ok || !finalizePayload || finalizePayload.ok === false) {
        throw new Error(
          finalizePayload && "error" in finalizePayload
            ? finalizePayload.error?.message ?? "Unable to finalize entry assessment."
            : "Unable to finalize entry assessment.",
        );
      }

      const nextSetupStep = finalizePayload.data.setup.nextSetupStep;

      if (nextSetupStep && isOnboardingStep(nextSetupStep)) {
        router.push(getOnboardingStepHref(nextSetupStep));
        return;
      }

      if (finalizePayload.data.setup.isComplete) {
        router.push(userAppRoot);
        return;
      }

      throw new Error("Backend did not return the next onboarding step.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Crisis context could not continue",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsFinalizing(false);
    }
  }

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[820px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#DFE7F2] text-sedona-blue">
              <MapPinned aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Entry assessment
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                B. Where Am I In The Crisis
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              Choose the crisis context that fits your situation today. One or both can be true.
            </p>
            <div className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F3E1D6] text-sedona-clay">
                  <AlertCircle aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">
                    This helps route the next phase correctly
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    Active rupture often weights toward Chapter A first. Slow erosion can shift the route later, but both still complete all four Phase 1 chapters.
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
            {crisisOptions.map((option) => {
              const checked = selections.includes(option.value);

              return (
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[16px] border px-4 py-4 text-sm leading-6 transition",
                    checked
                      ? "border-sedona-clay bg-[#FFF8F4] text-sedona-pineSoft"
                      : "border-[#D9CDC0] bg-white text-sedona-stone hover:border-sedona-sage/60",
                  )}
                  key={option.value}
                >
                  <input
                    checked={checked}
                    className="mt-1 h-4 w-4 shrink-0 accent-sedona-clay"
                    onChange={() => toggleSelection(option.value)}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-semibold text-sedona-pineSoft">
                      {option.label}
                    </span>
                    <span className="mt-1 block">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-6 rounded-[20px] border border-[#E2D8C8] bg-white p-5">
            <label className="block text-sm font-semibold text-sedona-pineSoft">
              Optional context
            </label>
            <textarea
              className="mt-3 min-h-[120px] w-full rounded-[16px] border border-[#D9CDC0] bg-[#FBF7EF] px-4 py-3 text-sm leading-6 text-sedona-pineSoft outline-none transition focus:border-sedona-clay"
              onChange={(event) => setOtherText(event.target.value)}
              placeholder="If needed, add a short note about your current crisis context."
              value={otherText}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-sedona-taupe">
              Current backend step: {setupData.setup.currentFlowStep ?? "crisis_context"}
            </p>
            <Button
              className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft"
              disabled={isLoadingDraft || isSaving || isFinalizing}
              onClick={handleSaveAndContinue}
              type="button"
            >
              {isLoadingDraft ? (
                "Loading..."
              ) : isSaving ? (
                "Saving..."
              ) : isFinalizing ? (
                <>
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                "Continue"
              )}
              {!isLoadingDraft && !isSaving && !isFinalizing ? (
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              ) : null}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
