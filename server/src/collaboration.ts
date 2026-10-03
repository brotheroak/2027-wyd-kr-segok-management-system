import express from "express";
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
  router.get("/records", async (_req, res) => {
    try {
      const rows = await db
        .select()
        .from(tables.collaborationRecords)
        .orderBy(asc(tables.collaborationRecords.updatedAt));
      const files = await db
        .select({
          id: tables.collaborationFiles.id,
          name: tables.collaborationFiles.name,
          byteSize: tables.collaborationFiles.byteSize,
          createdBy: tables.collaborationFiles.createdBy,
          createdAt: tables.collaborationFiles.createdAt,
        })
        .from(tables.collaborationFiles);
      res.json({
        records: [...rows.map(decode), ...files.map(fileInfo)],
        user: { name: res.locals.session.email, role: res.locals.session.role },
      });
    } catch (e) {
      error(res, e);
    }
  });
  async function write(
    req: express.Request,
    res: express.Response,
    edit: boolean,
  ) {
    try {
      const b = collaborationWrite.parse(req.body),
        payload = collaborationPayloads[b.kind].parse(b.payload);
      const table = tables.collaborationRecords;
      const [existing] = await db
        .select()
        .from(table)
        .where(eq(table.id, b.id));
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
        const row = {
          id: crypto.randomUUID(),
          name: encryptText(name),
          content: encryptText(req.body.toString("base64")),
          byteSize: req.body.length,
          createdBy: encryptText(res.locals.session.email),
          createdAt: new Date().toISOString(),
        };
        await db.insert(tables.collaborationFiles).values(row);
        await audit(
          res.locals.session.email,
          "collaboration_uploaded_file",
          row.id,
          { size: row.byteSize },
        );
        res.json({ record: fileInfo(row) });
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
      if (!row)
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
