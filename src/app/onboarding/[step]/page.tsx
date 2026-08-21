import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntryAssessmentA1Screen } from "@/components/onboarding/entry-assessment-a1-screen";
import { EntryAssessmentA2Screen } from "@/components/onboarding/entry-assessment-a2-screen";
import { EntryAssessmentA4DigitalScreen } from "@/components/onboarding/entry-assessment-a4-digital-screen";
import { CrisisContextScreen } from "@/components/onboarding/crisis-context-screen";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { SafetyScreenIntro } from "@/components/onboarding/safety-screen-intro";
import { OnboardingStepPlaceholder } from "@/components/onboarding/onboarding-step-placeholder";
import { InitialPhase1RouteSetupScreen } from "@/components/onboarding/initial-phase-1-route-setup-screen";
import { NoDecisionsCommitmentScreen } from "@/components/onboarding/no-decisions-commitment-screen";
import { PartnerStatusScreen } from "@/components/onboarding/partner-status-screen";
import { PartnerSafetyForkScreen } from "@/components/onboarding/partner-safety-fork-screen";
import { Phase1OrientationScreen } from "@/components/onboarding/phase-1-orientation-screen";
import { SoloAcknowledgmentScreen } from "@/components/onboarding/solo-acknowledgment-screen";
import { SupportTeamSetupScreen } from "@/components/onboarding/support-team-setup-screen";
import { TruthfulnessPolicyScreen } from "@/components/onboarding/truthfulness-policy-screen";
import {
  getBackendPartnerSafetyForkState,
  getBackendSetupState,
} from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { onboardingRoot, signInUrl, userAppRoot } from "@/lib/auth/routes";

type OnboardingStepPageProps = {
  params: Promise<{
    step: string;
  }>;
};

export default async function OnboardingStepPage({ params }: OnboardingStepPageProps) {
  const { step } = await params;

  if (!isOnboardingStep(step)) {
    notFound();
  }

  const session = await auth();

  if (!session?.user) {
    redirect(`${signInUrl}?redirect_url=${encodeURIComponent(`/onboarding/${step}`)}`);
  }

  const setupData = await getBackendSetupState(session);

  if (setupData.setup.isComplete || !setupData.setup.nextSetupStep) {
    redirect(userAppRoot);
  }

  if (setupData.setup.nextSetupStep !== step) {
    if (isOnboardingStep(setupData.setup.nextSetupStep)) {
      redirect(getOnboardingStepHref(setupData.setup.nextSetupStep));
    }

    redirect(onboardingRoot);
  }

  const partnerSafetyForkData =
    step === "partner_safety_fork"
      ? await getBackendPartnerSafetyForkState(session)
      : null;

  return (
    <OnboardingShell>
      {step === "safety_screen_intro" ? (
        <SafetyScreenIntro setupData={setupData} />
      ) : step === "truthfulness_policy" ? (
        <TruthfulnessPolicyScreen setupData={setupData} />
      ) : step === "entry_assessment_a1" ? (
        <EntryAssessmentA1Screen setupData={setupData} />
      ) : step === "entry_assessment_a2" ? (
        <EntryAssessmentA2Screen setupData={setupData} />
      ) : step === "entry_assessment_a4_digital" ? (
        <EntryAssessmentA4DigitalScreen setupData={setupData} />
      ) : step === "crisis_context" ? (
        <CrisisContextScreen setupData={setupData} />
      ) : step === "partner_status" ? (
        <PartnerStatusScreen setupData={setupData} />
      ) : step === "solo_acknowledgment" ? (
        <SoloAcknowledgmentScreen setupData={setupData} />
      ) : step === "support_team_setup" ? (
        <SupportTeamSetupScreen setupData={setupData} />
      ) : step === "no_decisions_commitment" ? (
        <NoDecisionsCommitmentScreen setupData={setupData} />
      ) : step === "phase_1_orientation" ? (
        <Phase1OrientationScreen setupData={setupData} />
      ) : step === "initial_phase_1_route_setup" ? (
        <InitialPhase1RouteSetupScreen setupData={setupData} />
      ) : step === "partner_safety_fork" && partnerSafetyForkData ? (
        <PartnerSafetyForkScreen partnerSafetyForkData={partnerSafetyForkData} />
      ) : (
        <OnboardingStepPlaceholder
          partnerSafetyForkData={partnerSafetyForkData}
          setupData={setupData}
          step={step}
        />
      )}
    </OnboardingShell>
  );
}
