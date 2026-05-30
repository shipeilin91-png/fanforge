type AdminLoginBody = {
  accessCode?: unknown;
};

export async function POST(request: Request) {
  const adminAccessCode = process.env.ADMIN_ACCESS_CODE;

  if (!adminAccessCode) {
    return Response.json(
      { ok: false, message: "管理员口令未配置" },
      { status: 500 },
    );
  }

  let body: AdminLoginBody = {};

  try {
    body = (await request.json()) as AdminLoginBody;
  } catch {
    body = {};
  }

  const accessCode =
    typeof body.accessCode === "string" ? body.accessCode : "";

  if (accessCode === adminAccessCode) {
    return Response.json({ ok: true });
  }

  return Response.json(
    { ok: false, message: "管理员口令错误" },
    { status: 401 },
  );
}
