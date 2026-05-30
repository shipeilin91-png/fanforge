"use client";

import {
  ArrowRight,
  Database,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type EvidenceType = "Hard Canon" | "Soft Canon";

type CanonEvidence = {
  type: EvidenceType;
  title: string;
  source: string;
  evidence: string;
  usage: string;
};

type CanonDocument = {
  id: string;
  title: string;
  content: string;
  updated_at: string | null;
};

type RagIndexStatus =
  | { status: "idle"; message: "未索引" }
  | { status: "indexing"; message: "Canon RAG 索引中..." }
  | { status: "success"; message: string; chunkCount: number }
  | { status: "error"; message: string };

const sampleEvidence: CanonEvidence[] = [
  {
    type: "Hard Canon",
    title: "时间线锚点",
    source: "第三卷 · 灰港篇",
    evidence: "主角流亡第三年才第一次回到旧都，此前不能公开进入王城。",
    usage: "Writer 生成回归戏时必须避开提前返城；Reviewer 检查时间线冲突。",
  },
  {
    type: "Hard Canon",
    title: "身份与称号",
    source: "角色资料 · 王室档案",
    evidence: "流亡期公开身份为账房陆沉，王子身份只被极少数旧臣知晓。",
    usage: "限制对白中的称呼，避免路人或新角色直接叫出真实身份。",
  },
  {
    type: "Hard Canon",
    title: "世界观规则",
    source: "设定集 · 誓印规则",
    evidence: "誓印必须双片合一才能调动禁卫府武装，半片只能证明血统。",
    usage: "防止凭空召唤军队或跳过政治代价的剧情推进。",
  },
  {
    type: "Soft Canon",
    title: "角色说话方式",
    source: "对话片段 · 雨夜重逢",
    evidence: "主角倾向用克制、带刺的短句掩饰关心，很少直接解释情绪。",
    usage: "作为 Writer 风格约束，减少直白心理描写和过度告白。",
  },
  {
    type: "Soft Canon",
    title: "常用意象",
    source: "章节摘录 · 灰港夜雨",
    evidence: "雨声、旧伤、袖口水痕经常承担关系未解情绪的暗示功能。",
    usage: "为情绪切片提供可复用物象，保持同人文本的原作氛围。",
  },
  {
    type: "Soft Canon",
    title: "关系互动模式",
    source: "人物关系线 · 旧友",
    evidence: "两人常以试探和让步推进关系，真正的关心通常落在动作而非对白。",
    usage: "Reviewer 可用来判断关系阶段是否过快或互动是否 OOC。",
  },
];

const retrievalStrategies = [
  {
    title: "Dense Vector Search",
    description: "语义相似检索，用于召回与当前创作场景情绪、关系和事件相近的证据。",
  },
  {
    title: "Keyword / BM25 Search",
    description: "保留人名、地名、道具、称号等精确设定，避免语义检索漏掉硬约束。",
  },
  {
    title: "Hybrid Retrieval",
    description: "融合语义和关键词召回，让软氛围与硬设定同时进入候选证据池。",
  },
  {
    title: "Reranker",
    description: "根据当前创作场景重排证据，优先保留最能约束本轮生成的片段。",
  },
  {
    title: "Context Compression",
    description: "只保留与任务相关的证据片段，压缩上下文长度并减少噪声。",
  },
] as const;

const generationFlow = [
  "原作文档",
  "Canon Evidence",
  "Writer Prompt",
  "Reviewer Canon Check",
  "用户反馈",
] as const;

const conflictRules = [
  "时间线冲突",
  "世界观规则冲突",
  "角色已知信息冲突",
  "关系阶段冲突",
  "设定凭空添加",
] as const;

function formatDocumentDate(value: string | null) {
  if (!value) return "未记录";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function previewText(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact ? compact.slice(0, 30) : "空白文档";
}

export default function CanonPage() {
  const [documentTitle, setDocumentTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [evidence, setEvidence] = useState<CanonEvidence[]>([]);
  const [documents, setDocuments] = useState<CanonDocument[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [documentMessage, setDocumentMessage] = useState("登录后可保存和管理原作文档");
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [ragIndexStatus, setRagIndexStatus] = useState<RagIndexStatus>({
    status: "idle",
    message: "未索引",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadInitialDocuments() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        if (isMounted) setDocumentMessage("登录后可保存和管理原作文档");
        return;
      }

      await loadCanonDocuments(user.id, isMounted);
    }

    void loadInitialDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadCanonDocuments(userId: string, isMounted = true) {
    setLoadingDocuments(true);
    setDocumentError(null);

    const { data, error } = await supabase
      .from("user_canon_documents")
      .select("id, title, content, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!isMounted) return;

    setLoadingDocuments(false);

    if (error) {
      setDocumentError("文档读取失败。");
      setDocuments([]);
      return;
    }

    const nextDocuments = (data ?? []).map((item) => ({
      id: String(item.id),
      title: typeof item.title === "string" && item.title ? item.title : "未命名原作文档",
      content: typeof item.content === "string" ? item.content : "",
      updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
    }));

    setDocuments(nextDocuments);
    setDocumentMessage(nextDocuments.length ? "" : "暂无原作文档。");
  }

  async function refreshCanonDocuments() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      setDocuments([]);
      setDocumentMessage("登录后可保存和管理原作文档");
      return;
    }

    await loadCanonDocuments(user.id);
  }

  function handleLoadDocument(document: CanonDocument) {
    setCurrentDocumentId(document.id);
    setDocumentTitle(document.title);
    setSourceText(document.content);
    setDocumentMessage("文档已加载。");
    setDocumentError(null);
    setRagIndexStatus({ status: "idle", message: "未索引" });
  }

  function handleNewDocument() {
    setCurrentDocumentId(null);
    setDocumentTitle("");
    setSourceText("");
    setDocumentMessage("");
    setDocumentError(null);
    setRagIndexStatus({ status: "idle", message: "未索引" });
  }

  async function indexCanonDocument({
    documentId,
    title,
    content,
  }: {
    documentId: string;
    title: string;
    content: string;
  }) {
    setRagIndexStatus({
      status: "indexing",
      message: "Canon RAG 索引中...",
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setRagIndexStatus({
        status: "error",
        message: "文档已保存，但 Canon RAG 索引失败：请先登录。",
      });
      return;
    }

    try {
      const response = await fetch("/api/canon/index", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          title,
          content,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        chunkCount?: number;
        error?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "索引失败：请稍后重试");
      }

      setRagIndexStatus({
        status: "success",
        message: `Canon RAG 索引完成：已生成 ${payload.chunkCount ?? 0} 个证据片段`,
        chunkCount: payload.chunkCount ?? 0,
      });
    } catch (error) {
      setRagIndexStatus({
        status: "error",
        message: `文档已保存，但 RAG 索引失败：${
          error instanceof Error ? error.message : "请稍后重试"
        }`,
      });
    }
  }

  async function handleSaveDocument() {
    if (savingDocument) return;

    setSavingDocument(true);
    setDocumentError(null);
    setDocumentMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        setDocumentError("请先登录后保存原作文档。");
        return;
      }

      if (!sourceText.trim()) {
        setDocumentError("请先输入原作文档内容。");
        return;
      }

      const payload = {
        user_id: user.id,
        title: documentTitle.trim() || "未命名原作文档",
        content: sourceText,
        source_type: "paste",
        metadata: {
          contentLength: sourceText.length,
          savedFrom: "canon-page",
        },
        updated_at: new Date().toISOString(),
      };
      let successMessage = "原作文档已保存。";
      let savedDocumentId = currentDocumentId;

      if (currentDocumentId) {
        const { error } = await supabase
          .from("user_canon_documents")
          .update(payload)
          .eq("id", currentDocumentId)
          .eq("user_id", user.id);

        if (error) {
          setDocumentError(error.message);
          return;
        }
        successMessage = "原作文档已保存。";
      } else {
        const { data: insertedDocument, error } = await supabase
          .from("user_canon_documents")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          setDocumentError(error.message);
          return;
        }

        if (insertedDocument?.id) {
          savedDocumentId = String(insertedDocument.id);
          setCurrentDocumentId(savedDocumentId);
        }
      }

      await refreshCanonDocuments();
      setDocumentMessage(successMessage);

      if (savedDocumentId) {
        void indexCanonDocument({
          documentId: savedDocumentId,
          title: payload.title,
          content: payload.content,
        });
      }
    } catch (error) {
      setDocumentError(
        error instanceof Error ? error.message : "保存失败，请稍后重试。",
      );
    } finally {
      setSavingDocument(false);
    }
  }

  function handleExtractEvidence() {
    setEvidence(sampleEvidence);
  }

  const hardCanon = evidence.filter((item) => item.type === "Hard Canon");
  const softCanon = evidence.filter((item) => item.type === "Soft Canon");

  return (
    <div className="min-h-full overflow-hidden bg-[#f6efdf] text-[#191611]">
      <SiteNav />
      <main className="relative mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <div className="pointer-events-none absolute left-[-8vw] top-28 hidden text-[16vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] lg:block">
          CANON
        </div>
        <div className="pointer-events-none absolute right-[-9vw] top-[430px] hidden text-[13vw] font-serif font-semibold leading-none text-[#53613b]/[0.07] xl:block">
          EVIDENCE
        </div>
        <div className="pointer-events-none absolute bottom-12 left-[24%] hidden text-[12vw] font-serif font-semibold leading-none text-[#1b1711]/[0.035] xl:block">
          ARCHIVE
        </div>

        <header className="relative border-b border-[#b9aa83]/70 pb-5">
          <div className="max-w-5xl">
            <div className="mb-4 inline-flex rounded-xl border border-[#2d281f]/20 bg-[#fffaf0]/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#6a654f]">
              CANON EVIDENCE · RAG READY
            </div>
            <h1 className="font-serif text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.04em] text-[#171410]">
              Canon Evidence Engine
            </h1>
            <div className="mt-4">
              <p className="max-w-3xl font-serif text-[clamp(1.55rem,2.5vw,2.8rem)] leading-[1.02] tracking-[-0.02em] text-[#211d17]">
                上传或粘贴原作文档，提取原作硬设定、时间线、角色经历和风格证据。
              </p>
            </div>
          </div>
        </header>

        <section className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[14px] border border-[#9a7f45]/28 bg-[#f7efe0]/78 p-4 shadow-[0_20px_60px_rgba(92,69,42,0.06)]">
            <div className="rounded-[14px] border border-[#8a7c62]/24 bg-[#fffaf0]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#b9aa83]/45 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#9a7f45]/28 bg-[#f0e4cc]">
                    <FileText className="size-4 text-[#53613b]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-[#171410]">
                      原作文档输入区
                    </h2>
                    <p className="text-xs leading-relaxed text-[#6f6759]">
                      粘贴片段或选择文件，提取可用于写作约束的 Canon 证据。
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-xl border-[#53613b]/35 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                >
                  Intake
                </Badge>
              </div>

              <div className="flex flex-col gap-5 p-5">
                <Input
                  value={documentTitle}
                  onChange={(event) => setDocumentTitle(event.target.value)}
                  placeholder="例如：第一卷世界观设定 / 角色苏砚人生线 / 原作第十二章摘录"
                  className="rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] text-[#211d17] placeholder:text-[#9a8f78] focus-visible:ring-[#53613b]"
                />
                <Textarea
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="粘贴原作片段 / 世界观设定 / 角色资料"
                  className="min-h-48 resize-y rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] px-5 py-5 font-serif text-[15px] leading-8 text-[#211d17] shadow-inner shadow-[#4d3f24]/5 placeholder:text-[#9a8f78] focus-visible:ring-[#53613b]"
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <Input
                    type="file"
                    accept=".txt,.md"
                    aria-label="上传 .txt 或 .md 原作文档"
                    className="rounded-xl border-[#8a7c62]/28 bg-[#fffaf0] text-[#5f5849] file:text-[#171410]"
                  />
                  <Button
                    className="h-10 rounded-xl bg-[#171410] px-5 text-[#f8f0df] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#28331f]"
                    onClick={handleExtractEvidence}
                  >
                    提取 Canon 证据
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-[#b9aa83]/45 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-[#53613b]/35 bg-[#e7ead4] px-5 text-[#3f4b2f] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/65 hover:bg-[#dfe6c7]"
                    onClick={handleSaveDocument}
                    disabled={savingDocument}
                  >
                    {savingDocument ? "保存中..." : "保存原作文档"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-[#8a7c62]/28 bg-[#fffdf7] px-4 text-[#5f5849] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]"
                    onClick={handleNewDocument}
                  >
                    新建文档
                  </Button>
                  {documentMessage ? (
                    <span className="text-xs text-[#3f4b2f]">
                      {documentMessage}
                    </span>
                  ) : null}
                  {documentError ? (
                    <span className="text-xs text-[#7f3326]">
                      {documentError}
                    </span>
                  ) : null}
                  {ragIndexStatus.status !== "idle" ? (
                    <span
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs leading-relaxed",
                        ragIndexStatus.status === "indexing" &&
                          "border-[#9a7f45]/30 bg-[#efe2c7] text-[#6f5f3f]",
                        ragIndexStatus.status === "success" &&
                          "border-[#53613b]/30 bg-[#e7ead4] text-[#3f4b2f]",
                        ragIndexStatus.status === "error" &&
                          "border-[#8a3f30]/25 bg-[#f3d8cc] text-[#7f3326]",
                      )}
                    >
                      {ragIndexStatus.message}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[14px] border border-[#8a7c62]/30 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
            <div className="mb-6 border-b border-[#b9aa83]/45 pb-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                    Canon Library
                  </p>
                  <h2 className="mt-2 font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
                    我的原作文档
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-xl border-[#53613b]/30 bg-[#e7ead4] text-[10px] text-[#3f4b2f]"
                >
                  {documents.length}/10
                </Badge>
              </div>

              {loadingDocuments ? (
                <div className="rounded-xl border border-dashed border-[#8a7c62]/28 bg-[#fffdf7]/74 px-3 py-5 text-center text-xs text-[#7a705e]">
                  正在读取文档……
                </div>
              ) : documents.length ? (
                <div className="flex flex-col gap-2">
                  {documents.map((document) => {
                    const isCurrent = currentDocumentId === document.id;

                    return (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => handleLoadDocument(document)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                          isCurrent
                            ? "border-[#53613b]/60 bg-[#e7ead4] shadow-[0_8px_20px_rgba(63,75,47,0.12)]"
                            : "border-[#9a7f45]/18 bg-[#fffdf7]/80 hover:border-[#53613b]/35 hover:bg-[#fffdf7]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="line-clamp-2 text-sm font-medium leading-5 text-[#171410]">
                            {document.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-[#8a7c62]">
                            {formatDocumentDate(document.updated_at)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6f6759]">
                          {previewText(document.content)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#8a7c62]/28 bg-[#fffdf7]/74 px-3 py-5 text-center text-xs leading-relaxed text-[#7a705e]">
                  {documentMessage || "暂无原作文档。"}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#9a7f45]/28 bg-[#f0e4cc]">
                <ShieldCheck className="size-4 text-[#53613b]" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Reviewer Standard
                </p>
                <h2 className="font-serif text-3xl leading-none tracking-[-0.02em] text-[#171410]">
                  Canon 冲突判断标准
                </h2>
              </div>
            </div>
            <div className="mt-5 divide-y divide-[#b9aa83]/45 rounded-xl border-y border-[#b9aa83]/45">
              {conflictRules.map((rule, index) => (
                <div
                  key={rule}
                  className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 py-4 text-sm text-[#332d24]"
                >
                  <span className="font-serif text-2xl leading-none text-[#53613b]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EvidenceColumn
            title="Hard Canon"
            description="不可违反的硬设定，例如时间线、身份、世界观规则、已知信息。"
            items={hardCanon}
          />
          <EvidenceColumn
            title="Soft Canon"
            description="风格/氛围参考，例如角色说话方式、常用意象、关系互动模式。"
            items={softCanon}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[14px] border border-[#8a7c62]/28 bg-[#fffaf0]/86 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#9a7f45]/28 bg-[#f0e4cc]">
                  <Search className="size-4 text-[#53613b]" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                    Retrieval Method
                  </p>
                  <h2 className="font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                    RAG 检索策略
                  </h2>
                </div>
              </div>
              <Badge
                variant="outline"
                className="rounded-xl border-[#8a7c62]/28 bg-[#fbf7ed] text-xs text-[#6f6759]"
              >
                Retrieval
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {retrievalStrategies.map((strategy, index) => (
                <div
                  key={strategy.title}
                  className="group rounded-xl border border-[#7b8359]/22 bg-[#fffdf7] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#53613b]/45 hover:bg-[#f4f7ea]"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-serif text-3xl leading-none text-[#53613b]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#171410]">
                        {strategy.title}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#6f6759]">
                        {strategy.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#9a7f45]/28 bg-[#fbf7ed]/84 p-5 shadow-[0_18px_50px_rgba(92,69,42,0.04)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#8a7c62]/28 bg-[#fffaf0]">
                <Database className="size-4 text-[#53613b]" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
                  Generation Chain
                </p>
                <h2 className="font-serif text-4xl leading-none tracking-[-0.02em] text-[#171410]">
                  如何进入生成链路
                </h2>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-0 overflow-hidden rounded-xl border border-[#b9aa83]/45 bg-[#fffaf0]/72">
              {generationFlow.map((step, index) => (
                <div
                  key={step}
                  className="group flex items-center justify-between gap-3 border-b border-[#b9aa83]/38 px-4 py-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-2xl leading-none text-[#53613b]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#332d24]">{step}</span>
                  </div>
                  {index < generationFlow.length - 1 ? (
                    <ArrowRight className="size-4 text-[#8a7c62]" aria-hidden />
                  ) : (
                    <span className="size-2 rounded-full bg-[#53613b]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function EvidenceColumn({
  title,
  description,
  items,
}: {
  title: EvidenceType;
  description: string;
  items: CanonEvidence[];
}) {
  const isHard = title === "Hard Canon";

  return (
    <section
      className={cn(
        "rounded-[14px] border p-5 shadow-[0_18px_50px_rgba(92,69,42,0.05)]",
        isHard
          ? "border-[#7f3326]/25 bg-[#f5e7dd]"
          : "border-[#53613b]/22 bg-[#fffaf0]/88",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#b9aa83]/42 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8a7c62]">
            {isHard ? "Non-negotiable rule" : "Atmosphere reference"}
          </p>
          <h2 className="mt-2 font-serif text-5xl leading-none tracking-[-0.025em] text-[#171410]">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#6f6759]">
            {description}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "rounded-xl border-[#8a7c62]/28 bg-[#fffaf0] text-[#171410]",
            isHard && "border-[#7f3326]/30 bg-[#edd1c5] text-[#7f3326]",
          )}
        >
          {items.length}
        </Badge>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#8a7c62]/32 bg-[#fffdf7]/74 px-4 py-10 text-center text-sm leading-7 text-[#7a705e]">
            等待文档分析。
          </div>
        ) : (
          items.map((item) => (
            <article
              key={`${item.type}-${item.title}`}
              className={cn(
                "group rounded-xl border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5",
                isHard
                  ? "border-[#7f3326]/25 bg-[#fff4ed] hover:border-[#7f3326]/45"
                  : "border-[#53613b]/18 bg-[#fffdf7] hover:border-[#53613b]/45",
              )}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    isHard
                      ? "rounded-xl border-[#7f3326]/35 bg-[#edd1c5] text-[#7f3326]"
                      : "rounded-xl border-[#53613b]/35 bg-[#e7ead4] text-[#3f4b2f]",
                  )}
                >
                  {item.type}
                </Badge>
                <span className="text-xs text-[#7a705e]">{item.source}</span>
              </div>
              <p className="font-serif text-2xl leading-none tracking-[-0.015em] text-[#171410]">
                {item.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#5f5849]">
                <span className="font-medium text-[#332d24]">证据：</span>
                {item.evidence}
              </p>
              <p className="mt-2 text-sm leading-7 text-[#5f5849]">
                <span className="font-medium text-[#332d24]">用途：</span>
                {item.usage}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
