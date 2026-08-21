"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Phone, ShieldAlert } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";

type EntryAssessmentA1ScreenProps = {
  setupData: BackendSetupResponse;
};

type YesNoSometimes = "yes" | "no" | "sometimes";

type EntryAssessmentResponse = {
  id: string | null;
  assessmentType: "phase_1_entry";
  status: "in_progress" | "completed";
  isComplete: boolean;
  responses: {
    a1BaselineWellbeing?: {
      emotionalSafety?: YesNoSometimes;
      freeOfSuicidalThoughts?: YesNoSometimes;
      freeOfSelfHarmUrges?: YesNoSometimes;
      supportPersonAvailable?: YesNoSometimes;
      sleepingAtLeastFiveHours?: YesNoSometimes;
      eatingAtLeastOneRealMeal?: YesNoSometimes;
      soberAndClearHeaded?: YesNoSometimes;
    };
  };
};

type DraftDecision =
  | {
      action: "continue";
      nextSuggestedScreen: "entry_assessment_a2";
      reasonCode: null;
    }
  | {
      action: "stop_and_route";
      nextSuggestedScreen: "suicidality_self_harm_gate" | "active_addiction_gate";
      reasonCode:
        | "entry_assessment_g3_suicidal_thoughts"
        | "entry_assessment_g3_self_harm_urges"
        | "entry_assessment_g4_active_addiction";
    };

type SaveDraftResponse = {
  entryAssessment: EntryAssessmentResponse;
  decision: DraftDecision;
};

type SafetyResource = {
  id: string;
  title: string;
  description: string;
  phone: string | null;
  textInstruction: string | null;
  url: string | null;
  category: "emergency" | "crisis" | "domestic_violence" | "digital_safety";
  priority: number;
};

const questionLabels: Array<{
  id: keyof NonNullable<EntryAssessmentResponse["responses"]["a1BaselineWellbeing"]>;
  label: string;
}> = [
  { id: "emotionalSafety", label: "I feel emotionally safe enough to think clearly" },
  { id: "freeOfSuicidalThoughts", label: "I am free of suicidal thoughts" },
  { id: "freeOfSelfHarmUrges", label: "I am free of urges to harm myself" },
  { id: "supportPersonAvailable", label: "I have at least one person I could call right now if I needed support" },
  { id: "sleepingAtLeastFiveHours", label: "I am sleeping at least 5 hours most nights" },
  { id: "eatingAtLeastOneRealMeal", label: "I am eating at least one real meal most days" },
  { id: "soberAndClearHeaded", label: "I am sober and clear-headed most of the time" },
];

const choiceOptions: YesNoSometimes[] = ["yes", "no", "sometimes"];

const gateCopy = {
  active_addiction_gate: {
    title: "Professional support comes first",
    description:
      "The workbook pauses here if sobriety is not stable today. Regulation can still help, but deeper workbook progress should wait for support.",
    resourceIds: [] as readonly string[],
  },
  suicidality_self_harm_gate: {
    title: "Your safety comes first",
    description:
      "If there are suicidal thoughts or self-harm risk, the correct next step is support and crisis resources before workbook work continues.",
    resourceIds: ["suicide_crisis_lifeline", "immediate_danger"] as readonly string[],
  },
} as const;

