import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import type {
  BackendPartnerSafetyForkResponse,
  BackendSetupResponse,
} from "@/lib/onboarding/backend-setup";
import type { OnboardingStepKey } from "@/lib/onboarding/setup-flow";
import { onboardingStepContent } from "@/lib/onboarding/setup-flow";

type OnboardingStepPlaceholderProps = {
  step: OnboardingStepKey;
  setupData: BackendSetupResponse;
  partnerSafetyForkData?: BackendPartnerSafetyForkResponse | null;
  footer?: ReactNode;
};

export function OnboardingStepPlaceholder({
  step,
  setupData,
  partnerSafetyForkData = null,
  footer,
}: OnboardingStepPlaceholderProps) {
  const content = onboardingStepContent[step];

  return (
    <section className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[760px]">
        <div className="rounded-[26px] bg-white p-6 shadow-card sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-sedona-taupe">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 font-serif text-[34px] leading-[1.06] text-sedona-pineSoft sm:text-[44px]">
            {content.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sedona-stone sm:text-base">
            {content.description}
          </p>

          <div className="mt-6 rounded-[20px] border border-[#E2D8C8] bg-[#FBF7EF] p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#E4EFE8] text-sedona-sage">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-sedona-pineSoft">
                  Backend-driven onboarding is active
                </p>
                <p className="mt-1 text-sm leading-6 text-sedona-stone">
                  This step is now routed from the backend setup state. We can build the final UI on top of this stable boot flow next.
                </p>
              </div>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Current step" value={setupData.setup.currentFlowStep ?? "None"} />
            <SummaryCard label="Next setup step" value={setupData.setup.nextSetupStep ?? "Complete"} />
            <SummaryCard label="Setup status" value={setupData.setup.status} />
            <SummaryCard
              label="Completed flow steps"
              value={String(setupData.setup.completedFlowSteps.length)}
            />
          </dl>

          {partnerSafetyForkData ? (
            <div className="mt-6 rounded-[20px] border border-[#EAC7B7] bg-[#FFF8F4] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sedona-clay">
                Partner safety fork
              </p>
              <p className="mt-2 text-sm leading-6 text-sedona-stone">
                Trigger reason:{" "}
                <span className="font-semibold text-sedona-pineSoft">
                  {partnerSafetyForkData.partnerSafetyFork.triggerReasonCode ?? "Unknown"}
                </span>
              </p>
              <p className="mt-1 text-sm leading-6 text-sedona-stone">
                Resources loaded:{" "}
                <span className="font-semibold text-sedona-pineSoft">
                  {partnerSafetyForkData.partnerSafetyFork.resources.length}
                </span>
              </p>
              <p className="mt-1 text-sm leading-6 text-sedona-stone">
                Current outcome:{" "}
                <span className="font-semibold text-sedona-pineSoft">
                  {partnerSafetyForkData.partnerSafetyFork.outcome ?? "Pending choice"}
                </span>
              </p>
            </div>
          ) : null}

          {setupData.setup.blockedReason ? (
            <div className="mt-6 rounded-[18px] border border-[#EAC7B7] bg-[#FFF8F4] px-4 py-3 text-sm font-semibold text-sedona-clay">
              Blocked reason: {setupData.setup.blockedReason}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-[16px] bg-sedona-pine px-5 text-sm font-bold text-white transition hover:bg-sedona-pineSoft sm:flex-1"
              href="/app/home"
            >
              View current dashboard
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-[16px] border border-[#E2D8C8] bg-white px-5 text-sm font-bold text-sedona-stone transition hover:bg-[#FBF7EF] sm:flex-1"
              href="/auth/redirect"
            >
              Re-run app boot
            </Link>
          </div>

          {footer ? <div className="mt-6">{footer}</div> : null}
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
