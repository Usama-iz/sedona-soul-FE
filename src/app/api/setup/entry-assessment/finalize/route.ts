import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { BackendAuthError, createBackendAuthToken } from "@/lib/auth/backend-auth";

const getBackendApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.BACKEND_API_URL ?? "";

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured.");
  }

  return apiUrl.replace(/\/$/, "");
};

const apiError = (code: string, message: string, status: number, details?: unknown) =>
  NextResponse.json(
    {
      ok: false,
      error: {
        code,
        details,
        message,
      },
    },
    { status },
  );

async function getAuthToken() {
  const session = await auth();

  if (!session?.user) {
    return { error: apiError("UNAUTHORIZED", "Authentication is required.", 401) };
  }

  try {
    return { token: createBackendAuthToken(session) };
  } catch (error) {
    if (error instanceof BackendAuthError) {
      return {
        error: apiError(error.code, error.message, error.status, error.details),
      };
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const authResult = await getAuthToken();

  if ("error" in authResult) {
    return authResult.error;
  }

  const body = await request.json();
  const response = await fetch(`${getBackendApiBaseUrl()}/setup/entry-assessment/finalize`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authResult.token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  return NextResponse.json(
    payload ?? {
      ok: false,
      error: {
        code: "BACKEND_EMPTY_RESPONSE",
        message: "Backend returned an empty response.",
      },
    },
    { status: response.status },
  );
}
