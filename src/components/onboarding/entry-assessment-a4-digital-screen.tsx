"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, ShieldAlert } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type {
  BackendSetupResponse,
} from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type EntryAssessmentA4DigitalScreenProps = {
  setupData: BackendSetupResponse;
};

type EntryAssessmentA4Response = {
  id: string | null;
  assessmentType: "phase_1_entry";
  status: "in_progress" | "completed";
  isComplete: boolean;
  responses: {
    a4DigitalSafety?: {
      sharedDevice?: boolean;
      browsingHistoryVisible?: boolean;
      sharedCloudAccounts?: boolean;
      locationTracked?: boolean;
      acknowledged?: boolean;
    };
  };
};

type DraftDecision =
  | {
      action: "continue";
      nextSuggestedScreen: "crisis_context";
      reasonCode: null;
    }
  | {
      action: "show_advisory";
      nextSuggestedScreen: "digital_safety_advisory";
      reasonCode: "entry_assessment_g5_digital_safety";
    };

type SaveDraftResponse = {
  entryAssessment: EntryAssessmentA4Response;
  decision: DraftDecision;
};

type DigitalSafetyField =
  | "sharedDevice"
  | "browsingHistoryVisible"
  | "sharedCloudAccounts"
  | "locationTracked";

const digitalSafetyItems: Array<{
  id: DigitalSafetyField;
  label: string;
}> = [
  {
    id: "sharedDevice",
    label: "This app is on a device my partner can access",
  },
  {
    id: "browsingHistoryVisible",
    label: "My browsing history is visible to my partner",
  },
  {
    id: "sharedCloudAccounts",
    label: "Cloud accounts (Google, iCloud, iMessage) are shared with my partner",
  },
  {
    id: "locationTracked",
    label: "My partner tracks my location",
  },
];

const emptyValues: Record<DigitalSafetyField, boolean> = {
  sharedDevice: false,
  browsingHistoryVisible: false,
  sharedCloudAccounts: false,
  locationTracked: false,
};

export function EntryAssessmentA4DigitalScreen({
  setupData,
}: EntryAssessmentA4DigitalScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<DigitalSafetyField, boolean>>(emptyValues);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvisory, setShowAdvisory] = useState(false);

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
                entryAssessment: EntryAssessmentA4Response;
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
              ? payload.error?.message ?? "Unable to load the digital safety step."
              : "Unable to load the digital safety step.",
          );
        }

        if (cancelled) {
          return;
        }

        const saved = payload.data.entryAssessment.responses.a4DigitalSafety;

        if (!saved) {
          return;
        }

        setValues({
          sharedDevice: Boolean(saved.sharedDevice),
          browsingHistoryVisible: Boolean(saved.browsingHistoryVisible),
          sharedCloudAccounts: Boolean(saved.sharedCloudAccounts),
          locationTracked: Boolean(saved.locationTracked),
        });
        setAcknowledged(Boolean(saved.acknowledged));
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load the digital safety step.";

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

  const hasConcern = useMemo(
    () => digitalSafetyItems.some((item) => values[item.id]),
    [values],
  );

  function updateValue(field: DigitalSafetyField, checked: boolean) {
    setValues((current) => ({
      ...current,
      [field]: checked,
    }));
    setErrorMessage(null);
  }

  async function saveDraft(options?: { acknowledgedOverride?: boolean }) {
    const nextAcknowledged =
      options?.acknowledgedOverride !== undefined
        ? options.acknowledgedOverride
        : acknowledged;

    const response = await fetch("/api/setup/entry-assessment", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        responses: {
          a4DigitalSafety: {
            ...values,
            acknowledged: nextAcknowledged,
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
          ? payload.error?.message ?? "Unable to save the digital safety step."
          : "Unable to save the digital safety step.",
      );
    }

    return payload.data;
  }

  async function routeFromDecision(
    decision: DraftDecision,
    acknowledgedState: boolean,
  ) {
    if (decision.action === "continue") {
      router.push(getOnboardingStepHref("crisis_context"));
      return;
    }

    if (
      decision.action === "show_advisory" &&
      decision.nextSuggestedScreen === "digital_safety_advisory"
    ) {
      if (acknowledgedState) {
        router.push(getOnboardingStepHref("crisis_context"));
        return;
      }

      setShowAdvisory(true);
      return;
    }

    throw new Error("Backend returned an unexpected digital safety decision.");
  }

  async function handleSaveAndContinue() {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const data = await saveDraft();
      await routeFromDecision(data.decision, acknowledged);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Digital safety could not continue",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAcknowledgeAdvisory() {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      setAcknowledged(true);
      const data = await saveDraft({ acknowledgedOverride: true });
      await routeFromDecision(data.decision, true);
    } catch (error) {
      setAcknowledged(false);
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Advisory could not continue",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (showAdvisory) {
    return (
      <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[760px]">
          <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#E8ECF5] text-sedona-blue">
                <ShieldAlert aria-hidden="true" className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                  Digital safety advisory
                </p>
                <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                  Protect your setup first
                </h1>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
              <p>
                None of this is paranoia. It is practical safety planning for
                anyone working through a difficult relationship.
              </p>
              <div className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#DFE7F2] text-sedona-blue">
                    <Eye aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-sedona-pineSoft">
                      Use the safest container you can
                    </p>
                    <p className="mt-1 text-sm leading-6 text-sedona-stone">
                      If a device, browser, or shared account may be monitored,
                      use a safer device when possible and clear history only if
                      it is safe for you to do so.
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
                Current backend step: {setupData.setup.currentFlowStep ?? "entry_assessment_a4_digital"}
              </p>
              <Button
                className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft"
                disabled={isSaving}
                onClick={handleAcknowledgeAdvisory}
                type="button"
              >
                {isSaving ? "Saving..." : "I understand, continue"}
                {!isSaving ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[820px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#DFE7F2] text-sedona-blue">
              <Eye aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Entry assessment
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                A.4 Digital Safety Note
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              This is practical safety planning. Check any digital or device concerns
              that are true for you right now.
            </p>
            <p>
              If none apply, you can continue. If concerns are present, the backend
              will route you through a brief advisory before moving forward.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-6">
              <AuthFormAlert message={errorMessage} variant="error" />
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {digitalSafetyItems.map((item) => (
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[16px] border px-4 py-4 text-sm leading-6 transition",
                  values[item.id]
                    ? "border-sedona-clay bg-[#FFF8F4] text-sedona-pineSoft"
                    : "border-[#D9CDC0] bg-white text-sedona-stone hover:border-sedona-sage/60",
                )}
                key={item.id}
              >
                <input
                  checked={values[item.id]}
                  className="mt-1 h-4 w-4 shrink-0 accent-sedona-clay"
                  onChange={(event) => updateValue(item.id, event.target.checked)}
                  type="checkbox"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-6 rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5 text-sm leading-6 text-sedona-stone">
            None of this is paranoia. It is safety planning for real life.
            {hasConcern ? " We’ll show a short advisory before continuing." : " If none of these apply, we’ll move forward to crisis context."}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-sedona-taupe">
              Current backend step: {setupData.setup.currentFlowStep ?? "entry_assessment_a4_digital"}
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
