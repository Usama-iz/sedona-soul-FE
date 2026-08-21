"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, HeartHandshake, PhoneCall } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SupportTeamSetupScreenProps = {
  setupData: BackendSetupResponse;
};

type SupportSetupStatus =
  | "not_started"
  | "has_support"
  | "needs_support"
  | "not_ready"
  | "skipped";

type SupportType =
  | "trusted_friend_family"
  | "therapist_coach"
  | "sponsor_recovery_support"
  | "crisis_safety_resource"
  | "other";

type SupportSetupResponse = {
  id: string | null;
  status: SupportSetupStatus;
  supportTypes: SupportType[];
  supportNotes: string | null;
  firstActionStep: string | null;
  richardFields: {
    therapist: string | null;
    crisisLine: string | null;
    trustedHuman: string | null;
    firstAction72Hours: string | null;
  };
  isComplete: boolean;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type SaveSupportSetupResponse = {
  supportSetup: SupportSetupResponse;
  setup: BackendSetupResponse["setup"] | null;
};

const statusOptions: Array<{
  value: SupportSetupStatus;
  label: string;
  description: string;
}> = [
  {
    value: "has_support",
    label: "I have support",
    description: "You already have people or professionals you can lean on.",
  },
  {
    value: "needs_support",
    label: "I need support",
    description: "You know support is needed and want to start putting it in place.",
  },
  {
    value: "not_ready",
    label: "I’m not ready yet",
    description: "You are not ready to answer this fully right now, but the app can still save the state.",
  },
  {
    value: "skipped",
    label: "Skip for now",
    description: "Move on for now and come back to complete support details later if allowed.",
  },
];

const supportTypeOptions: Array<{
  value: SupportType;
  label: string;
}> = [
  { value: "trusted_friend_family", label: "Trusted friend/family" },
  { value: "therapist_coach", label: "Therapist/coach" },
  { value: "sponsor_recovery_support", label: "Sponsor/recovery support" },
  { value: "crisis_safety_resource", label: "Crisis/safety resource" },
  { value: "other", label: "Other" },
];

export function SupportTeamSetupScreen({
  setupData,
}: SupportTeamSetupScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<SupportSetupStatus>("not_started");
  const [supportTypes, setSupportTypes] = useState<SupportType[]>([]);
  const [supportNotes, setSupportNotes] = useState("");
  const [firstActionStep, setFirstActionStep] = useState("");
  const [therapist, setTherapist] = useState("");
  const [crisisLine, setCrisisLine] = useState("988");
  const [trustedHuman, setTrustedHuman] = useState("");
  const [firstAction72Hours, setFirstAction72Hours] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSupportSetup() {
      setIsLoadingDraft(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/support-setup", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              data: {
                supportSetup: SupportSetupResponse;
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
              ? payload.error?.message ?? "Unable to load support setup."
              : "Unable to load support setup.",
          );
        }

        if (cancelled) {
          return;
        }

        const supportSetup = payload.data.supportSetup;

        setStatus(supportSetup.status);
        setSupportTypes(supportSetup.supportTypes);
        setSupportNotes(supportSetup.supportNotes ?? "");
        setFirstActionStep(supportSetup.firstActionStep ?? "");
        setTherapist(supportSetup.richardFields.therapist ?? "");
        setCrisisLine(supportSetup.richardFields.crisisLine ?? "988");
        setTrustedHuman(supportSetup.richardFields.trustedHuman ?? "");
        setFirstAction72Hours(supportSetup.richardFields.firstAction72Hours ?? "");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unable to load support setup.";
        setErrorMessage(message);
        toast({
          title: "Support setup could not load",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsLoadingDraft(false);
        }
      }
    }

    void loadSupportSetup();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  function toggleSupportType(value: SupportType) {
    setSupportTypes((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setErrorMessage(null);
  }

  async function handleContinue() {
    if (status === "not_started") {
      setErrorMessage("Choose the support status that best matches where you are right now.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/support-setup", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          supportTypes,
          supportNotes: supportNotes.trim() || null,
          firstActionStep: firstActionStep.trim() || null,
          therapist: therapist.trim() || null,
          crisisLine: crisisLine.trim() || null,
          trustedHuman: trustedHuman.trim() || null,
          firstAction72Hours: firstAction72Hours.trim() || null,
          completed: true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: SaveSupportSetupResponse }
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
            ? payload.error?.message ?? "Unable to save support setup."
            : "Unable to save support setup.",
        );
      }

      const nextSetupStep = payload.data.setup?.nextSetupStep ?? null;

      if (nextSetupStep && isOnboardingStep(nextSetupStep)) {
        router.push(getOnboardingStepHref(nextSetupStep));
        return;
      }

      if (payload.data.setup?.isComplete) {
        router.push(userAppRoot);
        return;
      }

      throw new Error("Backend did not return the next onboarding step.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";

      setErrorMessage(message);
      toast({
        title: "Support setup could not continue",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[860px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#E4EFE8] text-sedona-sage">
              <PhoneCall aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Support scaffolding
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                Building Your Professional Support Team
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              This workbook is a companion, not a replacement for human support. Fill in what you already have, and note the first action step if support still needs to be set up.
            </p>
            <div className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F3E1D6] text-sedona-clay">
                  <HeartHandshake aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">
                    Support matters before deeper work
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    For solo partners especially, professional support is not optional in the workbook’s framing.
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

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {statusOptions.map((option) => {
              const selected = status === option.value;

              return (
                <button
                  className={cn(
                    "rounded-[18px] border px-4 py-4 text-left transition",
                    selected
                      ? "border-sedona-clay bg-[#FFF8F4] text-sedona-pineSoft"
                      : "border-[#D9CDC0] bg-white text-sedona-stone hover:border-sedona-sage/60",
                  )}
                  key={option.value}
                  onClick={() => {
                    setStatus(option.value);
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

          <div className="mt-6 rounded-[22px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
            <h2 className="font-semibold text-sedona-pineSoft">Support types</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {supportTypeOptions.map((option) => (
                <label
                  className="flex items-start gap-3 rounded-[16px] border border-[#D9CDC0] bg-white px-4 py-3 text-sm leading-6 text-sedona-stone"
                  key={option.value}
                >
                  <input
                    checked={supportTypes.includes(option.value)}
                    className="mt-1 h-4 w-4 shrink-0 accent-sedona-clay"
                    onChange={() => toggleSupportType(option.value)}
                    type="checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Therapist / counselor / coach"
              onChange={setTherapist}
              placeholder="Dr. Lewis"
              value={therapist}
            />
            <TextField
              label="My 24/7 crisis line"
              onChange={setCrisisLine}
              placeholder="988 (US) or local equivalent"
              value={crisisLine}
            />
            <TextField
              label="One trusted human I can call at 3am"
              onChange={setTrustedHuman}
              placeholder="Maya"
              value={trustedHuman}
            />
            <TextField
              label="First action step within 72 hours"
              onChange={setFirstAction72Hours}
              placeholder="Text Maya and book a therapy session"
              value={firstAction72Hours}
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <TextAreaField
              label="Support notes"
              onChange={setSupportNotes}
              placeholder="I can call Maya or my therapist if I feel overwhelmed."
              value={supportNotes}
            />
            <TextAreaField
              label="First action step"
              onChange={setFirstActionStep}
              placeholder="Text Maya today."
              value={firstActionStep}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-sedona-taupe">
              Current backend step: {setupData.setup.currentFlowStep ?? "support_team_setup"}
            </p>
            <Button
              className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft"
              disabled={isLoadingDraft || isSubmitting}
              onClick={handleContinue}
              type="button"
            >
              {isLoadingDraft ? "Loading..." : isSubmitting ? "Saving..." : "Continue"}
              {!isLoadingDraft && !isSubmitting ? (
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              ) : null}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-sedona-pineSoft">{label}</span>
      <input
        className="mt-3 h-12 w-full rounded-[16px] border border-[#D9CDC0] bg-white px-4 text-sm text-sedona-pineSoft outline-none transition focus:border-sedona-clay"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-sedona-pineSoft">{label}</span>
      <textarea
        className="mt-3 min-h-[132px] w-full rounded-[16px] border border-[#D9CDC0] bg-white px-4 py-3 text-sm leading-6 text-sedona-pineSoft outline-none transition focus:border-sedona-clay"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
