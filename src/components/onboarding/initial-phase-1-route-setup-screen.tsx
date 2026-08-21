"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, LoaderCircle, MapPinned } from "lucide-react";

import { AuthFormAlert } from "@/components/auth/auth-form-card";
import { Button } from "@/components/ui/button";
import type { BackendSetupResponse } from "@/lib/onboarding/backend-setup";
import { userAppRoot } from "@/lib/auth/routes";
import { useToast } from "@/hooks/use-toast";

type InitialPhase1RouteSetupScreenProps = {
  setupData: BackendSetupResponse;
};

type CompleteStepResponse = {
  setup: BackendSetupResponse["setup"];
};

type InitialPhase1Route = {
  currentPhase?: string;
  currentChapter?: string;
  currentNode?: string;
  currentModule?: string;
  routeReason?: string;
  firstDashboardRecommendation?: {
    title?: string;
    reason?: string;
    target?: string;
  };
};

export function InitialPhase1RouteSetupScreen({
  setupData,
}: InitialPhase1RouteSetupScreenProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<InitialPhase1Route | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function assignInitialRoute() {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/setup/steps/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            step: "initial_phase_1_route_setup",
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
              ? payload.error?.message ?? "Unable to assign the initial Phase 1 route."
              : "Unable to assign the initial Phase 1 route.",
          );
        }

        const initialPhase1Route =
          (payload.data.setup.metadata?.initialPhase1Route as InitialPhase1Route | undefined) ??
          null;

        if (!cancelled) {
          setRouteSummary(initialPhase1Route);
          toast({
            title: "Phase 1 route assigned",
            description: "Your starting chapter and recommendation are ready.",
            variant: "success",
          });
        }

        window.setTimeout(() => {
          if (!cancelled) {
            router.push(userAppRoot);
          }
        }, 900);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while assigning the initial route.";

        setErrorMessage(message);
        toast({
          title: "Route assignment failed",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsSubmitting(false);
        }
      }
    }

    void assignInitialRoute();

    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[820px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#DFE7F2] text-sedona-blue">
              <Compass aria-hidden="true" className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
                Route assignment
              </p>
              <h1 className="mt-2 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
                Initial Phase 1 Route Setup
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-sedona-stone sm:text-base">
            <p>
              We’re saving your initial Phase 1 route so the app knows which chapter,
              node, and first recommendation to show when you arrive on the dashboard.
            </p>
            <div className="rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#F3E1D6] text-sedona-clay">
                  <MapPinned aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sedona-pineSoft">
                    Finalizing your starting point
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    This uses your earlier answers to decide where Phase 1 begins for you today.
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

          {!errorMessage ? (
            <div className="mt-6 rounded-[22px] border border-[#E2D8C8] bg-white p-5">
              <div className="flex items-center gap-3">
                <LoaderCircle
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin text-sedona-clay"
                />
                <p className="font-semibold text-sedona-pineSoft">
                  {isSubmitting ? "Assigning your route..." : "Route assigned"}
                </p>
              </div>

              {routeSummary ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SummaryCard label="Phase" value={routeSummary.currentPhase ?? "stabilize"} />
                  <SummaryCard label="Chapter" value={routeSummary.currentChapter ?? "chapter_a"} />
                  <SummaryCard label="Node" value={routeSummary.currentNode ?? "CH_A_ENTRY"} />
                  <SummaryCard label="Module" value={routeSummary.currentModule ?? "chapter-a"} />
                </div>
              ) : null}

              {routeSummary?.firstDashboardRecommendation ? (
                <div className="mt-4 rounded-[18px] border border-[#E2D8C8] bg-[#FBF7EF] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sedona-taupe">
                    First dashboard recommendation
                  </p>
                  <p className="mt-2 font-semibold text-sedona-pineSoft">
                    {routeSummary.firstDashboardRecommendation.title ?? "Continue your Phase 1 path"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sedona-stone">
                    {routeSummary.firstDashboardRecommendation.reason ??
                      "We’re preparing the next best starting point for you."}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 rounded-[16px] bg-sedona-pine px-6 text-sm font-bold text-white hover:bg-sedona-pineSoft sm:flex-1"
                disabled={isSubmitting}
                onClick={() => window.location.reload()}
                type="button"
              >
                Try again
              </Button>
              <Button
                className="h-12 rounded-[16px] border-[#E2D8C8] bg-white px-6 text-sm font-bold text-sedona-stone hover:bg-[#FBF7EF] sm:flex-1"
                onClick={() => router.push(userAppRoot)}
                type="button"
                variant="outline"
              >
                Go to dashboard
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#E2D8C8] bg-white p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-sedona-taupe">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold text-sedona-pineSoft">{value}</dd>
    </div>
  );
}
