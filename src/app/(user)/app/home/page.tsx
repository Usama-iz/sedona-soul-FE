import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Heart, Shield } from "lucide-react";

import { auth } from "@/auth";
import { PageShell } from "@/components/layouts/page-shell";
import { GreetingHeader } from "@/components/shared/greeting-header";
import { ErrorState } from "@/components/ui/error-state";
import { getBackendDashboard } from "@/lib/auth/backend-auth";
import { onboardingRoot, signInUrl } from "@/lib/auth/routes";

const tools = [
  { title: "Sacred Pause", subtitle: "2-min reset", accent: "#B04F24", tint: "#F4E2D6" },
  { title: "Heart Coherence", subtitle: "Breathe with care", accent: "#465980", tint: "#E4E9F2" },
  { title: "Anger Release", subtitle: "Move the heat", accent: "#B04F24", tint: "#F4E2D6" },
];

function formatPhaseLabel(phase: string | null | undefined) {
  if (!phase) {
    return "Stabilize";
  }

  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

function formatChapterLabel(chapter: string | null | undefined) {
  if (!chapter) {
    return "Getting your starting chapter ready";
  }

  return chapter.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDaysLabel(daysInPhase: number | null | undefined) {
  if (daysInPhase === null || daysInPhase === undefined) {
    return "Starting your phase journey";
  }

  return `${daysInPhase}`;
}

function formatAnxietyTrend(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not tracked yet";
  }

  return `${value}/10`;
}

function getNextActionCopy(nextScreen: string | undefined, recommendationTitle: string | undefined) {
  if (recommendationTitle) {
    return recommendationTitle;
  }

  if (nextScreen === "safety_questions") {
    return "Begin today’s safety check";
  }

  if (nextScreen === "pacing_question") {
    return "Resume today’s check-in";
  }

  if (nextScreen === "hold_position") {
    return "Hold position today";
  }

  if (nextScreen === "support_check") {
    return "Review your support plan";
  }

  return "How are you arriving today?";
}

function getNextActionHref(nextScreen: string | undefined) {
  if (nextScreen === "support_check" || nextScreen === "hold_position" || nextScreen === "pacing_question" || nextScreen === "safety_questions") {
    return "/app/today";
  }

  return "/app/today";
}

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect(signInUrl);
  }

  let dashboard;

  try {
    dashboard = await getBackendDashboard(session);
  } catch (error) {
    console.error("Unable to load dashboard context", error);

    return (
      <PageShell maxWidth="md">
        <ErrorState
          className="min-h-[320px]"
          description="We could not load your live dashboard from the backend. Your account is still safe; try refreshing this page."
          title="Dashboard unavailable"
        />
      </PageShell>
    );
  }

  if (!dashboard.setup.isComplete) {
    redirect(onboardingRoot);
  }

  const preferredName = dashboard.profile.preferredName ?? "there";
  const currentPhase = formatPhaseLabel(dashboard.journey.currentPhase);
  const currentChapter = formatChapterLabel(dashboard.workflow?.currentChapter ?? dashboard.stats.currentChapter ?? null);
  const daysInPhase = dashboard.stats.daysInPhase;
  const regulationStreak = dashboard.stats.regulationStreak;
  const latestAnxietyLevel = dashboard.stats.latestAnxietyLevel;
  const latestRecommendation = dashboard.latestRecommendation;
  const nextScreen = dashboard.dailySession.nextStep?.nextScreen;
  const nextActionLabel = getNextActionCopy(nextScreen, latestRecommendation?.title);
  const nextActionHref = getNextActionHref(nextScreen);
  const partnerInitials = dashboard.partnerStatus.partner?.initials ?? "SO";
  const partnerName = dashboard.partnerStatus.partner?.displayName ?? (
    dashboard.partnerStatus.status === "linked" ? "Your partner" : "Solo path"
  );
  const partnerSummary =
    dashboard.partnerStatus.status === "linked"
      ? "Linked · private by default"
      : dashboard.partnerStatus.status === "invited"
        ? "Invite sent · waiting to connect"
        : dashboard.partnerStatus.status === "solo"
          ? "Solo path · your work still counts"
          : "Not linked yet";
  const audiobookTitle = dashboard.audiobook.chapter?.title ?? "No audio in progress yet";
  const audiobookSubtitle = dashboard.audiobook.hasProgress
    ? "Resume where you left off"
    : "Audio will appear here once content is published";
  const stats = [
    {
      value: regulationStreak !== null && regulationStreak !== undefined ? String(regulationStreak) : "--",
      label: "day regulation streak",
      tone: "text-[#B04F24]",
    },
    {
      value: formatAnxietyTrend(latestAnxietyLevel),
      label: "latest anxiety level",
      tone: "text-[#3E7A5E]",
    },
    {
      value: formatDaysLabel(daysInPhase),
      label: "days in Phase 1",
      tone: "text-[#465980]",
    },
  ];

  return (
    <PageShell>
      <GreetingHeader
        description={latestRecommendation?.reason ?? "However you're arriving today, there is nothing to fix first."}
        eyebrow={`Phase 1 · ${currentPhase}${daysInPhase !== null && daysInPhase !== undefined ? ` · Day ${daysInPhase}` : ""}`}
        title={`Good morning, ${preferredName}.`}
      />
      <div className="mt-6 grid gap-4 min-[575px]:grid-cols-2 lg:grid-cols-[1.2fr_1fr]">
        <Link
          className="relative min-h-[210px] overflow-hidden rounded-[26px] bg-[#6F8275] shadow-[0_18px_36px_-18px_rgba(48,30,16,0.34)] min-[575px]:min-h-[240px] lg:min-h-[270px]"
          href={nextActionHref}
        >
          <div className="absolute inset-0 bg-[linear-gradient(155deg,#B8C0B6_0%,#87978B_44%,#50685E_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,54,44,0.12)_0%,rgba(18,54,44,0.72)_100%)]" />
          <div className="relative flex h-full flex-col justify-end p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">Daily check-in</p>
            <h2 className="mt-2 max-w-[300px] font-serif text-[30px] font-normal leading-[1.16] text-[#FBF7EF]">
              {nextActionLabel}
            </h2>
            <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#F4EFE6] px-5 py-3 text-sm font-semibold text-[#9A4220]">
              {dashboard.dailySession.hasSessionToday ? "Resume today" : "Begin check-in"}
              <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
            </div>
          </div>
        </Link>

        <section className="flex min-h-[230px] flex-col justify-between rounded-[26px] bg-[#12362C] p-6 text-[#F1EDE2] shadow-[0_16px_34px_-20px_rgba(18,54,44,0.6)] min-[575px]:min-h-[240px] lg:min-h-[270px]">
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E7E4D8]/60">Your journey</p>
              <p className="text-xs font-semibold text-[#E7B27E]">Phase 1 of 3</p>
            </div>
            <h2 className="mt-3 font-serif text-[28px] font-normal leading-none">{currentPhase}</h2>
            <p className="mt-3 text-sm leading-6 text-[#E7E4D8]/65">
              {currentChapter} · {dashboard.workflow?.holdState ? `currently in ${dashboard.workflow.holdState.replace(/_/g, " ")}` : "building your nervous-system foundation"}.
            </p>
          </div>
          <div>
            <div className="mb-4 mt-6 flex gap-2">
              <span className="h-1.5 flex-1 rounded-full bg-[#E7B27E]" />
              <span className="h-1.5 flex-1 rounded-full bg-[#E7E4D8]/20" />
              <span className="h-1.5 flex-1 rounded-full bg-[#E7E4D8]/20" />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#F1EDE2]">Stabilize</span>
              <span className="text-[#E7E4D8]/45">Heal</span>
              <span className="text-[#E7E4D8]/45">Elevate</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 min-[575px]:col-span-2">
          {stats.map((stat) => (
            <div
              className="rounded-[20px] bg-white p-4 shadow-[0_10px_22px_-18px_rgba(48,30,16,0.2)]"
              key={stat.label}
            >
              <p className={`font-serif text-[34px] leading-none ${stat.tone}`}>{stat.value}</p>
              <p className="mt-2 text-[12.5px] font-medium leading-[1.3] text-[#8A8070]">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="min-[575px]:col-span-2">
          <div className="flex items-center justify-between gap-4 px-1 pb-3 pt-1">
            <h2 className="font-serif text-[24px] font-normal text-[#16352B]">In-the-moment tools</h2>
            <p className="hidden text-sm font-medium text-[#B04F24] sm:block">When you need to land now</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 min-[575px]:grid min-[575px]:grid-cols-3 min-[575px]:overflow-visible">
            {tools.map((tool) => (
              <article
                className="min-w-[168px] rounded-[20px] border-t-[3px] bg-white p-5 shadow-[0_10px_22px_-18px_rgba(48,30,16,0.22)]"
                key={tool.title}
                style={{ borderTopColor: tool.accent }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[12px]"
                  style={{ backgroundColor: tool.tint }}
                >
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: tool.accent }} />
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-tight text-[#16352B]">{tool.title}</h3>
                <p className="mt-2 text-sm text-[#9A8F7C]">{tool.subtitle}</p>
              </article>
            ))}
          </div>
        </section>

        <Link
          className="flex items-center gap-4 rounded-[22px] border border-[#E2E6EE] bg-[#EEF0F4] px-5 py-4 min-[575px]:col-span-2"
          href="/app/partner"
        >
          <div className="flex shrink-0 items-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#465980] text-sm font-semibold text-white">
              {partnerInitials.slice(0, 1)}
            </span>
            <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#EEF0F4] bg-[#B04F24] text-sm font-semibold text-white">
              {partnerInitials.slice(1, 2) || partnerInitials.slice(0, 1)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#2C3A52]">{partnerName}</p>
            <p className="mt-1 truncate text-sm text-[#6E7890]">{partnerSummary}</p>
          </div>
          <ArrowRight aria-hidden="true" className="text-[#465980]" size={18} strokeWidth={2} />
        </Link>

        <section className="rounded-[22px] bg-white p-5 shadow-[0_10px_22px_-18px_rgba(48,30,16,0.22)] min-[575px]:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="sedona-eyebrow">Audiobook</p>
              <h2 className="mt-2 font-serif text-2xl font-normal text-[#16352B]">{audiobookTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-[#7C7363]">{audiobookSubtitle}</p>
            </div>
            <Link
              className="inline-flex rounded-full bg-[#12362C] px-4 py-2 text-sm font-semibold text-[#F4EFE6]"
              href="/app/audiobook"
            >
              {dashboard.audiobook.hasProgress ? "Resume audio" : "Open audio"}
            </Link>
          </div>
        </section>

        <section className="rounded-[22px] bg-white p-5 shadow-[0_10px_22px_-18px_rgba(48,30,16,0.22)] min-[575px]:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#E0E8E1] text-[#3E7A5E]">
              <Shield aria-hidden="true" size={22} strokeWidth={1.8} />
            </div>
            <div>
              <p className="font-serif text-2xl font-normal text-[#16352B]">
                {dashboard.safety.latestEvent ? "Recent safety support" : "Safety comes first"}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7C7363]">
                {dashboard.safety.latestEvent
                  ? `Latest event: ${dashboard.safety.latestEvent.trigger.replace(/_/g, " ")} · severity ${dashboard.safety.latestEvent.severity}.`
                  : "Every daily check-in starts with a safety gate before workbook guidance, chat, or practices continue."}
              </p>
            </div>
            <div className="ml-auto hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E0E8E1] text-[#3E7A5E] min-[575px]:flex">
              <Check aria-hidden="true" size={18} strokeWidth={2} />
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
