"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type EntryAssessmentA2ScreenProps = {
  setupData: BackendSetupResponse;
};

type EntryAssessmentA2Response = {
  id: string | null;
  assessmentType: "phase_1_entry";
  status: "in_progress" | "completed";
  isComplete: boolean;
  responses: {
    a2CoerciveControl?: {
      physicalSafety?: string[];
      controlPatterns?: string[];
      recentEscalation?: string[];
      noneApply?: boolean;
    };
  };
};

type DraftDecision =
  | {
      action: "continue";
      nextSuggestedScreen: "entry_assessment_a4_digital";
      reasonCode: null;
    }
  | {
      action: "stop_and_route";
      nextSuggestedScreen: "partner_safety_fork";
      reasonCode:
        | "entry_assessment_g1_physical_safety"
        | "entry_assessment_g2_coercive_control"
        | "entry_assessment_g2_escalation";
    };

type SaveDraftResponse = {
  entryAssessment: EntryAssessmentA2Response;
  decision: DraftDecision;
};

type SafetyQuestionGroup = {
  description?: string;
  id: "physicalSafety" | "controlPatterns" | "recentEscalation";
  items: Array<{
    key: string;
    label: string;
    urgent?: boolean;
  }>;
  title: string;
};

const safetyGroups: SafetyQuestionGroup[] = [
  {
    id: "physicalSafety",
    title: "Physical Safety",
    items: [
      {
        key: "hurt_physically",
        label:
          "My partner has hurt me physically (hit, pushed, shoved, choked, restrained, thrown something at me)",
      },
      {
        key: "threatened_physical",
        label: "My partner has threatened to hurt me physically",
      },
      {
        key: "hidden_injuries",
        label: "My partner has hurt me in ways I've hidden from friends or family",
      },
      {
        key: "weapon_feared",
        label: "There is a weapon in the home I fear could be used against me",
      },
      {
        key: "strangulation",
        label:
          "My partner has ever put hands around my neck or restricted my breathing",
        urgent: true,
      },
    ],
  },
  {
    id: "controlPatterns",
    title: "Control Patterns",
    items: [
      {
        key: "controls_money",
        label:
          "My partner controls or monitors my money, spending, or bank accounts",
      },
      {
        key: "tracks_location",
        label:
          "My partner tracks my location or reads my messages without permission",
      },
      {
        key: "isolates_me",
        label: "My partner has isolated me from friends or family",
      },
      {
        key: "intimidation",
        label:
          "My partner uses intimidation to get what they want (raised voice, threats, breaking things, punching walls)",
      },
      {
        key: "afraid_to_disagree",
        label: "I feel afraid to disagree with my partner",
      },
      {
        key: "threats_leverage",
        label:
          "My partner has threatened divorce, taking children, deportation, or hurting themselves if I don't comply",
      },
    ],
  },
  {
    id: "recentEscalation",
    title: "Recent Escalation",
    description:
      "These can amplify urgency when paired with physical safety or coercion concerns.",
    items: [
      {
        key: "worse_past_year",
        label: "These behaviors have gotten worse in the past year",
      },
      {
        key: "worse_since_talking",
        label:
          "These behaviors have gotten worse since we started talking about problems or separation",
      },
      {
        key: "most_afraid_ever",
        label: "I am currently more afraid than I've ever been",
      },
    ],
  },
];

type GroupSelections = Record<SafetyQuestionGroup["id"], string[]>;

const emptySelections: GroupSelections = {
  physicalSafety: [],
  controlPatterns: [],
  recentEscalation: [],
};

