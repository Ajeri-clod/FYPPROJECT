import {
  BuildingsIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/oku/PageHeader";
import { SampleDataBadge, SourceNote } from "@/components/oku/SourceNote";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { allJobsQuery } from "@/features/jobs/queries";
import { parseSkills } from "@/features/jobs/schema";
import {
  CandidateSelect,
  CUSTOM_PROFILE,
} from "@/features/matching/CandidateSelect";
import {
  candidateText,
  sampleCandidates,
} from "@/features/matching/candidates";
import { candidateSkillGap } from "@/features/matching/skill-gap";
import { rankBySimilarity } from "@/features/matching/tfidf";
import { formatSalaryRange } from "@/lib/oku-format";

const searchSchema = z.object({
  candidate: z.string().optional().default(sampleCandidates[0].id),
  nearby: z.boolean().optional().default(false),
});

export const Route = createFileRoute("/_app/recommendations")({
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(allJobsQuery()),
  component: RecommendationsPage,
});

const TOP_N = 8;

function RecommendationsPage() {
  const { candidate: candidateId, nearby } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: jobs } = useSuspenseQuery(allJobsQuery());
  const [customSkills, setCustomSkills] = useState(
    "customer service, Microsoft Excel, Bahasa Malaysia",
  );

  const isCustom = candidateId === CUSTOM_PROFILE;
  const candidate =
    sampleCandidates.find((c) => c.id === candidateId) ?? sampleCandidates[0];
  const profileSkills = isCustom ? customSkills : candidate.skills;
  const profileText = isCustom ? customSkills : candidateText(candidate);

  const ranked = useMemo(() => {
    const pool = jobs.filter(
      (j) =>
        j.status === "open" &&
        (!nearby || isCustom || j.district === candidate.district),
    );
    return rankBySimilarity(
      profileText,
      pool.map((job) => ({
        id: job.id,
        text: `${job.skills}, ${job.title}, ${job.description ?? ""}`,
        job,
      })),
    )
      .filter((r) => r.score > 0)
      .slice(0, TOP_N);
  }, [jobs, profileText, nearby, isCustom, candidate.district]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Job Recommendations"
        description="Open vacancies ranked by how closely their requirements match a job-seeker's skills (TF-IDF + cosine similarity)."
        actions={<SampleDataBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">Job-seeker</CardTitle>
            <CardDescription>
              Choose a profile, or type skills to test the matcher.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CandidateSelect
              value={isCustom ? CUSTOM_PROFILE : candidate.id}
              allowCustom
              onChange={(id) =>
                navigate({ search: (s) => ({ ...s, candidate: id }) })
              }
            />

            {isCustom ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-skills">Skills (comma-separated)</Label>
                <Textarea
                  id="custom-skills"
                  rows={4}
                  value={customSkills}
                  onChange={(e) => setCustomSkills(e.target.value)}
                />
              </div>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">District</dt>
                <dd>{candidate.district}</dd>
                <dt className="text-muted-foreground">Age group</dt>
                <dd>{candidate.ageBand}</dd>
                <dt className="text-muted-foreground">Education</dt>
                <dd>{candidate.education}</dd>
                <dt className="text-muted-foreground">Experience</dt>
                <dd>{candidate.experience}</dd>
              </dl>
            )}

            <div className="flex flex-wrap gap-1">
              {parseSkills(profileSkills).map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>

            {!isCustom ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="nearby"
                  checked={nearby}
                  onCheckedChange={(checked) =>
                    navigate({ search: (s) => ({ ...s, nearby: checked }) })
                  }
                />
                <Label htmlFor="nearby">
                  Only jobs in {candidate.district}
                </Label>
              </div>
            ) : null}

            <p className="flex items-start gap-1.5 border-t pt-3 text-xs text-muted-foreground">
              <ShieldCheckIcon size={14} className="mt-px shrink-0" />
              Fair by design: only skills, education and experience are scored.
              Disability category, gender, ethnicity and age are never used.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 lg:col-span-2">
          {ranked.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No open postings share skills with this profile
                {nearby ? ` in ${candidate.district}` : ""}.
              </CardContent>
            </Card>
          ) : (
            ranked.map((r, index) => {
              const { job } = r.item;
              const gap = candidateSkillGap(profileSkills, job.skills);
              const score = Math.round(r.score * 100);
              return (
                <Card key={job.id}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          #{index + 1}
                        </p>
                        <h3 className="font-medium">{job.title}</h3>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BuildingsIcon size={12} />
                            {job.employer}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPinIcon size={12} />
                            {job.district}
                          </span>
                          <span>{job.employmentType}</span>
                          <span>
                            RM {formatSalaryRange(job.salaryMin, job.salaryMax)}
                          </span>
                        </p>
                      </div>
                      <div className="w-28 shrink-0 text-right">
                        <p className="text-2xl font-semibold tabular-nums">
                          {score}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          match score
                        </p>
                        <Progress value={score} className="mt-1" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {gap.matched.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                        >
                          ✓ {s}
                        </Badge>
                      ))}
                      {gap.missing.map((s) => (
                        <Badge key={s} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>

                    {job.accommodations ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Accommodations:
                        </span>{" "}
                        {job.accommodations}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <SourceNote>
        Content-Based Filtering: profile and job texts → TF-IDF vectors → cosine
        similarity, ranked high to low. ✓ marks required skills the job-seeker
        already has. Job-seeker profiles are synthetic samples until real
        profiles are collected.
      </SourceNote>
    </div>
  );
}
