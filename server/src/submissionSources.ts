export function paperSourceMismatchIds(
  auditedApplicationIds: Array<string | null | undefined>,
  applications: Array<{ id: string; submissionSource?: string }>
) {
  const paperIds = new Set(auditedApplicationIds.filter((id): id is string => Boolean(id)));
  return applications
    .filter((application) => paperIds.has(application.id) && application.submissionSource !== "paper")
    .map((application) => application.id);
}
