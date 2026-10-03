import { z } from "zod";
export const collaborationTeams = [
  "총괄",
  "대외협력(재정)",
  "홈스테이",
  "교육",
  "청소년",
  "시설",
  "전산",
  "회계",
] as const;
const team = z.enum(["전체", ...collaborationTeams]);
const text = z.string().max(30000),
  title = z.string().trim().min(1).max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "날짜가 올바르지 않습니다.",
  );
export const collaborationPayloads = {
  meeting: z.object({
    title,
    date,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    location: text,
    attendees: text,
    status: z.enum(["작성 중", "진행 중", "완료"]),
  }),
  report: z.object({
    meeting: z.string().min(1).max(100),
    team: z.enum(collaborationTeams),
    author: z.string().max(200),
    progress: text,
    discussion: text,
    requests: text,
    decisions: text,
    plans: text,
  }),
  task: z.object({
    title,
    team,
    owner: z.string().max(200),
    due: z.union([date, z.literal("")]),
    status: z.enum(["할 일", "진행 중", "완료"]),
    notes: text,
    meeting: z.string().max(100).default(""),
  }),
  doc: z.object({ title, team, content: text }),
  message: z.object({
    channel: team,
    content: z.string().trim().min(1).max(5000),
    parent: z.string().max(100).default(""),
  }),
};
export const collaborationWrite = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  kind: z.enum(["meeting", "report", "task", "doc", "message"]),
  payload: z.unknown(),
  revision: z.number().int().positive().optional(),
});
export const collaborationImport = z.object({
  format: z.literal("wyd-collaboration-v1"),
  records: z
    .array(
      collaborationWrite.extend({ author: z.string().max(200).optional() }),
    )
    .min(1)
    .max(1000),
});
export function emptyReports(meeting: string) {
  return collaborationTeams.map((team, i) => ({
    id: `${meeting}-report-${i}`,
    kind: "report",
    payload: {
      meeting,
      team,
      author: "",
      progress: "",
      discussion: "",
      requests: "",
      decisions: "",
      plans: "",
    },
  }));
}
