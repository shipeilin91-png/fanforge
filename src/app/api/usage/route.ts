import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const FREE_DAILY_LIMIT = 30;
const FREE_PROVIDER = "fanforge_free";

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

function createSupabaseClientForToken(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function emptyUsage(loggedIn: boolean) {
  return {
    loggedIn,
    limit: FREE_DAILY_LIMIT,
    sliceUsed: 0,
    chapterUsed: 0,
    totalUsed: 0,
    remaining: FREE_DAILY_LIMIT,
  };
}

export async function GET(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return Response.json(emptyUsage(false));
  }

  if (!supabase) {
    return Response.json(
      { error: "Supabase environment variables are missing." },
      { status: 500 },
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return Response.json(emptyUsage(false));
  }

  const userSupabase = createSupabaseClientForToken(token);

  if (!userSupabase) {
    return Response.json(
      { error: "无法连接免费额度服务，请稍后重试。" },
      { status: 500 },
    );
  }

  const { data, error } = await userSupabase
    .from("user_generation_usage")
    .select("feature, count")
    .eq("user_id", user.id)
    .eq("usage_date", getTodayDateString())
    .eq("provider", FREE_PROVIDER);

  if (error) {
    return Response.json(
      { error: "无法读取今日免费额度，请稍后重试。" },
      { status: 500 },
    );
  }

  const rows = Array.isArray(data) ? data : [];
  const sliceUsed = rows
    .filter((row) => row.feature === "slice")
    .reduce((sum, row) => sum + (typeof row.count === "number" ? row.count : 0), 0);
  const chapterUsed = rows
    .filter((row) => row.feature === "chapter")
    .reduce((sum, row) => sum + (typeof row.count === "number" ? row.count : 0), 0);
  const totalUsed = sliceUsed + chapterUsed;

  return Response.json({
    loggedIn: true,
    limit: FREE_DAILY_LIMIT,
    sliceUsed,
    chapterUsed,
    totalUsed,
    remaining: Math.max(0, FREE_DAILY_LIMIT - totalUsed),
  });
}
