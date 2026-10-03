import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "./password.js";

test("collaboration shares staff sessions, rejects applicant access, and persists records atomically", async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "wyd-collaboration-"));
  const net = createServer();
  await new Promise<void>((resolve) => net.listen(0, "127.0.0.1", resolve));
  const port = (net.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    net.close((err) => (err ? reject(err) : resolve())),
  );
  const env = {
    ...process.env,
    DATABASE_URL: "",
    DATA_DIR: dataDir,
    DATA_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    NODE_ENV: "test",
    PORT: String(port),
    INITIAL_ADMIN_EMAIL: "",
    INITIAL_ADMIN_PASSWORD: "",
    RATE_LIMIT_MAX: "1000",
  };
  execFileSync(process.execPath, ["scripts/setup-db.mjs"], {
    env,
    stdio: "pipe",
  });
  const sqlite = new DatabaseSync(path.join(dataDir, "wyd-homestay.sqlite"));
  const password = "test-" + randomBytes(16).toString("hex");
  const now = new Date().toISOString();
  for (const [id, role, status] of [
    ["member", "committee", "approved"],
    ["operator", "admin", "approved"],
    ["waiting", "committee", "pending"],
  ])
    sqlite
      .prepare(
        "INSERT INTO admins (id,email,password_hash,role,status,mfa_secret,mfa_enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,0,?,?)",
      )
      .run(
        id,
        id + "@example.test",
        hashPassword(password),
        role,
        status,
        "TEST",
        now,
        now,
      );
  const applicantToken = randomUUID();
  sqlite
    .prepare(
      "INSERT INTO sessions(token,email,role,expires_at,created_at) VALUES (?,?,?,?,?)",
    )
    .run(
      applicantToken,
      "applicant@example.test",
      "user",
      new Date(Date.now() + 3600000).toISOString(),
      now,
    );
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/src/index.ts"],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  child.stdout.on("data", (data) => {
    logs += String(data);
  });
  child.stderr.on("data", (data) => {
    logs += String(data);
  });
  const origin = `http://127.0.0.1:${port}`;
  async function request(
    route: string,
    token?: string,
    method = "GET",
    body?: unknown,
  ) {
    const response = await fetch(origin + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  }
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin + "/api/ready")).ok) break;
      } catch {}
      if (i === 99) throw Error("server did not start: " + logs);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal((await request("/api/collaboration/records")).status, 401);
    assert.equal(
      (await request("/api/collaboration/records", applicantToken)).status,
      403,
    );
    const login = await request("/api/admin/login", undefined, "POST", {
      email: "member@example.test",
      password,
    });
    assert.equal(login.status, 200);
    assert.equal(login.data.role, "committee");
    const member = login.data.token;
    assert.equal(
      (
        await request("/api/admin/login", undefined, "POST", {
          email: "waiting@example.test",
          password,
        })
      ).status,
      403,
    );
    for (const route of [
      "/api/admin/applications",
      "/api/admin/volunteers",
      "/api/admin/users",
      "/api/attendance/checkpoints",
    ])
      assert.equal((await request(route, member)).status, 403, route);
    assert.equal(
      (await request("/api/admin/session", member)).data.role,
      "committee",
    );
    const id = randomUUID();
    const meeting = {
      title: "테스트 회의",
      date: "2026-10-03",
      time: "10:00",
      location: "테스트 장소",
      attendees: "",
      status: "작성 중",
    };
    assert.equal(
      (
        await request("/api/collaboration/records", member, "POST", {
          id,
          kind: "meeting",
          payload: meeting,
        })
      ).status,
      200,
    );
    let loaded = await request("/api/collaboration/records", member);
    let reports = loaded.data.records.filter(
      (r: any) => r.kind === "report" && r.payload.meeting === id,
    );
    assert.equal(reports.length, 8);
    const r = reports[0];
    const body = {
      id: r.id,
      kind: "report",
      payload: { ...r.payload, progress: "비공개 회의 진행 내용" },
      revision: 1,
    };
    assert.equal(
      (await request("/api/collaboration/records/" + r.id, member, "PUT", body))
        .status,
      200,
    );
    assert.equal(
      (
        await request("/api/collaboration/records/" + r.id, member, "PUT", {
          ...body,
          payload: { ...body.payload, progress: "이전 내용" },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/api/collaboration/records/" + r.id, member, "PUT", {
          ...body,
          revision: 2,
          payload: { ...body.payload, team: "회계" },
        })
      ).status,
      400,
    );
    const stored = sqlite
      .prepare("SELECT payload,author FROM collaboration_records WHERE id=?")
      .get(r.id) as { payload: string; author: string };
    assert.ok(stored.payload.startsWith("enc:v1:"));
    assert.ok(!stored.payload.includes("비공개"));
    assert.ok(stored.author.startsWith("enc:v1:"));
    const post = randomUUID();
    assert.equal(
      (
        await request("/api/collaboration/records", member, "POST", {
          id: post,
          kind: "message",
          payload: { channel: "총괄", content: "함께 논의합니다." },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("/api/collaboration/records", member, "POST", {
          id: randomUUID(),
          kind: "message",
          payload: { channel: "총괄", content: "답글입니다.", parent: post },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("/api/collaboration/records", member, "POST", {
          id: randomUUID(),
          kind: "message",
          payload: { channel: "회계", content: "잘못된 답글", parent: post },
        })
      ).status,
      400,
    );
    for (const [kind, payload] of [
      [
        "doc",
        { title: "공유 문서", team: "전체", content: "# 안내\n- 준비 내용" },
      ],
      [
        "task",
        {
          title: "후속 업무",
          team: "전산",
          owner: "담당자",
          due: "2026-10-10",
          status: "할 일",
          notes: "준비 사항",
          meeting: id,
        },
      ],
    ])
      assert.equal(
        (
          await request("/api/collaboration/records", member, "POST", {
            id: randomUUID(),
            kind,
            payload,
          })
        ).status,
        200,
      );
    assert.equal(
      (
        await request("/api/collaboration/records", member, "POST", {
          id: randomUUID(),
          kind: "meeting",
          payload: { ...meeting, date: "2026-02-30" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/api/collaboration/import", member, "POST", {
          format: "wyd-collaboration-v1",
          records: [],
        })
      ).status,
      403,
    );
    const adminLogin = await request("/api/admin/login", undefined, "POST", {
      email: "operator@example.test",
      password,
    });
    assert.equal(adminLogin.status, 200);
    const operator = adminLogin.data.token;
    const docId = randomUUID();
    const backup = {
      format: "wyd-collaboration-v1",
      records: [
        {
          id: docId,
          kind: "doc",
          payload: {
            title: "가져온 문서",
            team: "전체",
            content: "가져오기 확인",
          },
          author: "이전 작성자",
        },
      ],
    };
    assert.equal(
      (await request("/api/collaboration/import", operator, "POST", backup))
        .status,
      200,
    );
    assert.equal(
      (await request("/api/collaboration/import", operator, "POST", backup))
        .status,
      409,
    );
    const invalid = {
      format: "wyd-collaboration-v1",
      records: [
        {
          id: randomUUID(),
          kind: "doc",
          payload: { title: "저장되면 안 됨", team: "전체", content: "" },
        },
        {
          id: randomUUID(),
          kind: "report",
          payload: { ...r.payload, meeting: "없는 회의" },
        },
      ],
    };
    assert.equal(
      (await request("/api/collaboration/import", operator, "POST", invalid))
        .status,
      400,
    );
    assert.equal(
      sqlite
        .prepare("SELECT count(*) AS n FROM collaboration_records WHERE id=?")
        .get(invalid.records[0].id)?.n,
      0,
    );
    const duplicateReport = {
      format: "wyd-collaboration-v1",
      records: [{ id: randomUUID(), kind: "report", payload: r.payload }],
    };
    assert.equal(
      (
        await request(
          "/api/collaboration/import",
          operator,
          "POST",
          duplicateReport,
        )
      ).status,
      400,
    );
    const bytes = Buffer.from("검증용 첨부 자료");
    const upload = await fetch(origin + "/api/collaboration/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${member}`,
        "Content-Type": "application/octet-stream",
        "X-File-Name": encodeURIComponent("검증 자료.txt"),
      },
      body: bytes,
    });
    assert.equal(upload.status, 200);
    const file = await upload.json();
    const fetched = await fetch(
      origin + "/api/collaboration/files/" + file.record.id,
      { headers: { Authorization: `Bearer ${member}` } },
    );
    assert.equal(fetched.status, 200);
    assert.deepEqual(Buffer.from(await fetched.arrayBuffer()), bytes);
    assert.equal(
      (await fetch(origin + "/api/collaboration/files/" + file.record.id))
        .status,
      401,
    );
    const attachmentMessageId = randomUUID();
    const chatMessage = await request(
      "/api/collaboration/records",
      member,
      "POST",
      {
        id: attachmentMessageId,
        kind: "message",
        payload: {
          channel: "전체",
          content: "",
          attachments: [file.record.id],
        },
      },
    );
    assert.equal(chatMessage.status, 200);
    assert.deepEqual(chatMessage.data.record.payload.attachments, [
      file.record.id,
    ]);
    const chatReply = await request(
      "/api/collaboration/records",
      member,
      "POST",
      {
        id: randomUUID(),
        kind: "message",
        payload: {
          channel: "전체",
          content: "첨부 답글",
          parent: attachmentMessageId,
          attachments: [file.record.id],
        },
      },
    );
    assert.equal(chatReply.status, 200);
    for (const payload of [
      { channel: "전체", content: "없는 파일", attachments: [randomUUID()] },
      {
        channel: "전체",
        content: "중복 파일",
        attachments: [file.record.id, file.record.id],
      },
      { channel: "전체", content: "", attachments: [] },
      {
        channel: "전체",
        content: "과다 첨부",
        attachments: Array.from({ length: 6 }, () => randomUUID()),
      },
    ]) {
      assert.equal(
        (
          await request("/api/collaboration/records", member, "POST", {
            id: randomUUID(),
            kind: "message",
            payload,
          })
        ).status,
        400,
      );
    }
    const messageReload = await request("/api/collaboration/records", member);
    const loadedMessage = messageReload.data.records.find(
      (record: any) => record.id === attachmentMessageId,
    );
    assert.deepEqual(loadedMessage.payload.attachments, [file.record.id]);
    const contents = sqlite
      .prepare("SELECT content FROM collaboration_files WHERE id=?")
      .get(file.record.id)?.content;
    assert.ok(String(contents).startsWith("enc:v1:"));
    // Seen cutoffs are per channel and monotonic, including concurrent tabs.
    const seenAt = chatReply.data.record.updated_at;
    assert.equal(
      (
        await request("/api/collaboration/read", member, "PUT", {
          channel: "전체",
          at: seenAt,
        })
      ).status,
      200,
    );
    await Promise.all([
      request("/api/collaboration/read", member, "PUT", {
        channel: "전체",
        at: "2020-01-01T00:00:00.000Z",
      }),
      request("/api/collaboration/read", member, "PUT", {
        channel: "교육",
        at: seenAt,
      }),
    ]);
    const seen = (await request("/api/collaboration/records", member)).data
      .read;
    assert.equal(seen["전체"], seenAt);
    assert.equal(seen["교육"], seenAt);
    assert.deepEqual(
      (await request("/api/collaboration/records", operator)).data.read,
      {},
    );
    // Editing preserves the previous encrypted version, and restoration creates another version.
    const history = await request(
      `/api/collaboration/records/${r.id}/history`,
      member,
    );
    assert.equal(history.status, 200);
    assert.ok(history.data.history.some((v: any) => v.revision === 1));
    const restored = await request(
      `/api/collaboration/records/${r.id}/restore`,
      member,
      "POST",
      { version: 1, revision: history.data.current.revision },
    );
    assert.equal(restored.status, 200);
    assert.equal(restored.data.record.payload.progress, r.payload.progress);
    assert.equal(
      restored.data.record.revision,
      history.data.current.revision + 1,
    );
    assert.equal(
      (
        await request(
          `/api/collaboration/records/${r.id}/restore`,
          member,
          "POST",
          { version: 1, revision: history.data.current.revision },
        )
      ).status,
      409,
    );
    assert.equal(
      (await request("/api/collaboration/policy", member)).status,
      403,
    );
    const privateTeam = r.payload.team;
    async function savePolicy(policy: unknown) {
      const current = await request("/api/collaboration/policy", operator);
      return request("/api/collaboration/policy", operator, "PUT", {
        policy,
        revision: current.data.revision,
      });
    }
    const policy = {
      teams: {
        [privateTeam]: {
          private: true,
          members: [] as string[],
          readOnly: [] as string[],
        },
      },
    };
    assert.equal((await savePolicy(policy)).status, 200);
    assert.equal(
      (
        await request("/api/collaboration/policy", operator, "PUT", {
          policy,
          revision: 0,
        })
      ).status,
      409,
    );
    let restricted = await request("/api/collaboration/records", member);
    assert.ok(!restricted.data.permissions.readTeams.includes(privateTeam));
    assert.ok(
      !restricted.data.records.some((record: any) => record.id === r.id),
    );
    assert.equal(
      (await request(`/api/collaboration/records/${r.id}/history`, member))
        .status,
      404,
    );
    assert.equal(
      (
        await request(
          `/api/collaboration/records/${r.id}/restore`,
          member,
          "POST",
          { version: 1, revision: restored.data.record.revision },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/api/collaboration/records", member, "POST", {
          id: randomUUID(),
          kind: "message",
          payload: { channel: privateTeam, content: "권한 없음" },
        })
      ).status,
      403,
    );
    const privateUpload = await fetch(
      origin +
        "/api/collaboration/files?team=" +
        encodeURIComponent(privateTeam),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${operator}`,
          "Content-Type": "application/octet-stream",
          "X-File-Name": "private.txt",
        },
        body: bytes,
      },
    );
    assert.equal(privateUpload.status, 200);
    const privateFile = (await privateUpload.json()).record;
    assert.equal(
      (
        await fetch(origin + "/api/collaboration/files/" + privateFile.id, {
          headers: { Authorization: `Bearer ${member}` },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request("/api/collaboration/records", operator, "POST", {
          id: randomUUID(),
          kind: "message",
          payload: {
            channel: "전체",
            content: "금지된 공개 공유",
            attachments: [privateFile.id],
          },
        })
      ).status,
      400,
    );
    policy.teams[privateTeam].members = ["member@example.test"];
    policy.teams[privateTeam].readOnly = ["member@example.test"];
    assert.equal((await savePolicy(policy)).status, 200);
    restricted = await request("/api/collaboration/records", member);
    assert.ok(restricted.data.permissions.readTeams.includes(privateTeam));
    assert.ok(!restricted.data.permissions.writeTeams.includes(privateTeam));
    assert.ok(
      restricted.data.records.some(
        (record: any) => record.id === privateFile.id,
      ),
    );
    assert.equal(
      (await request(`/api/collaboration/records/${r.id}/history`, member))
        .status,
      200,
    );
    assert.equal(
      (
        await request(`/api/collaboration/records/${r.id}`, member, "PUT", {
          ...body,
          revision: restored.data.record.revision,
        })
      ).status,
      403,
    );
    const privateDocId = randomUUID();
    await request("/api/collaboration/records", operator, "POST", {
      id: privateDocId,
      kind: "doc",
      payload: { team: privateTeam, title: "분과 기록", content: "전용 내용" },
    });
    await request(
      `/api/collaboration/records/${privateDocId}`,
      operator,
      "PUT",
      {
        id: privateDocId,
        kind: "doc",
        revision: 1,
        payload: { team: "전체", title: "공개 기록", content: "공개 내용" },
      },
    );
    policy.teams[privateTeam].members = [];
    policy.teams[privateTeam].readOnly = [];
    await savePolicy(policy);
    assert.equal(
      (
        await request(
          `/api/collaboration/records/${privateDocId}/history`,
          member,
        )
      ).data.history.length,
      0,
      "moving a document public must not expose private historical content",
    );
    assert.equal(
      (
        await request("/api/collaboration/records", member, "POST", {
          id: r.id + "-history-99",
          kind: "doc",
          payload: { team: "전체", title: "내부 번호 충돌", content: "" },
        })
      ).status,
      400,
    );
    const exported = (await request("/api/collaboration/records", operator))
      .data.records;
    assert.ok(
      exported.every(
        (record: any) =>
          !["history", "policy", "userstate", "filescope"].includes(
            record.kind,
          ),
      ),
    );
    assert.ok(
      String(
        sqlite
          .prepare(
            "SELECT payload FROM collaboration_records WHERE kind='history' LIMIT 1",
          )
          .get()?.payload,
      ).startsWith("enc:v1:"),
    );
    const register = await request("/api/admin/register", undefined, "POST", {
      email: "newmember@example.test",
      password,
      passwordConfirm: password,
      requestedRole: "committee",
    });
    assert.equal(register.status, 201);
    assert.equal(
      sqlite
        .prepare("SELECT role FROM admins WHERE email=?")
        .get("newmember@example.test")?.role,
      "committee",
    );
    assert.equal(
      (await request("/api/admin/logout", member, "POST")).status,
      204,
    );
    assert.equal(
      (await request("/api/collaboration/records", member)).status,
      401,
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>((resolve) =>
        child.once("exit", () => resolve()),
      );
      child.kill("SIGTERM");
      await exited;
    }
    sqlite.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
