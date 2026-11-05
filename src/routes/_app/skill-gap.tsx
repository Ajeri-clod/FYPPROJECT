import {
  ChartBarHorizontalIcon,
  GraduationCapIcon,
  TargetIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { BarChart, ChartCard, StatCard } from "@/components/charts";
import { PageHeader } from "@/components/oku/PageHeader";
import { RankedBars } from "@/components/oku/RankedBars";
import { SampleDataBadge, SourceNote } from "@/components/oku/SourceNote";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { allJobsQuery } from "@/features/jobs/queries";
import { CandidateSelect } from "@/features/matching/CandidateSelect";
import {
  candidateText,
  sampleCandidates,
} from "@/features/matching/candidates";
import {
  candidateSkillGap,
  skillGapTable,
} from "@/features/matching/skill-gap";
import { rankBySimilarity } from "@/features/matching/tfidf";
import { formatPercent } from "@/lib/oku-format";

const searchSchema = z.object({
  candidate: z.string().optional().default(sampleCandidates[0].id),
});

export const Route = createFileRoute("/_app/skill-gap")({
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(allJobsQuery()),
  component: SkillGapPage,
});

function SkillGapPage() {
  const { candidate: candidateId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: jobs } = useSuspenseQuery(allJobsQuery());

  const open = useMemo(() => jobs.filter((j) => j.status === "open"), [jobs]);

  const gaps = useMemo(
    () =>
      skillGapTable(
        open.map((j) => j.skills),
        sampleCandidates.map((c) => c.skills),
      ),
    [open],
  );
  const shortages = gaps.filter((g) => g.gap > 0);
  const chartRows = shortages.slice(0, 10).map((g) => ({
    skill: g.skill,
    demand: Math.round(g.demand),
    supply: Math.round(g.supply),
  }));

  const candidate =
    sampleCandidates.find((c) => c.id === candidateId) ?? sampleCandidates[0];
  const personal = useMemo(() => {
    const top = rankBySimilarity(
      candidateText(candidate),
      open.map((job) => ({ id: job.id, text: job.skills, job })),
    ).slice(0, 3);
    const rows = top.map((r) => ({
      job: r.item.job,
      gap: candidateSkillGap(candidate.skills, r.item.job.skills),
    }));
    // Training priorities: missing skills across the top matches, weighted by
    // how much the market demands them.
    const demand = new Map(gaps.map((g) => [g.skill.toLowerCase(), g.demand]));
    const missing = new Map<string, number>();
    for (const row of rows) {
      for (const s of row.gap.missing) {
        missing.set(s, demand.get(s.toLowerCase()) ?? 0);
      }
    }
    const training = [...missing.entries()]
      .map(([skill, d]) => ({ skill, demand: d }))
      .sort((a, b) => b.demand - a.demand);
    return { rows, training };
  }, [candidate, open, gaps]);

  const avgCoverage =
    personal.rows.reduce((s, r) => s + r.gap.coverage, 0) /
    Math.max(1, personal.rows.length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Skill-Gap Analytics"
        description="Where job-seekers' skills fall short of what employers ask for, across Selangor and for each individual."
        actions={<SampleDataBadge label="Sample job-seekers" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Skills demanded"
          value={String(gaps.length)}
          icon={ChartBarHorizontalIcon}
          sub={`Across ${open.length} open postings`}
        />
        <StatCard
          label="Skills in shortage"
          value={String(shortages.length)}
          icon={WarningCircleIcon}
          progress={(shortages.length / Math.max(1, gaps.length)) * 100}
          sub="Demanded more often than job-seekers have them"
        />
        <StatCard
          label="Largest gap"
          value={shortages[0]?.skill ?? "—"}
          icon={TargetIcon}
          sub={
            shortages[0]
              ? `${Math.round(shortages[0].gap)} pts: ${formatPercent(shortages[0].demand, 0)} of jobs vs ${formatPercent(shortages[0].supply, 0)} of job-seekers`
              : undefined
          }
        />
        <StatCard
          label="Training priorities"
          value={String(shortages.filter((g) => g.gap >= 10).length)}
          icon={GraduationCapIcon}
          sub="Skills with a gap of 10 pts or more"
        />
      </div>

      <ChartCard title="Demand vs supply — top 10 shortages (% of postings / % of job-seekers)">
        <BarChart
          data={chartRows}
          xKey="skill"
          bars={[
            { key: "demand", label: "Employers requiring (%)" },
            { key: "supply", label: "Job-seekers with skill (%)" },
          ]}
          forceBars
          showLegend
          height={320}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Individual skill gap"
          className="lg:col-span-2"
          action={
            <CandidateSelect
              value={candidate.id}
              onChange={(id) => navigate({ search: { candidate: id } })}
            />
          }
        >
          <p className="mb-3 text-sm text-muted-foreground">
            {candidate.id} covers{" "}
            <span className="font-medium text-foreground">
              {formatPercent(avgCoverage, 0)}
            </span>{" "}
            of the required skills of their three best-matched jobs.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Best-matched job</TableHead>
                <TableHead>Has</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personal.rows.map(({ job, gap }) => (
                <TableRow key={job.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">{job.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.employer}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {gap.matched.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {gap.missing.map((s) => (
                        <Badge key={s} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {formatPercent(gap.coverage, 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartCard>
        <ChartCard title={`Suggested training for ${candidate.id}`}>
          {personal.training.length ? (
            <RankedBars
              items={personal.training.map((t) => ({
                label: t.skill,
                value: t.demand,
              }))}
              format={(v) => `${formatPercent(v, 0)} of jobs`}
              max={100}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No gaps — this job-seeker already has every skill their top
              matches require.
            </p>
          )}
        </ChartCard>
      </div>

      <SourceNote>
        Demand = share of open postings listing the skill. Supply = share of
        job-seeker profiles listing it. Both currently use sample data.
      </SourceNote>
    </div>
  );
}
