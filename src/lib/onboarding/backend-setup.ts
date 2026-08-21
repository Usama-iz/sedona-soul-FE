import type { Session } from "next-auth";

import { BackendAuthError, createBackendAuthToken } from "@/lib/auth/backend-auth";

const getBackendApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.BACKEND_API_URL ?? "";

  if (!apiUrl) {
    throw new BackendAuthError({
      code: "BACKEND_API_URL_MISSING",
      message: "NEXT_PUBLIC_API_BASE_URL or BACKEND_API_URL must be configured.",
      status: 500,
    });
  }

  return apiUrl.replace(/\/$/, "");
};

type BackendApiSuccess<T> = {
  ok: true;
  data: T;
};

type BackendApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type BackendSetupNextStep =
  | "safety_screen_intro"
  | "truthfulness_policy"
  | "entry_assessment_a1"
  | "entry_assessment_a2"
  | "partner_safety_fork"
  | "entry_assessment_a4_digital"
  | "crisis_context"
  | "partner_status"
  | "solo_acknowledgment"
  | "support_team_setup"
  | "no_decisions_commitment"
  | "phase_1_orientation"
  | "initial_phase_1_route_setup";

export type BackendSetupState = {
  id: string;
  isComplete: boolean;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  currentStep: string | null;
  nextSetupStep: BackendSetupNextStep | null;
  completedSteps: string[];
  completedFlowSteps: string[];
  skippedFlowSteps: string[];
  currentFlowStep: BackendSetupNextStep | null;
  blockedReason: string | null;
  metadata: Record<string, unknown>;
  flow: {
    routeVersion: string;
    nextStep: BackendSetupNextStep | null;
    completedSteps: string[];
    skippedSteps: string[];
    partnerStatus: string | null;
    partnerSafetyFork: {
      active: boolean;
      triggerReasonCode: string | null;
      resourcesAcknowledgedAt: string | null;
      choice: "continue_solo" | "pause_entirely" | "just_resources" | null;
      outcome: "continue_solo" | "support_loop" | null;
      completedAt: string | null;
    } | null;
  };
  legacyStatus?: {
    onboardingComplete: boolean;
    baselineCompleted: boolean;
  };
};

export type BackendSetupResponse = {
  setup: BackendSetupState;
  workflow: {
    status?: string | null;
    currentPhase?: string | null;
    currentChapter?: string | null;
    currentNodeId?: string | null;
    nextNodeId?: string | null;
    holdState?: string | null;
    activationScore?: number | null;
    progress?: {
      daysInPhase?: number | null;
      consecutiveGreenLogins?: number | null;
      consecutiveHardDays?: number | null;
      chaptersComplete?: string[] | null;
    } | null;
    safetyLock?: {
      result?: string | null;
      primaryReasonCode?: string | null;
      affectedGuardrails?: string[] | null;
    } | null;
  } | null;
};

export type BackendPartnerSafetyForkResponse = {
  setup: BackendSetupState;
  partnerSafetyFork: {
    active: boolean;
    triggerReasonCode: string | null;
    resourcesAcknowledged: boolean;
    resourcesAcknowledgedAt: string | null;
    choice: "continue_solo" | "pause_entirely" | "just_resources" | null;
    outcome: "continue_solo" | "support_loop" | null;
    completedAt: string | null;
    resources: Array<{
      id: string;
      title: string;
      description: string;
      phone: string | null;
      textInstruction: string | null;
      url: string | null;
      category: string;
      priority: number;
    }>;
    choices: Array<{
      key: "continue_solo" | "pause_entirely" | "just_resources";
      label: string;
    }>;
  };
};

async function backendAuthRequest<T>(session: Session, path: string, init?: RequestInit) {
  const token = createBackendAuthToken(session);
  const response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | BackendApiSuccess<T>
    | BackendApiFailure
    | null;

  if (!response.ok || !payload || payload.ok === false) {
    const error = payload && "error" in payload ? payload.error : null;

    throw new BackendAuthError({
      code: error?.code ?? "BACKEND_AUTH_REQUEST_FAILED",
      details: error?.details,
      message: error?.message ?? "Backend auth request failed.",
      status: response.status,
    });
  }

  return payload.data;
}

export async function getBackendSetupState(session: Session) {
  return backendAuthRequest<BackendSetupResponse>(session, "/setup", {
    method: "GET",
  });
}

export async function getBackendPartnerSafetyForkState(session: Session) {
  return backendAuthRequest<BackendPartnerSafetyForkResponse>(
    session,
    "/setup/partner-safety-fork",
    {
      method: "GET",
    },
  );
}
