import "dotenv/config"; // server/.env 의 값을 process.env 로 읽어옴
import cors from "cors";
import express from "express";

const PORT = process.env.PORT || 3001;
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"; // 모델은 서버에서만 정함 (비용 통제)
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:4173"
).split(",");

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY 가 없습니다. server/.env 파일을 확인하세요.");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS })); // 허용한 주소의 화면에서 온 요청만 브라우저가 받음
app.use(express.json({ limit: "100kb" }));

// 아주 간단한 사용량 제한: IP 당 1분에 20번 (실서비스에서는 express-rate-limit 같은 검증된 패키지 권장)
const hits = new Map();
const rateLimit = (req, res, next) => {
  const now = Date.now();
  const recent = (hits.get(req.ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) {
    return res.status(429).json({
      error: { message: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
    });
  }
  hits.set(req.ip, [...recent, now]);
  next();
};

// 브라우저가 보낸 대화 내용이 올바른 모양인지 확인
const isValidMessages = (messages) =>
  Array.isArray(messages) &&
  messages.length > 0 &&
  messages.length <= 50 &&
  messages.every(
    (m) =>
      (m?.role === "user" || m?.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.length <= 4000,
  );

app.post("/api/chat", rateLimit, async (req, res) => {
  const { messages } = req.body ?? {};
  if (!isValidMessages(messages)) {
    return res
      .status(400)
      .json({ error: { message: "messages 형식이 올바르지 않습니다." } });
  }

  // 브라우저가 연결을 끊으면(중단 버튼) OpenAI 요청도 함께 취소
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const upstream = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // 키는 여기서만 사용
      },
      body: JSON.stringify({ model: MODEL, messages, stream: true }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      // OpenAI 의 오류 문구(키 일부가 들어갈 수 있음)는 그대로 전달하지 않고 서버 로그에만 남김
      console.error(
        "OpenAI 오류:",
        upstream.status,
        await upstream.text().catch(() => ""),
      );
      if (upstream.status === 429) {
        return res
          .status(429)
          .json({ error: { message: "OpenAI 사용 한도를 초과했습니다." } });
      }
      return res.status(502).json({
        error: {
          message: "AI 서버 호출에 실패했습니다. 서버 설정을 확인하세요.",
        },
      });
    }

    // 받은 스트림을 가공하지 않고 그대로 브라우저로 전달
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders();
    for await (const chunk of upstream.body) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    if (err.name === "AbortError") return; // 브라우저가 먼저 끊은 경우
    console.error("중계 오류:", err);
    if (!res.headersSent) {
      res
        .status(502)
        .json({ error: { message: "AI 서버에 연결하지 못했습니다." } });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => console.log(`API 서버: http://localhost:${PORT}`));
