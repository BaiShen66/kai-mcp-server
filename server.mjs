import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const TOOLS = [
  { name: "search_bilibili", description: "搜索B站视频", inputSchema: { type: "object", properties: { keyword: { type: "string", description: "关键词" }, page: { type: "number", description: "页码" }, limit: { type: "number", description: "数量" } }, required: ["keyword"] } }
];

let activeTransport = null;

const server = new Server(
  { name: "kai-mcp", version: "1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

async function execTool(name, args) {
  if (name === "search_bilibili") {
    const res = await fetch("https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=" + encodeURIComponent(args.keyword) + "&page=" + (args.page || 1), {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.bilibili.com/" }
    });
    const data = await res.json();
    const videos = (data.data?.result || []).slice(0, args.limit || 10).map(v => ({
      title: v.title?.replace(/<[^>]+>/g, ""),
      author: v.author,
      play: v.play,
      duration: v.duration,
      url: "https://www.bilibili.com/video/" + v.bvid
    }));
    return { content: [{ type: "text", text: JSON.stringify(videos, null, 2) }] };
  }
  throw new Error("未知工具: " + name);
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return await execTool(request.params.name, request.params.arguments);
  } catch (e) {
    return { content: [{ type: "text", text: e.message }], isError: true };
  }
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("ok"));

app.get("/sse", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const transport = new SSEServerTransport("/messages", res);
    activeTransport = transport;
    await server.connect(transport);
    req.on("close", () => { activeTransport = null; });
  } catch (e) {
    console.error("SSE error:", e);
    if (!res.headersSent) res.status(500).send(e.message);
  }
});

app.post("/messages", async (req, res) => {
  try {
    if (!activeTransport) return res.status(400).json({ error: "无活跃SSE连接" });
    await activeTransport.handlePostMessage(req, res);
  } catch (e) {
    console.error("Messages error:", e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

app.post("/mcp", async (req, res) => {
  try {
    const { method, params, id } = req.body || {};
    if (method === "initialize") return res.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "kai-mcp", version: "1.0" } } });
    if (method === "notifications/initialized") return res.status(202).end();
    if (method === "tools/list") return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    if (method === "tools/call") {
      const result = await execTool(params.name, params.arguments || {});
      return res.json({ jsonrpc: "2.0", id, result });
    }
    res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Unknown method" } });
  } catch (e) {
    console.error("MCP error:", e);
    res.json({ jsonrpc: "2.0", id: req.body?.id || null, error: { code: -32603, message: e.message } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Bilibili MCP Server on port " + PORT));