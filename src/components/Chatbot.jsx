import { useRef, useState } from "react";

// 내 Express 서버 주소. 개발/미리보기에서는 vite 프록시가 /api 를 서버로 넘겨 주므로 비워 둡니다.
// 배포할 때는 .env.production 에 VITE_API_BASE_URL=https://내서버주소 를 넣습니다. (공개 주소라서 비밀이 아닙니다)
const API_URL = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/chat`;

const Chatbot = () => {
  const [messages, setMessages] = useState([]); // [{ role: "user" | "assistant", content }]
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null); // 진행 중인 요청을 중단할 때 사용

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError("");
    setInput("");
    setLoading(true);

    // 내용이 비어 있는 말풍선(실패·중단된 답변)은 서버로 보내지 않음
    const history = [
      ...messages.filter((m) => m.content),
      { role: "user", content: text },
    ];
    // 화면에는 사용자 말풍선 + 비어 있는 답변 말풍선을 먼저 추가
    setMessages([...history, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // 키도 모델도 보내지 않음: 대화 내용(messages)만 서버로 보냄
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error?.message ||
            (res.status >= 500
              ? "서버에 연결하지 못했습니다. 서버가 켜져 있는지 확인하세요."
              : `요청 실패 (${res.status})`),
        );
      }

      // 스트림을 한 조각씩 읽어서 글자를 이어 붙임 (서버가 OpenAI 의 스트림을 그대로 전달함)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop(); // 아직 덜 도착한 마지막 줄은 다음 조각과 합침

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;

          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next.length - 1;
              next[last] = {
                ...next[last],
                content: next[last].content + delta,
              };
              return next;
            });
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        // 서버가 꺼져 있으면 fetch 자체가 실패함
        setError(
          err instanceof TypeError
            ? "서버에 연결하지 못했습니다. 서버가 켜져 있는지 확인하세요."
            : err.message,
        );
      }
    } finally {
      // 답변이 한 글자도 오지 않았다면 빈 말풍선 제거
      setMessages((prev) =>
        prev.length && prev.at(-1).role === "assistant" && !prev.at(-1).content
          ? prev.slice(0, -1)
          : prev,
      );
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError("");
  };

  return (
    <section style={{ maxWidth: 480, margin: "1rem auto", textAlign: "left" }}>
      <h3>AI 챗봇</h3>

      <div
        aria-live="polite"
        style={{
          minHeight: 160,
          border: "1px solid #ccc",
          padding: 8,
          margin: "8px 0",
        }}
      >
        {messages.length === 0 && <p>메시지를 입력해 보세요.</p>}
        {messages.map((m, i) => (
          <p
            key={i}
            style={{
              whiteSpace: "pre-wrap",
              textAlign: m.role === "user" ? "right" : "left",
            }}
          >
            <b>{m.role === "user" ? "나" : "AI"}:</b> {m.content}
          </p>
        ))}
      </div>

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}

      <form onSubmit={send} style={{ display: "flex", gap: 4 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요"
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          보내기
        </button>
        {loading && (
          <button type="button" onClick={stop}>
            중단
          </button>
        )}
        <button type="button" onClick={reset}>
          대화 지우기
        </button>
      </form>
    </section>
  );
};

export default Chatbot;
