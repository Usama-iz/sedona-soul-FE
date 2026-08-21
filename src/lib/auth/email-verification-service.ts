import { apiRequest } from "@/lib/api/client";

type SignupVerificationResponse = {
  verificationRequired: true;
  expiresInHours: number;
  user: {
    id: string;
    authProvider: "credentials";
    authProviderUserId: string;
    email: string;
    emailVerifiedAt: string | null;
    preferredName: string | null;
  };
};

type ResendVerificationResponse = {
  accepted: true;
  expiresInHours: number;
};

type VerifyEmailResponse = {
  emailVerified: true;
  user: {
    email: string;
  };
};

export async function signupWithEmailVerification(payload: {
  email: string;
  password: string;
  passwordConfirmation: string;
  preferredName?: string;
}) {
  return apiRequest<SignupVerificationResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendVerificationEmail(email: string) {
  return apiRequest<ResendVerificationResponse>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmailToken(token: string) {
  return apiRequest<VerifyEmailResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
