import http from "node:http";

const port = Number(process.env.MOCK_QURAN_PORT ?? 4010);
const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const match = url.pathname.match(/^\/v1\/ayah\/(\d+)\/editions\/(.+)$/);
  if (!match) {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: 404, status: "NOT_FOUND" }));
    return;
  }

  const number = Number(match[1]);
  const editions = decodeURIComponent(match[2]).split(",");
  const data = editions.map((identifier) => ({
    number,
    text: identifier.startsWith("fa.") ? `ترجمه آزمایشی آیه ${number}` : `آیه آزمایشی ${number}`,
    edition: { identifier },
    surah: { number: 1, name: "سُورَةُ ٱلْفَاتِحَةِ", englishName: "Al-Faatiha" },
    numberInSurah: number,
    juz: 1,
    page: 1
  }));

  response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify({ code: 200, status: "OK", data }));
});

server.listen(port, "127.0.0.1", () => console.log(`Mock Quran API listening on ${port}`));
