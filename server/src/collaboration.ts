import express from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  policySchema,
  teamAccess,
  recordTeam,
  type WorkspacePolicy,
} from "./collaborationAccess.js";
import { collaborationTeams } from "./collaborationValidation.js";
import { and, eq, asc, sql } from "drizzle-orm";
import { db, tables } from "./db.js";
import { encryptText, decryptText } from "./crypto.js";
import {
  collaborationWrite,
  collaborationImport,
  collaborationPayloads,
  emptyReports,
} from "./collaborationValidation.js";

type Options = {
  authorize: express.RequestHandler;
  authorizeImport: express.RequestHandler;
  audit: (
    actor: string,
    action: string,
    id?: string,
    detail?: Record<string, unknown>,
  ) => Promise<void>;
};
class ImportValidationError extends Error {}
const maxFileBytes = 12 * 1024 * 1024;
function decode(row: any) {
  return {
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(decryptText(row.payload)),
    revision: row.revision,
    updated_at: row.updatedAt,
    author: decryptText(row.author),
  };
}
function fileInfo(row: any) {
  return {
    id: row.id,
    kind: "file",
    payload: { name: decryptText(row.name), size: row.byteSize },
    revision: 1,
    updated_at: row.createdAt,
    author: decryptText(row.createdBy),
  };
}
function newRow(id: string, kind: string, payload: unknown, author: string) {
  return {
    id,
    kind,
    payload: encryptText(JSON.stringify(payload)),
    author: encryptText(author),
    revision: 1,
    updatedAt: new Date().toISOString(),
  };
}
function error(res: express.Response, e: unknown) {
  console.error("[Collaboration]", e);
  return res.status(503).json({
    message:
      "공유 기록을 처리하지 못했습니다. 입력 내용을 유지하고 다시 시도해 주세요.",
  });
}
export function collaborationRouter({
  authorize,
  authorizeImport,
  audit,
}: Options) {
  const router = express.Router();
  router.use(authorize);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.use(async (_req, res, next) => {
    try {
      const table = tables.collaborationRecords;
      const rows = await db
        .select()
        .from(table)
        .where(sql`${table.kind} NOT IN ('history', 'userstate')`)
        .orderBy(asc(table.updatedAt));
      const decoded = rows.map(decode);
      const policy = policySchema.parse(
        decoded.find(
          (r: any) => r.id === "workspace-policy" && r.kind === "policy",
        )?.payload || { teams: {} },
      );
      const session = res.locals.session;
      res.locals.workspace = {
        rows,
        decoded,
        policy,
        can: (r: any, write = false) =>
          teamAccess(policy, recordTeam(r), session.email, session.role, write),
        fileCan: (id: string, write = false) => {
          const fileScope = decoded.find(
            (r: any) => r.kind === "filescope" && r.payload.file === id,
          );
          if (fileScope?.payload.deleted) return false;
          const scope = fileScope?.payload.team || "전체";
          if (!teamAccess(policy, scope, session.email, session.role, write))
            return false;
          return decoded
            .filter(
              (r: any) =>
                r.kind === "message" && r.payload.attachments?.includes(id),
            )
            .every((r: any) =>
              teamAccess(policy, recordTeam(r), session.email, session.role),
            );
        },
      };
      next();
    } catch (e) {
      error(res, e);
    }
  });
  const stateId = (email: string) =>
    "user-" + createHash("sha256").update(email.toLowerCase()).digest("hex");
  async function state(email: string) {
    const rows = await db
      .select()
      .from(tables.collaborationRecords)
      .where(
        and(
          eq(tables.collaborationRecords.kind, "userstate"),
          sql`${tables.collaborationRecords.id} LIKE ${stateId(email) + "-%"}`,
        ),
      );
    return {
      read: Object.fromEntries(
        rows.map((row: any) => {
          const p = decode(row).payload;
          return [p.channel, p.at];
        }),
      ),
    };
  }
  router.put("/read", async (req, res) => {
    try {
      const b = z
        .object({
          channel: z.enum(["전체", ...collaborationTeams]),
          at: z.string().datetime(),
        })
        .parse(req.body);
      if (
        !teamAccess(
          res.locals.workspace.policy,
          b.channel,
          res.locals.session.email,
          res.locals.session.role,
        )
      )
        return res
          .status(403)
          .json({ message: "이 분과에 접근할 권한이 없습니다." });
      const at = new Date(
        Math.min(new Date(b.at).getTime(), Date.now()),
      ).toISOString();
      const table = tables.collaborationRecords;
      const id =
        stateId(res.locals.session.email) +
        "-" +
        createHash("sha256").update(b.channel).digest("hex");
      const row = newRow(
        id,
        "userstate",
        { channel: b.channel, at },
        res.locals.session.email,
      );
      // updatedAt is the seen-message cutoff; the conditional upsert prevents older tabs moving it backwards.
      row.updatedAt = at;
      await db
        .insert(table)
        .values(row)
        .onConflictDoUpdate({
          target: table.id,
          set: { payload: row.payload, updatedAt: at },
          setWhere: sql`${table.updatedAt} < ${at}`,
        });
      const next = await state(res.locals.session.email);
      res.json({ read: next.read });
    } catch {
      res.status(400).json({ message: "읽음 처리 정보를 확인해 주세요." });
    }
  });
  router.get("/policy", authorizeImport, (_req, res) =>
    res.json({
      policy: res.locals.workspace.policy,
      revision:
        res.locals.workspace.decoded.find(
          (r: any) => r.id === "workspace-policy",
        )?.revision || 0,
    }),
  );
  router.put("/policy", authorizeImport, async (req, res) => {
    try {
      const { policy, revision } = z
        .object({
          policy: policySchema,
          revision: z.number().int().nonnegative(),
        })
        .parse(req.body);
      const table = tables.collaborationRecords;
      const row = newRow(
        "workspace-policy",
        "policy",
        policy,
        res.locals.session.email,
      );
      const changed =
        revision === 0
          ? await db.insert(table).values(row).onConflictDoNothing().returning()
          : await db
              .update(table)
              .set({
                payload: row.payload,
                author: row.author,
                revision: revision + 1,
                updatedAt: row.updatedAt,
              })
              .where(
                and(
                  eq(table.id, row.id),
                  eq(table.kind, "policy"),
                  eq(table.revision, revision),
                ),
              )
              .returning();
      if (!changed.length)
        return res
          .status(409)
          .json({
            message:
              "다른 운영자가 먼저 권한을 변경했습니다. 창을 닫고 다시 열어 최신 설정을 확인해 주세요.",
          });
      await audit(
        res.locals.session.email,
        "collaboration_changed_access_policy",
      );
      res.json({ policy, revision: revision + 1 });
    } catch {
      res
        .status(400)
        .json({ message: "분과와 구성원 이메일을 확인해 주세요." });
    }
  });
  router.get("/records/:id/history", async (req, res) => {
    try {
      const current = res.locals.workspace.decoded.find(
        (r: any) =>
          r.id === req.params.id &&
          ["meeting", "report", "task", "doc"].includes(r.kind),
      );
      if (!current || !res.locals.workspace.can(current))
        return res.status(404).json({ message: "기록을 찾을 수 없습니다." });
      const history = await db
        .select()
        .from(tables.collaborationRecords)
        .where(
          and(
            eq(tables.collaborationRecords.kind, "history"),
            sql`${tables.collaborationRecords.id} LIKE ${current.id + "-history-%"}`,
          ),
        );
      res.json({
        history: history
          .map(decode)
          .map((r: any) => r.payload)
          .filter(
            (r: any) => r.id === current.id && res.locals.workspace.can(r),
          )
          .sort((a: any, b: any) => b.revision - a.revision),
        current,
      });
    } catch (e) {
      error(res, e);
    }
  });
  router.get("/records", async (_req, res) => {
    try {
      const rows = res.locals.workspace.rows;
      const files = await db
        .select({
          id: tables.collaborationFiles.id,
          name: tables.collaborationFiles.name,
          byteSize: tables.collaborationFiles.byteSize,
          createdBy: tables.collaborationFiles.createdBy,
          createdAt: tables.collaborationFiles.createdAt,
        })
        .from(tables.collaborationFiles);
      const workspace = res.locals.workspace;
      const personal = await state(res.locals.session.email);
      res.json({
        records: [
          ...rows
            .filter((r: any) =>
              ["meeting", "report", "task", "doc", "message"].includes(r.kind),
            )
            .map(decode)
            .filter((r: any) => workspace.can(r)),
          ...files
            .filter((r: any) => workspace.fileCan(r.id))
            .map((r: any) => ({
              ...fileInfo(r),
              payload: {
                ...fileInfo(r).payload,
                team:
                  workspace.decoded.find(
                    (d: any) =>
                      d.kind === "filescope" && d.payload.file === r.id,
                  )?.payload.team || "전체",
              },
            })),
        ],
        read: personal.read || {},
        permissions: {
          readTeams: ["전체", ...collaborationTeams].filter((t) =>
            teamAccess(
              workspace.policy,
              t,
              res.locals.session.email,
              res.locals.session.role,
            ),
          ),
          writeTeams: ["전체", ...collaborationTeams].filter((t) =>
            teamAccess(
              workspace.policy,
              t,
              res.locals.session.email,
              res.locals.session.role,
              true,
            ),
          ),
        },
        user: { name: res.locals.session.email, role: res.locals.session.role },
      });
    } catch (e) {
      error(res, e);
    }
  });
  router.delete("/records/:id", async (req, res) => {
    try {
      const table = tables.collaborationRecords;
      const id = String(req.params.id);
      const [row] = await db.select().from(table).where(eq(table.id, id));
      if (!row || row.kind !== "doc") return res.status(404).json({ message: "삭제할 문서를 찾을 수 없습니다." });
      if (!res.locals.workspace.can(decode(row), true)) return res.status(403).json({ message: "문서를 삭제할 권한이 없습니다." });
      const revision = Number(req.body.revision);
      const changed = await db.update(table).set({ kind: "deleted-doc", revision: sql`${table.revision}+1`, updatedAt: new Date().toISOString() })
        .where(and(eq(table.id, id), eq(table.kind, "doc"), eq(table.revision, revision))).returning();
      if (!changed.length) return res.status(409).json({ message: "문서가 변경되었습니다. 최신 내용을 확인한 후 다시 삭제해 주세요." });
      await audit(res.locals.session.email, "collaboration_deleted_document", id);
      res.json({ deleted: true });
    } catch (e) { error(res, e); }
  });
  router.delete("/files/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const [file] = await db.select({ id: tables.collaborationFiles.id }).from(tables.collaborationFiles).where(eq(tables.collaborationFiles.id, id));
      if (!file) return res.status(404).json({ message: "삭제할 자료를 찾을 수 없습니다." });
      if (!res.locals.workspace.fileCan(id, true)) return res.status(403).json({ message: "자료를 삭제할 권한이 없습니다." });
      const scope = res.locals.workspace.decoded.find((r: any) => r.kind === "filescope" && r.payload.file === id);
      // Retain encrypted bytes, but immediately deny listing and downloading the file.
      const row = newRow(`file-scope-${id}`, "filescope", { file: id, team: scope?.payload.team || "전체", deleted: true }, res.locals.session.email);
      await db.insert(tables.collaborationRecords).values(row).onConflictDoUpdate({ target: tables.collaborationRecords.id, set: { payload: row.payload, updatedAt: row.updatedAt } });
      await audit(res.locals.session.email, "collaboration_deleted_file", id);
      res.json({ deleted: true });
    } catch (e) { error(res, e); }
  });
  async function write(
    req: express.Request,
    res: express.Response,
    edit: boolean,
  ) {
    try {
      const b = collaborationWrite.parse(req.body),
        payload = collaborationPayloads[b.kind].parse(b.payload);
      const candidate = { kind: b.kind, payload };
      if (!res.locals.workspace.can(candidate, true))
        return res
          .status(403)
          .json({ message: "이 분과는 읽기 전용이거나 접근 권한이 없습니다." });
      const table = tables.collaborationRecords;
      const [existing] = await db
        .select()
        .from(table)
        .where(eq(table.id, b.id));
      if (existing && !res.locals.workspace.can(decode(existing), true))
        return res
          .status(403)
          .json({ message: "이 기록을 수정할 권한이 없습니다." });
      if (edit && (!existing || existing.kind !== b.kind || !b.revision))
        return res
          .status(404)
          .json({ message: "수정할 기록을 찾을 수 없습니다." });
      if (!edit && existing)
        return res
          .status(409)
          .json({ message: "같은 기록이 이미 존재합니다." });
      if (b.kind === "report") {
        const p = payload as any;
        if (!edit)
          return res.status(400).json({
            message: "회의를 생성하면 분과 작성란이 자동으로 생성됩니다.",
          });
        const old = decode(existing).payload;
        if (old.team !== p.team || old.meeting !== p.meeting)
          return res
            .status(400)
            .json({ message: "기록의 회의와 분과는 변경할 수 없습니다." });
      }
      if (b.kind === "message") {
        for (const id of (payload as any).attachments) {
          const [file] = await db
            .select({ id: tables.collaborationFiles.id })
            .from(tables.collaborationFiles)
            .where(eq(tables.collaborationFiles.id, id));
          if (!res.locals.workspace.fileCan(id))
            return res
              .status(403)
              .json({ message: "첨부 파일 접근 권한이 없습니다." });
          const scope =
            res.locals.workspace.decoded.find(
              (r: any) => r.kind === "filescope" && r.payload.file === id,
            )?.payload.team || "전체";
          if (scope !== "전체" && scope !== (payload as any).channel)
            return res
              .status(400)
              .json({
                message: "분과 전용 첨부는 같은 분과에서만 공유할 수 있습니다.",
              });
          if (!file)
            return res
              .status(400)
              .json({
                message: "첨부 파일을 찾을 수 없습니다. 다시 선택해 주세요.",
              });
        }
        const p = payload as any;
        if (edit)
          return res
            .status(400)
            .json({ message: "대화는 새로운 메시지로 작성해 주세요." });
        if (p.parent) {
          const [parent] = await db
            .select()
            .from(table)
            .where(eq(table.id, p.parent));
          if (
            !parent ||
            parent.kind !== "message" ||
            decode(parent).payload.channel !== p.channel ||
            decode(parent).payload.parent
          )
            return res
              .status(400)
              .json({ message: "답글을 작성할 대화를 확인해 주세요." });
        }
      }
      if (b.kind === "task" && (payload as any).meeting) {
        const [meeting] = await db
          .select({ kind: table.kind })
          .from(table)
          .where(eq(table.id, (payload as any).meeting));
        if (!meeting || meeting.kind !== "meeting")
          return res
            .status(400)
            .json({ message: "관련 회의를 찾을 수 없습니다." });
      }
      const author = res.locals.session.email;
      let row: any;
      if (edit) {
        await db
          .insert(table)
          .values(
            newRow(
              `${b.id}-history-${existing.revision}`,
              "history",
              decode(existing),
              author,
            ),
          )
          .onConflictDoNothing();
        const rows = await db
          .update(table)
          .set({
            payload: encryptText(JSON.stringify(payload)),
            author: encryptText(author),
            revision: sql`${table.revision}+1`,
            updatedAt: new Date().toISOString(),
          })
          .where(and(eq(table.id, b.id), eq(table.revision, b.revision!)))
          .returning();
        if (!rows.length)
          return res.status(409).json({
            message:
              "다른 구성원이 먼저 수정했습니다. 입력한 내용을 보관한 뒤 최신 기록을 불러와 주세요.",
          });
        row = rows[0];
      } else {
        const values = [newRow(b.id, b.kind, payload, author)];
        if (b.kind === "meeting")
          values.push(
            ...emptyReports(b.id).map((r) =>
              newRow(r.id, r.kind, r.payload, author),
            ),
          );
        const rows = await db.insert(table).values(values).returning();
        row = rows.find((r: any) => r.id === b.id);
      }
      await audit(
        author,
        edit ? "collaboration_updated_record" : "collaboration_created_record",
        b.id,
        { kind: b.kind },
      );
      return res.json({ record: decode(row) });
    } catch (e) {
      if (e instanceof Error && e.name === "ZodError")
        return res
          .status(400)
          .json({ message: "필수 항목, 날짜와 입력 길이를 확인해 주세요." });
      return error(res, e);
    }
  }
  router.post("/records", (req, res) => void write(req, res, false));
  router.put("/records/:id", (req, res) => {
    if (req.params.id !== req.body.id)
      return res
        .status(400)
        .json({ message: "기록 번호가 일치하지 않습니다." });
    void write(req, res, true);
  });
  router.post("/records/:id/restore", async (req, res) => {
    try {
      const b = z
        .object({
          version: z.number().int().positive(),
          revision: z.number().int().positive(),
        })
        .parse(req.body);
      const [snapshot] = await db
        .select()
        .from(tables.collaborationRecords)
        .where(
          eq(
            tables.collaborationRecords.id,
            `${req.params.id}-history-${b.version}`,
          ),
        );
      if (!snapshot || snapshot.kind !== "history")
        return res
          .status(404)
          .json({ message: "수정 이력을 찾을 수 없습니다." });
      const old = decode(snapshot).payload;
      if (
        old.id !== req.params.id ||
        !["meeting", "report", "task", "doc"].includes(old.kind)
      )
        return res
          .status(400)
          .json({ message: "복원할 기록이 올바르지 않습니다." });
      req.body = {
        id: old.id,
        kind: old.kind,
        payload: old.payload,
        revision: b.revision,
      };
      await write(req, res, true);
    } catch {
      res.status(400).json({ message: "복원할 버전을 확인해 주세요." });
    }
  });
  router.post("/import", authorizeImport, async (req, res) => {
    try {
      const data = collaborationImport.parse(req.body);
      const ids = new Set<string>();
      const prepared = data.records.map((r) => {
        if (ids.has(r.id))
          throw new ImportValidationError("중복된 기록 번호가 있습니다.");
        ids.add(r.id);
        return {
          ...r,
          payload: collaborationPayloads[r.kind].parse(r.payload),
        };
      });
      const table = tables.collaborationRecords;
      const existing = await db
        .select({ id: table.id, kind: table.kind, payload: table.payload })
        .from(table);
      const lookup = new Map<string, { kind: string; payload: any }>(
        existing.map((r: any) => [
          r.id,
          { kind: r.kind, payload: JSON.parse(decryptText(r.payload)) },
        ]),
      );
      if (prepared.some((r) => lookup.has(r.id)))
        return res.status(409).json({
          message:
            "이미 가져온 기록이 포함되어 있습니다. 기존 기록은 덮어쓰지 않습니다.",
        });
      prepared.forEach((r) => lookup.set(r.id, r));
      for (const r of prepared) {
        const p: any = r.payload;
        if (r.kind === "report" && lookup.get(p.meeting)?.kind !== "meeting")
          throw new ImportValidationError(
            "분과 기록에 연결된 회의가 없습니다.",
          );
        if (
          r.kind === "task" &&
          p.meeting &&
          lookup.get(p.meeting)?.kind !== "meeting"
        )
          throw new ImportValidationError("업무에 연결된 회의가 없습니다.");
        if (r.kind === "message") {
          for (const id of p.attachments) {
            const [file] = await db
              .select({ id: tables.collaborationFiles.id })
              .from(tables.collaborationFiles)
              .where(eq(tables.collaborationFiles.id, id));
            const scope =
              res.locals.workspace.decoded.find(
                (d: any) => d.kind === "filescope" && d.payload.file === id,
              )?.payload.team || "전체";
            if (scope !== "전체" && scope !== p.channel)
              throw new ImportValidationError(
                "분과 전용 첨부는 같은 분과에서만 가져올 수 있습니다.",
              );
            if (!file)
              throw new ImportValidationError(
                "대화의 첨부 파일이 없습니다. 원래 공간에서 파일을 별도로 보관해 주세요.",
              );
          }
        }
        if (r.kind === "message" && p.parent) {
          const parent = lookup.get(p.parent);
          if (
            !parent ||
            parent.kind !== "message" ||
            parent.payload.parent ||
            parent.payload.channel !== p.channel
          )
            throw new ImportValidationError(
              "답글의 채널과 원본 대화를 확인해 주세요.",
            );
        }
      }
      const reportKeys = [...lookup.values()]
        .filter((r) => r.kind === "report")
        .map((r) => {
          const p: any = r.payload;
          return p.meeting + ":" + p.team;
        });
      if (new Set(reportKeys).size !== reportKeys.length)
        throw new ImportValidationError(
          "같은 회의의 분과 기록이 중복되어 있습니다.",
        );
      for (const r of prepared.filter((r) => r.kind === "meeting")) {
        if (reportKeys.filter((k) => k.startsWith(r.id + ":")).length !== 8)
          throw new ImportValidationError(
            "각 회의에는 8개 분과 기록이 필요합니다.",
          );
      }
      await db
        .insert(table)
        .values(
          prepared.map((r) =>
            newRow(
              r.id,
              r.kind,
              r.payload,
              r.author || res.locals.session.email,
            ),
          ),
        );
      await audit(
        res.locals.session.email,
        "collaboration_imported_records",
        undefined,
        { count: prepared.length },
      );
      res.json({ count: prepared.length });
    } catch (e) {
      res.status(400).json({
        message:
          e instanceof ImportValidationError
            ? e.message
            : "가져오기 파일을 처리하지 못했습니다. 형식을 확인하고 다시 시도해 주세요.",
      });
    }
  });
  let activeUploads = 0;
  router.post(
    "/files",
    (req, res, next) => {
      if (activeUploads >= 2)
        return res.status(429).json({
          message: "자료 업로드 중입니다. 잠시 후 다시 시도해 주세요.",
        });
      activeUploads++;
      let done = false;
      const release = () => {
        if (!done) {
          done = true;
          activeUploads--;
        }
      };
      res.once("finish", release);
      res.once("close", release);
      next();
    },
    express.raw({ type: "application/octet-stream", limit: maxFileBytes }),
    async (req, res) => {
      try {
        let name: string;
        try {
          name = decodeURIComponent(req.header("X-File-Name") || "");
        } catch {
          return res
            .status(400)
            .json({ message: "파일 이름을 확인해 주세요." });
        }
        if (
          !name ||
          name.startsWith("enc:v1:") ||
          name.length > 240 ||
          /[\x00-\x1f/\\]/.test(name) ||
          !Buffer.isBuffer(req.body) ||
          !req.body.length
        )
          return res
            .status(400)
            .json({ message: "파일 이름과 내용을 확인해 주세요." });
        const team = z
          .enum(["전체", ...collaborationTeams])
          .parse(req.query.team || "전체");
        if (
          !teamAccess(
            res.locals.workspace.policy,
            team,
            res.locals.session.email,
            res.locals.session.role,
            true,
          )
        )
          return res
            .status(403)
            .json({ message: "이 분과에 자료를 올릴 권한이 없습니다." });
        const row = {
          id: crypto.randomUUID(),
          name: encryptText(name),
          content: encryptText(req.body.toString("base64")),
          byteSize: req.body.length,
          createdBy: encryptText(res.locals.session.email),
          createdAt: new Date().toISOString(),
        };
        // Store scope first: a failed file write leaves an inert scope, never an unscoped private file.
        await db
          .insert(tables.collaborationRecords)
          .values(
            newRow(
              `file-scope-${row.id}`,
              "filescope",
              { file: row.id, team },
              res.locals.session.email,
            ),
          );
        await db.insert(tables.collaborationFiles).values(row);
        await audit(
          res.locals.session.email,
          "collaboration_uploaded_file",
          row.id,
          { size: row.byteSize },
        );
        res.json({
          record: {
            ...fileInfo(row),
            payload: { ...fileInfo(row).payload, team },
          },
        });
      } catch (e) {
        error(res, e);
      }
    },
  );
  router.get("/files/:id", async (req, res) => {
    try {
      const [row] = await db
        .select()
        .from(tables.collaborationFiles)
        .where(eq(tables.collaborationFiles.id, String(req.params.id)));
      if (!row || !res.locals.workspace.fileCan(row.id))
        return res.status(404).json({ message: "자료를 찾을 수 없습니다." });
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(decryptText(row.name))}`,
      );
      res.send(Buffer.from(decryptText(row.content), "base64"));
    } catch (e) {
      error(res, e);
    }
  });
  router.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err.type === "entity.too.large")
        return res
          .status(413)
          .json({ message: "파일은 12MB 이하로 업로드해 주세요." });
      error(res, err);
    },
  );
  return router;
}
