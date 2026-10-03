import { z } from "zod";
import { collaborationTeams } from "./collaborationValidation.js";
export const policySchema = z.object({
  teams: z.record(
    z.enum(collaborationTeams),
    z.object({
      private: z.boolean(),
      members: z
        .array(
          z
            .string()
            .email()
            .transform((s) => s.toLowerCase()),
        )
        .max(300),
      readOnly: z
        .array(
          z
            .string()
            .email()
            .transform((s) => s.toLowerCase()),
        )
        .max(300),
    }),
  ),
});
export type WorkspacePolicy = z.infer<typeof policySchema>;
export function teamAccess(
  policy: WorkspacePolicy,
  team: string,
  email: string,
  role: string,
  write = false,
) {
  if (role !== "committee") return true;
  const rule = policy.teams[team as (typeof collaborationTeams)[number]];
  if (!rule) return true;
  email = email.toLowerCase();
  if (rule.private && !rule.members.includes(email)) return false;
  return !write || !rule.readOnly.includes(email);
}
export function recordTeam(record: { kind: string; payload: any }) {
  return record.kind === "message"
    ? record.payload.channel
    : record.payload.team || "전체";
}
