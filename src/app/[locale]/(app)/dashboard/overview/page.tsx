import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { AgentActivitiesCard } from "@/components/overview/agent-activities";
import { AchievementCelebration, OrganicWins } from "@/components/overview/milestones";
import { TrafficSources } from "@/components/overview/traffic-sources";
import { WhatWeLearned } from "@/components/overview/what-we-learned";
import { TRAFFIC_RANGES, type TrafficRange } from "@/lib/traffic";
import { displayDomain } from "@/lib/utils";
import { getAppContext, getBrand } from "@/server/context";
import {
  getAgentDay,
  getBusinessProfile,
  getMilestones,
  getPlannedActions,
  getTrafficSources,
} from "@/server/queries/overview";

function greetingKey(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

export default async function OverviewPage({ searchParams }: PageProps<"/[locale]/dashboard/overview">) {
  const query = await searchParams;
  const context = (await getAppContext())!;
  const site = context.site!;
  const range: TrafficRange = TRAFFIC_RANGES.find((option) => option === query.range) ?? "90d";

  const [day, planned, milestones, profile, traffic, brand, t, tLanguages] = await Promise.all([
    getAgentDay(site, typeof query.date === "string" ? query.date : undefined),
    getPlannedActions(site),
    getMilestones(site.id),
    getBusinessProfile(site),
    getTrafficSources(site, range),
    getBrand(),
    getTranslations("greeting"),
    getTranslations("languages"),
  ]);
  const firstName = context.user.name.split(" ")[0] ?? context.user.name;

  return (
    <>
      <PageHeader title={t(greetingKey(site.timeZone), { name: firstName })} />
      <PageBody>
        <div className={milestones.unseen.length ? "grid items-stretch gap-8 xl:grid-cols-[minmax(0,1fr)_520px]" : ""}>
          <AgentActivitiesCard data={day} planned={planned} />
          <AchievementCelebration unseen={milestones.unseen} brand={brand.name} />
        </div>
        <OrganicWins cards={milestones.cards} brand={brand.name} />
        <WhatWeLearned
          profile={{ ...profile, brandName: profile.brandName ?? displayDomain(site.url) }}
          languageName={tLanguages(site.selectedLanguage as "en")}
        />
        <TrafficSources range={range} {...traffic} />
      </PageBody>
    </>
  );
}
