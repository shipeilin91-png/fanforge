import { createClient } from "@supabase/supabase-js";

type CanonRetrieveBody = {
  query?: unknown;
  matchCount?: unknown;
};

type GeminiEmbeddingResponse = {
  embeddings?: Array<{
    values?: number[];
  }>;
  embedding?: {
    values?: number[];
  };
  error?: {
    message?: string;
  };
};

type CanonChunkMatch = {
  id?: unknown;
  document_id?: unknown;
  title?: unknown;
  content?: unknown;
  similarity?: unknown;
  metadata?: unknown;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EXPECTED_EMBEDDING_DIMENSION = 1536;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

function createUserSupabaseClient(token: string) {
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

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseMatchCount(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 5;

  if (!Number.isFinite(parsed)) return 5;
  return Math.min(20, Math.max(1, Math.round(parsed)));
}

async function createQueryEmbedding(query: string) {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = "models/gemini-embedding-001";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:batchEmbedContents?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            model,
            outputDimensionality: EXPECTED_EMBEDDING_DIMENSION,
            content: {
              parts: [{ text: query }],
            },
          },
        ],
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | GeminiEmbeddingResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || `Gemini Embedding API failed: ${response.status}`,
    );
  }

  const embedding =
    payload?.embeddings?.[0]?.values ?? payload?.embedding?.values ?? [];

  if (embedding.length !== EXPECTED_EMBEDDING_DIMENSION) {
    throw new Error(
      `Gemini embedding dimension mismatch. Expected ${EXPECTED_EMBEDDING_DIMENSION}, got ${embedding.length}.`,
    );
  }

  return embedding;
}

function normalizeMatch(row: CanonChunkMatch) {
  return {
    id: stringValue(row.id),
    documentId: stringValue(row.document_id),
    title: stringValue(row.title, "未命名 Canon 文档"),
    content: stringValue(row.content),
    similarity:
      typeof row.similarity === "number" && Number.isFinite(row.similarity)
        ? row.similarity
        : null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
  };
}

export async function POST(request: Request) {
  if (!supabase) {
    return Response.json(
      { error: "Supabase environment variables are not configured" },
      { status: 500 },
    );
  }

  const token = getBearerToken(request);

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CanonRetrieveBody = {};

  try {
    body = (await request.json()) as CanonRetrieveBody;
  } catch {
    body = {};
  }

  const query = stringValue(body.query);

  if (!query) {
    return Response.json({ results: [] });
  }

  const userSupabase = createUserSupabaseClient(token);

  if (!userSupabase) {
    return Response.json(
      { error: "Supabase environment variables are not configured" },
      { status: 500 },
    );
  }

  try {
    const queryEmbedding = await createQueryEmbedding(query);
    const { data, error } = await userSupabase.rpc("match_canon_chunks", {
      query_embedding: queryEmbedding,
      match_user_id: user.id,
      match_count: parseMatchCount(body.matchCount),
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      results: Array.isArray(data) ? data.map(normalizeMatch) : [],
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Canon retrieval failed",
      },
      { status: 500 },
    );
  }
}
