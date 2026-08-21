import type { BackendSetupNextStep } from "@/lib/onboarding/backend-setup";

export const onboardingStepOrder = [
  "safety_screen_intro",
  "truthfulness_policy",
  "entry_assessment_a1",
  "entry_assessment_a2",
  "partner_safety_fork",
  "entry_assessment_a4_digital",
  "crisis_context",
  "partner_status",
  "solo_acknowledgment",
  "support_team_setup",
  "no_decisions_commitment",
  "phase_1_orientation",
  "initial_phase_1_route_setup",
] as const satisfies readonly BackendSetupNextStep[];

export type OnboardingStepKey = (typeof onboardingStepOrder)[number];

type OnboardingStepContent = {
  description: string;
  eyebrow: string;
  title: string;
};

export const onboardingStepContent: Record<OnboardingStepKey, OnboardingStepContent> = {
  safety_screen_intro: {
    eyebrow: "Phase 1 setup",
    title: "Before We Begin",
    description:
      "Introduce the safety-first setup and reassure the user that honest answers matter more than speed.",
  },
  truthfulness_policy: {
    eyebrow: "Phase 1 setup",
    title: "Answering Truthfully",
    description:
      "Explain why truthful answers are required before safety and assessment decisions can be trusted.",
  },
  entry_assessment_a1: {
    eyebrow: "Entry assessment",
    title: "A.1 Baseline Wellbeing",
    description:
      "Collect the first baseline wellbeing and risk answers before continuing into the assessment flow.",
  },
  entry_assessment_a2: {
    eyebrow: "Entry assessment",
    title: "A.2 The Coercive Control Screen",
    description:
      "Check for physical safety, coercion, and escalation patterns before any normal onboarding continues.",
  },
  partner_safety_fork: {
    eyebrow: "Safety first",
    title: "Partner-Sourced Safety Fork",
    description:
      "Show domestic violence resources first, then let the user choose whether to continue solo or stay in support-loop mode.",
  },
  entry_assessment_a4_digital: {
    eyebrow: "Entry assessment",
    title: "A.4 Digital Safety Note",
    description:
      "Capture device, browser, cloud, and location-safety concerns before crisis context routing.",
  },
  crisis_context: {
    eyebrow: "Entry assessment",
    title: "B. Where Am I In The Crisis",
    description:
      "Record the current crisis type so the backend can route the user into the correct Phase 1 starting point.",
  },
  partner_status: {
    eyebrow: "Setup routing",
    title: "Partner Engagement Status",
    description:
      "Determine whether the user is together, separated, preparing, or on a solo path on the normal onboarding branch.",
  },
  solo_acknowledgment: {
    eyebrow: "Solo path",
    title: "Solo Work Is Real Work",
    description:
      "Acknowledge the solo path and move the user into support scaffolding without collapsing the overall workflow.",
  },
  support_team_setup: {
    eyebrow: "Support",
    title: "Building Your Professional Support Team",
    description:
      "Capture therapist, trusted person, crisis-line, and first-action support information before deeper Phase 1 work.",
  },
  no_decisions_commitment: {
    eyebrow: "Commitment",
    title: "The No Big Decisions Commitment",
    description:
      "Ask the user to accept the bounded Phase 1 commitment before orientation and route assignment.",
  },
  phase_1_orientation: {
    eyebrow: "Phase 1",
    title: "What Phase 1 Is",
    description:
      "Set expectations that Phase 1 is for stabilization, not speed, repair, or big relationship decisions.",
  },
  initial_phase_1_route_setup: {
    eyebrow: "Route assignment",
    title: "Initial Phase 1 Route Setup",
    description:
      "Persist the initial chapter, node, and recommendation before the user lands on the Home dashboard.",
  },
};

export function isOnboardingStep(value: string): value is OnboardingStepKey {
  return onboardingStepOrder.includes(value as OnboardingStepKey);
}

export function getOnboardingStepHref(step: OnboardingStepKey) {
  return `/onboarding/${step}`;
}
