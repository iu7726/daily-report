import { ReportRow } from "@/components/ReportCard";
import { SecuritySkillNote } from "@/components/SkillCallout";
import { getAllTaskIds, getReportsByTask, getTaskTitle } from "@/lib/reports";
import { pageMetadata } from "@/lib/seo";
import { getTaskInfo } from "@/lib/tasks";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTaskIds().map((task) => ({ task }));
}

function describe(task: string) {
  return getTaskInfo(task)?.description ?? `${getTaskTitle(task)} 보고서 목록`;
}

export async function generateMetadata({ params }: PageProps<"/[task]">) {
  const { task } = await params;
  return pageMetadata({ path: `/${task}`, title: getTaskTitle(task), description: describe(task) });
}

export default async function TaskPage({ params }: PageProps<"/[task]">) {
  const { task } = await params;
  const reports = getReportsByTask(task);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{getTaskTitle(task)}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{describe(task)}</p>
      </header>

      {task === "security-daily-report" && <SecuritySkillNote />}

      {reports.length > 0 ? (
        <div className="flex flex-col divide-y divide-line border-y border-line">
          {reports.map((report) => (
            <ReportRow key={report.date} report={report} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
          아직 보고서가 없습니다.
        </p>
      )}
    </div>
  );
}
