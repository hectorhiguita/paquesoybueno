"use client";

import { useState } from "react";
import { MESSAGES } from "@/lib/mock-data";

export default function MessagesPage() {
  const [activeId, setActiveId] = useState<string | null>(MESSAGES[0]?.id ?? null);
  const active = MESSAGES.find((m) => m.id === activeId);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-gray-800">✉️ Mensajes</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex h-[calc(100vh-120px)]">
        {/* Lista de conversaciones */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          {MESSAGES.map((msg) => (
            <button
              key={msg.id}
              onClick={() => setActiveId(msg.id)}
              className={`w-full flex items-start gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                activeId === msg.id ? "bg-green-50 border-l-4 border-l-green-700" : ""
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">
                {msg.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-gray-800 truncate">{msg.from}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{msg.time}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{msg.preview}</p>
              </div>
              {msg.unread && (
                <div className="w-2.5 h-2.5 bg-green-600 rounded-full flex-shrink-0 mt-1" />
              )}
            </button>
          ))}
        </div>

        {/* Chat */}
        {active ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Header del chat */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
                {active.avatar}
              </div>
              <div>
                <p className="font-bold text-gray-800">{active.from}</p>
                <p className="text-xs text-green-600">En línea</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                      m.sender === "me"
                        ? "bg-green-700 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    <p>{m.text}</p>
                    <p className={`text-xs mt-1 ${m.sender === "me" ? "text-green-200" : "text-gray-400"}`}>
                      {m.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 min-h-[44px]"
              />
              <button className="bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors min-h-[44px]">
                Enviar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Selecciona una conversación</p>
          </div>
        )}
      </div>
    </main>
  );
}