export function EntryAssessmentA1Screen({
  setupData,
}: EntryAssessmentA1ScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<
    Partial<Record<(typeof questionLabels)[number]["id"], YesNoSometimes>>
  >({});
  const [resources, setResources] = useState<SafetyResource[]>([]);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<(typeof questionLabels)[number]["id"], string>>
  >({});
  const [gateScreen, setGateScreen] = useState<
    "suicidality_self_harm_gate" | "active_addiction_gate" | null
  >(null);

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
              ? payload.error?.message ?? "Unable to load the entry assessment."
              : "Unable to load the entry assessment.",
          );
        }

        if (cancelled) {
          return;
        }

        setValues(payload.data.entryAssessment.responses.a1BaselineWellbeing ?? {});
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load the entry assessment.";
        setErrorMessage(message);
        toast({
          title: "Assessment could not load",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsLoadingDraft(false);
        }
      }
    }

    async function loadSafetyResources() {
      try {
        const response = await fetch("/api/safety/resources", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              data: {
                resources: SafetyResource[];
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
              ? payload.error?.message ?? "Unable to load safety resources."
              : "Unable to load safety resources.",
          );
        }

        if (!cancelled) {
          setResources(payload.data.resources);
        }
      } catch (error) {
        if (!cancelled) {
          setResourcesError(
            error instanceof Error
              ? error.message
              : "Unable to load safety resources.",
          );
        }
      }
    }

    void loadDraft();
    void loadSafetyResources();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const visibleGateResources = useMemo(() => {
    if (!gateScreen) {
      return [];
    }

    return resources.filter((resource) =>
      gateCopy[gateScreen].resourceIds.length === 0
        ? resource.category === "crisis"
        : gateCopy[gateScreen].resourceIds.includes(resource.id),
    );
  }, [gateScreen, resources]);

  function validateForm() {
    const nextErrors: Partial<
      Record<(typeof questionLabels)[number]["id"], string>
    > = {};

    for (const question of questionLabels) {
      if (!values[question.id]) {
        nextErrors[question.id] = "Choose yes, no, or sometimes.";
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSaveAndContinue() {
    if (!validateForm()) {
      setErrorMessage("Answer each question before continuing.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setGateScreen(null);

    try {
      const response = await fetch("/api/setup/entry-assessment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          responses: {
            a1BaselineWellbeing: values,
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: SaveDraftResponse }
        | {
            ok: false;
            error?: {
              message?: string;
              details?: Array<{
                path?: Array<string | number>;
                message?: string;
              }>;
            };
          }
        | null;

      if (!response.ok || !payload || payload.ok === false) {
        if (
          payload &&
          "error" in payload &&
          Array.isArray(payload.error?.details)
        ) {
          const nextErrors: Partial<
            Record<(typeof questionLabels)[number]["id"], string>
          > = {};

          for (const issue of payload.error.details) {
            const maybeField = issue.path?.at(-1);

            if (
              typeof maybeField === "string" &&
              questionLabels.some((question) => question.id === maybeField)
            ) {
              nextErrors[maybeField as (typeof questionLabels)[number]["id"]] =
                issue.message ?? "Please review this answer.";
            }
          }

          if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
          }
        }

        throw new Error(
          payload && "error" in payload
            ? payload.error?.message ?? "Unable to save the assessment."
            : "Unable to save the assessment.",
        );
      }

      const decision = payload.data.decision;

      if (decision.action === "continue") {
        router.push(getOnboardingStepHref("entry_assessment_a2"));
        return;
      }

      if (decision.action === "stop_and_route") {
        setGateScreen(decision.nextSuggestedScreen);
        return;
      }

      throw new Error("Backend returned an unexpected assessment decision.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Assessment could not continue",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (gateScreen) {
    return (
      <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[760px]">
          <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#FFF1E8] text-sedona-clay">
                <ShieldAlert aria-hidden="true" className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                  Safety first
                </p>
                <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                  {gateCopy[gateScreen].title}
                </h1>
              </div>
            </div>

            <p className="mt-6 text-sm leading-7 text-sedona-stone sm:text-base">
              {gateCopy[gateScreen].description}
            </p>

            <div className="mt-6 space-y-3">
              {visibleGateResources.map((resource) => (
                <div
                  className="rounded-[20px] border border-[#EAC7B7] bg-[#FFF8F4] p-4"
                  key={resource.id}
                >
                  <p className="font-semibold text-sedona-pineSoft">{resource.title}</p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    {resource.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-sedona-clay">
                    {resource.phone ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                        <Phone aria-hidden="true" className="h-4 w-4" />
                        {resource.phone}
                      </span>
                    ) : null}
                    {resource.textInstruction ? (
                      <span className="inline-flex rounded-full bg-white px-3 py-2">
                        {resource.textInstruction}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {resourcesError ? (
              <div className="mt-6">
                <AuthFormAlert message={resourcesError} variant="error" />
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft sm:flex-1"
                onClick={() => setGateScreen(null)}
                type="button"
              >
                Review my answers
              </Button>
              <Button
                className="h-12 rounded-[16px] border-[#E2D8C8] bg-white px-6 text-sm font-bold text-sedona-stone hover:bg-[#FBF7EF] sm:flex-1"
                onClick={() => router.push(userAppRoot)}
                type="button"
                variant="outline"
              >
                Return for now
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[760px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#E8ECF5] text-sedona-blue">
              <AlertTriangle aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Entry assessment
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                A.1 Baseline Wellbeing
              </h1>
            </div>
          </div>

          <p className="mt-6 text-sm leading-7 text-sedona-stone sm:text-base">
            Answer each item honestly using yes, no, or sometimes. This helps establish a calm baseline before the rest of Phase 1.
          </p>

          {errorMessage ? (
            <div className="mt-6">
              <AuthFormAlert message={errorMessage} variant="error" />
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            {questionLabels.map((question) => (
              <fieldset
                className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-4"
                key={question.id}
              >
                <legend className="px-2 text-sm font-semibold leading-6 text-sedona-pineSoft">
                  {question.label}
                </legend>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {choiceOptions.map((option) => {
                    const checked = values[question.id] === option;

                    return (
                      <label
                        className={`flex-1 cursor-pointer rounded-[16px] border px-4 py-3 text-sm font-semibold transition ${
                          checked
                            ? "border-sedona-clay bg-[#FFF8F4] text-sedona-pineSoft"
                            : "border-[#D9CDC0] bg-white text-sedona-stone hover:border-sedona-sage/60"
                        }`}
                        key={option}
                      >
                        <input
                          checked={checked}
                          className="sr-only"
                          name={question.id}
                          onChange={() => {
                            setValues((current) => ({
                              ...current,
                              [question.id]: option,
                            }));
                            setFieldErrors((current) => ({
                              ...current,
                              [question.id]: undefined,
                            }));
                          }}
                          type="radio"
                          value={option}
                        />
                        <span className="capitalize">{option}</span>
                      </label>
                    );
                  })}
                </div>
                {fieldErrors[question.id] ? (
                  <p className="mt-2 text-xs font-semibold text-sedona-clay">
                    {fieldErrors[question.id]}
                  </p>
                ) : null}
              </fieldset>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-sedona-taupe">
              Current backend step: {setupData.setup.currentFlowStep ?? "entry_assessment_a1"}
            </p>
            <Button
              className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft"
              disabled={isSaving || isLoadingDraft}
              onClick={handleSaveAndContinue}
              type="button"
            >
              {isLoadingDraft ? "Loading..." : isSaving ? "Saving..." : "Continue"}
              {!isLoadingDraft && !isSaving ? (
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              ) : null}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
