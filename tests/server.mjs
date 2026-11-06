import http from "node:http";
import { readFile } from "node:fs/promises";
const fixture = await readFile(new URL("./fixtures/workspace.html", import.meta.url));
http
  .createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" });
    response.end(fixture);
  })
  .listen(4318, "127.0.0.1");
