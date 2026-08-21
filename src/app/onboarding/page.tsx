import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getBackendSetupState } from "@/lib/onboarding/backend-setup";
import { getOnboardingStepHref, isOnboardingStep } from "@/lib/onboarding/setup-flow";
import { authRedirectRoot, onboardingRoot, signInUrl, userAppRoot } from "@/lib/auth/routes";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect(`${signInUrl}?redirect_url=${encodeURIComponent(onboardingRoot)}`);
  }

  try {
    const setupData = await getBackendSetupState(session);

    if (setupData.setup.isComplete || !setupData.setup.nextSetupStep) {
      redirect(userAppRoot);
    }

    if (!isOnboardingStep(setupData.setup.nextSetupStep)) {
      redirect(authRedirectRoot);
    }

    redirect(getOnboardingStepHref(setupData.setup.nextSetupStep));
  } catch (error) {
    console.error("Unable to load backend onboarding setup state", error);
    redirect(authRedirectRoot);
  }
}
