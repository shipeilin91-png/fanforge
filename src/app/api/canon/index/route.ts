import { createClient } from "@supabase/supabase-js";

type CanonIndexBody = {
  documentId?: unknown;
  title?: unknown;
  content?: unknown;
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;
const EXPECTED_EMBEDDING_DIMENSION = 1536;

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

function chunkText(content: string) {
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const chunkSize = 700;
  const overlap = 120;
  const chunks: Array<{ chunk_index: number; content: string }> = [];
  let start = 0;

  while (start < normalized.length && chunks.length < 80) {
    const chunk = normalized.slice(start, start + chunkSize).trim();

    if (chunk) {
      chunks.push({
        chunk_index: chunks.length,
        content: chunk,
      });
    }

    if (start + chunkSize >= normalized.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}

async function createEmbeddings(inputs: string[]) {
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
        requests: inputs.map((input) => ({
          model,
          outputDimensionality: EXPECTED_EMBEDDING_DIMENSION,
          content: {
            parts: [{ text: input }],
          },
        })),
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

  const embeddings =
    payload?.embeddings?.map((item) => item.values ?? []) ??
    (payload?.embedding?.values ? [payload.embedding.values] : undefined);

  if (!embeddings || embeddings.length !== inputs.length) {
    throw new Error("Gemini Embedding API returned incomplete data");
  }

  const dimension = embeddings[0]?.length ?? 0;

  if (dimension !== EXPECTED_EMBEDDING_DIMENSION) {
    throw new Error(
      `Gemini embedding dimension mismatch. Expected ${EXPECTED_EMBEDDING_DIMENSION}, got ${dimension}.`,
    );
  }

  if (embeddings.some((embedding) => embedding.length !== EXPECTED_EMBEDDING_DIMENSION)) {
    throw new Error("Gemini Embedding API returned invalid embedding dimensions");
  }

  return embeddings;
}

export async function POST(request: Request) {
  if (!supabase) {
    return Response.json(
      { ok: false, error: "Supabase environment variables are not configured" },
      { status: 500 },
    );
  }

  const token = getBearerToken(request);

  if (!token) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: CanonIndexBody = {};

  try {
    body = (await request.json()) as CanonIndexBody;
  } catch {
    body = {};
  }

  const title = stringValue(body.title, "未命名 Canon 文档");
  const content = stringValue(body.content);
  const documentId = stringValue(body.documentId) || null;

  if (!content) {
    return Response.json(
      { ok: false, error: "Canon document content is required" },
      { status: 400 },
    );
  }

  const chunks = chunkText(content);

  if (chunks.length === 0) {
    return Response.json(
      { ok: false, error: "No indexable content found" },
      { status: 400 },
    );
  }

  const userSupabase = createUserSupabaseClient(token);

  if (!userSupabase) {
    return Response.json(
      { ok: false, error: "Supabase environment variables are not configured" },
      { status: 500 },
    );
  }

  try {
    const embeddings = await createEmbeddings(chunks.map((chunk) => chunk.content));
    const embeddingDimension = embeddings[0]?.length ?? 0;

    if (documentId) {
      const { error: deleteError } = await userSupabase
        .from("user_canon_chunks")
        .delete()
        .eq("user_id", user.id)
        .eq("document_id", documentId);

      if (deleteError) {
        return Response.json(
          { ok: false, error: deleteError.message },
          { status: 500 },
        );
      }
    }

    const now = new Date().toISOString();
    const rows = chunks.map((chunk, index) => ({
      user_id: user.id,
      document_id: documentId,
      title,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      embedding: embeddings[index],
      metadata: {
        source: "canon-index-api",
        indexedAt: now,
      },
    }));

    const { error: insertError } = await userSupabase
      .from("user_canon_chunks")
      .insert(rows);

    if (insertError) {
      if (/dimension|vector|embedding/i.test(insertError.message)) {
        return Response.json(
          {
            ok: false,
            error: `Gemini embedding dimension mismatch. Expected ${EXPECTED_EMBEDDING_DIMENSION}, got ${embeddingDimension}.`,
          },
          { status: 500 },
        );
      }

      return Response.json(
        { ok: false, error: insertError.message },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      chunkCount: rows.length,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Canon indexing failed",
      },
      { status: 500 },
    );
  }
}