export function EntryAssessmentA2Screen({
  setupData,
}: EntryAssessmentA2ScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selections, setSelections] = useState<GroupSelections>(emptySelections);
  const [noneApply, setNoneApply] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      setIsLoadingDraft(true);
      setScreenError(null);

      try {
        const response = await fetch("/api/setup/entry-assessment", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              data: {
                entryAssessment: EntryAssessmentA2Response;
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
              ? payload.error?.message ?? "Unable to load the assessment."
              : "Unable to load the assessment.",
          );
        }

        if (cancelled) {
          return;
        }

        const saved = payload.data.entryAssessment.responses.a2CoerciveControl;

        if (!saved) {
          return;
        }

        setSelections({
          physicalSafety: saved.physicalSafety ?? [],
          controlPatterns: saved.controlPatterns ?? [],
          recentEscalation: saved.recentEscalation ?? [],
        });
        setNoneApply(Boolean(saved.noneApply));
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load the assessment.";

        setScreenError(message);
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

    void loadDraft();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const totalSelectedCount = useMemo(
    () =>
      selections.physicalSafety.length +
      selections.controlPatterns.length +
      selections.recentEscalation.length,
    [selections],
  );

  function toggleSelection(groupId: SafetyQuestionGroup["id"], value: string) {
    setSelections((current) => {
      const currentGroup = current[groupId];
      const exists = currentGroup.includes(value);
      const nextGroup = exists
        ? currentGroup.filter((item) => item !== value)
        : [...currentGroup, value];

      return {
        ...current,
        [groupId]: nextGroup,
      };
    });
    setNoneApply(false);
    setErrorMessage(null);
  }

  function validateState() {
    if (noneApply) {
      return true;
    }

    if (totalSelectedCount === 0) {
      setErrorMessage("Select any items that apply, or choose “None of these apply.”");
      return false;
    }

    return true;
  }

  async function handleSaveAndContinue() {
    if (!validateState()) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/setup/entry-assessment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          responses: {
            a2CoerciveControl: {
              physicalSafety: noneApply ? [] : selections.physicalSafety,
              controlPatterns: noneApply ? [] : selections.controlPatterns,
              recentEscalation: noneApply ? [] : selections.recentEscalation,
              noneApply,
            },
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: SaveDraftResponse }
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
            ? payload.error?.message ?? "Unable to save the assessment."
            : "Unable to save the assessment.",
        );
      }

      const decision = payload.data.decision;

      if (decision.action === "continue") {
        router.push(getOnboardingStepHref("entry_assessment_a4_digital"));
        return;
      }

      if (
        decision.action === "stop_and_route" &&
        decision.nextSuggestedScreen === "partner_safety_fork"
      ) {
        router.push(getOnboardingStepHref("partner_safety_fork"));
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

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[820px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#FFF1E8] text-sedona-clay">
              <ShieldAlert aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Entry assessment
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                A.2 The Coercive Control Screen
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              The workbook is clear: if you are experiencing abuse, coercion, or threats,
              qualified help comes before relationship tools.
            </p>
            <div className="rounded-[20px] border border-[#EAC7B7] bg-[#FFF8F4] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F3E1D6] text-sedona-clay">
                  <AlertTriangle aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">No shame, just data</p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    Check anything that applies. No one is grading you, and this does not mean
                    you have done anything wrong.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {screenError ? (
            <div className="mt-6">
              <AuthFormAlert message={screenError} variant="error" />
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6">
              <AuthFormAlert message={errorMessage} variant="error" />
            </div>
          ) : null}

          <div className="mt-6 space-y-5">
            {safetyGroups.map((group) => (
              <section
                className="rounded-[22px] border border-[#E2D8C8] bg-[#FBF7EF] p-5"
                key={group.id}
              >
                <h2 className="font-semibold text-sedona-pineSoft">{group.title}</h2>
                {group.description ? (
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    {group.description}
                  </p>
                ) : null}

                <div className="mt-4 space-y-3">
                  {group.items.map((item) => {
                    const checked = selections[group.id].includes(item.key);

                    return (
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-[16px] border px-4 py-3 text-sm leading-6 transition",
                          checked
                            ? "border-sedona-clay bg-[#FFF8F4] text-sedona-pineSoft"
                            : "border-[#D9CDC0] bg-white text-sedona-stone hover:border-sedona-sage/60",
                        )}
                        key={item.key}
                      >
                        <input
                          checked={checked}
                          className="mt-1 h-4 w-4 shrink-0 accent-sedona-clay"
                          onChange={() => toggleSelection(group.id, item.key)}
                          type="checkbox"
                        />
                        <span>
                          {item.label}
                          {item.urgent ? (
                            <span className="ml-2 rounded-full bg-[#FFF1E8] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-sedona-clay">
                              Urgent
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-5 rounded-[20px] border border-[#E2D8C8] bg-white p-5">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-sedona-stone">
              <input
                checked={noneApply}
                className="mt-1 h-4 w-4 shrink-0 accent-sedona-clay"
                onChange={(event) => {
                  const checked = event.target.checked;
                  setNoneApply(checked);
                  setErrorMessage(null);

                  if (checked) {
                    setSelections(emptySelections);
                  }
                }}
                type="checkbox"
              />
              <span>
                None of these apply
              </span>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-sedona-taupe">
              Current backend step: {setupData.setup.currentFlowStep ?? "entry_assessment_a2"}
            </p>
            <Button
              className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft"
              disabled={isLoadingDraft || isSaving}
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
