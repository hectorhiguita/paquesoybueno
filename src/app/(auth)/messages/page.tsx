"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { ApiSuccess } from "@/types/api";

interface OtherUser { id: string; name: string }
interface LastMessage { id: string; content: string; sentAt: string; senderId: string; delivered: boolean }
interface Thread {
  id: string;
  listingId: string | null;
  other: OtherUser;
  lastMessage: LastMessage | null;
  lastMessageAt: string;
  hasUnread: boolean;
}
interface Message {
  id: string;
  content: string;
  sentAt: string;
  delivered: boolean;
  sender: { id: string; name: string };
}

type ThreadsResponse = ApiSuccess<{ threads: Thread[] }>;
type MessagesResponse = ApiSuccess<{ messages: Message[] }>;
type SendMessageResponse = ApiSuccess<{ message: Message; threadId: string }>;

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const initialThread = searchParams.get("thread");
  const initialParticipant = searchParams.get("participantId");
  const initialListing = searchParams.get("listingId");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialThread);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/messages");
      if (!res.ok) return;
      const data = (await res.json()) as ThreadsResponse;
      setThreads(data.data.threads ?? []);
    } catch { /* ignore */ }
  }, []);

  const fetchMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/v1/messages/${threadId}`);
      if (!res.ok) return;
      const data = (await res.json()) as MessagesResponse;
      setMessages(data.data.messages ?? []);
    } catch { /* ignore */ } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initial load: threads + handle deep-link via participantId
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchThreads();

      if (initialParticipant) {
        try {
          const res = await fetch("/api/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              participantId: initialParticipant,
              listingId: initialListing ?? undefined,
              content: "Hola, me interesa tu publicación.",
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as SendMessageResponse;
            const tid = data.data.threadId as string;
            setActiveId(tid);
            await fetchThreads();
          }
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    init();
  }, [fetchThreads, initialParticipant, initialListing]);

  // Load messages when thread changes
  useEffect(() => {
    if (!activeId) return;
    void fetchMessages(activeId);
  }, [activeId, fetchMessages]);

  // Real-time updates via SSE with fetch fallback
  useEffect(() => {
    const source = new EventSource("/api/v1/messages/stream");
    eventSourceRef.current = source;

    source.addEventListener("thread-update", () => {
      void fetchThreads();
      if (activeId) void fetchMessages(activeId);
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, [activeId, fetchMessages, fetchThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim() || !activeId || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft("");

    try {
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeId, content }),
      });
      if (res.ok) {
        await fetchMessages(activeId);
        await fetchThreads();
      } else {
        setDraft(content);
      }
    } catch {
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find((t) => t.id === activeId);

  const myId = messages.find((m) => m.sender.id !== activeThread?.other.id)?.sender.id ?? null;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando mensajes...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-gray-800">✉️ Mensajes</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex h-[calc(100vh-120px)]">
        {/* Lista de hilos */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm text-gray-500">No tienes conversaciones aún</p>
              <p className="text-xs text-gray-400 mt-1">
                Contacta a un proveedor para iniciar un chat
              </p>
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full flex items-start gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                  activeId === t.id ? "bg-green-50 border-l-4 border-l-green-700" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 flex-shrink-0">
                  {t.other.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-gray-800 truncate">{t.other.name}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {t.lastMessage
                        ? new Date(t.lastMessage.sentAt).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {t.lastMessage?.content ?? "Nueva conversación"}
                  </p>
                </div>
                {t.hasUnread && (
                  <div className="w-2.5 h-2.5 bg-green-600 rounded-full flex-shrink-0 mt-1" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Chat activo */}
        {activeThread ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                {activeThread.other.name[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-800">{activeThread.other.name}</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMessages && messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">
                  No hay mensajes aún. ¡Empieza la conversación!
                </p>
              ) : (
                messages.map((m) => {
                  const isMe = myId ? m.sender.id === myId : false;
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                          isMe
                            ? "bg-green-700 text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        }`}
                      >
                        {!isMe && (
                          <p className="text-xs font-semibold mb-1 text-green-700">
                            {m.sender.name}
                          </p>
                        )}
                        <p>{m.content}</p>
                        <p
                          className={`text-xs mt-1 ${isMe ? "text-green-200" : "text-gray-400"}`}
                        >
                          {new Date(m.sentAt).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isMe && (m.delivered ? " ✓✓" : " ✓")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 min-h-[44px]"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || sending}
                className="bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors min-h-[44px] disabled:opacity-50"
              >
                {sending ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
