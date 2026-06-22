import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const TOOLS = [
  { name: "search_bilibili", description: "搜索B站视频", inputSchema: { type: "object", properties: { keyword: { type: "string", description: "关键词" }, page: { type: "number", description: "页码" }, limit: { type: "number", description: "数量" } }, required: ["keyword"] } },
  { name: "get_weather", description: "天气查询", inputSchema: { type: "object", properties: { city: { type: "string", description: "城市名" } }, required: ["city"] } },
  { name: "get_time", description: "当前时间", inputSchema: { type: "object", properties: {} } },
  { name: "calculate", description: "计算器", inputSchema: { type: "object", properties: { expression: { type: "string", description: "数学表达式" } }, required: ["expression"] } }
];

let activeTransport = null;

const server = new Server(
  { name: "kai-mcp", version: "1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "search_bilibili": {
        const res = await fetch("https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=" + encodeURIComponent(args.keyword) + "&page=" + (args.page || 1), {
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.bilibili.com/" }
        });
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify((data.data?.result || []).slice(0, args.limit || 10), null, 2) }] };
      }
      case "get_weather": {
        const res = await fetch("https://wttr.in/" + encodeURIComponent(args.city) + "?format=j1");
        const data = await res.json();
        const c = data.current_condition[0];
        return { content: [{ type: "text", text: (data.nearest_area[0]?.areaName[0]?.value || args.city) + ": " + c.temp_C + "°C, " + (c.weatherDesc[0]?.value || "未知") }] };
      }
      case "get_time":
        return { content: [{ type: "text", text: new Date().toLocaleString("zh-CN") }] };
      case "calculate": {
        const safe = args.expression.replace(/[^0-9+\-*/.()% ]/g, "");
        return { content: [{ type: "text", text: String(Function("return (" + safe + ")")()) }] };
      }
      default:
        throw new Error("未知工具");
    }
  } catch (e) {
    return { content: [{ type: "text", text: "错误: " + e.message }], isError: true };
  }
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("ok"));

// === SSE 传输 (兼容旧版 MCP 客户端) ===
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
    if (!res.headersSent) res.status(500).send("SSE error: " + e.message);
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

import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const TOOLS = [
  { name: "search_bilibili", description: "搜索B站视频", inputSchema: { type: "object", properties: { keyword: { type: "string", description: "关键词" }, page: { type: "number", description: "页码" }, limit: { type: "number", description: "数量" } }, required: ["keyword"] } },
  { name: "get_weather", description: "天气查询", inputSchema: { type: "object", properties: { city: { type: "string", description: "城市名" } }, required: ["city"] } },
  { name: "get_time", description: "当前时间", inputSchema: { type: "object", properties: {} } },
  { name: "calculate", description: "计算器", inputSchema: { type: "object", properties: { expression: { type: "string", description: "数学表达式" } }, required: ["expression"] } }
];

let activeTransport = null;

const server = new Server(
  { name: "kai-mcp", version: "1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "search_bilibili": {
        const res = await fetch("https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=" + encodeURIComponent(args.keyword) + "&page=" + (args.page || 1), {
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.bilibili.com/" }
        });
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify((data.data?.result || []).slice(0, args.limit || 10), null, 2) }] };
      }
      case "get_weather": {
        const res = await fetch("https://wttr.in/" + encodeURIComponent(args.city) + "?format=j1");
        const data = await res.json();
        const c = data.current_condition[0];
        return { content: [{ type: "text", text: (data.nearest_area[0]?.areaName[0]?.value || args.city) + ": " + c.temp_C + "°C, " + (c.weatherDesc[0]?.value || "未知") }] };
      }
      case "get_time":
        return { content: [{ type: "text", text: new Date().toLocaleString("zh-CN") }] };
      case "calculate": {
        const safe = args.expression.replace(/[^0-9+\-*/.()% ]/g, "");
        return { content: [{ type: "text", text: String(Function("return (" + safe + ")")()) }] };
      }
      default:
        throw new Error("未知工具");
    }
  } catch (e) {
    return { content: [{ type: "text", text: "错误: " + e.message }], isError: true };
  }
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("ok"));

// SSE 传输
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
    if (!res.headersSent) res.status(500).send("SSE error: " + e.message);
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

// Streamable HTTP 传输 (POST /mcp)
app.post("/mcp", async (req, res) => {
  try {
    const { method, params, id } = req.body;
    if (method === "tools/list") {
      res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    } else if (method === "tools/call") {
      const callReq = { method: "tools/call", params };
      const result = await server._onrequest(callReq);
      const content = result.content || result;
      res.json({ jsonrpc: "2.0", id, result: content });
    } else if (method === "initialize") {
      res.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "kai-mcp", version: "1.0" } } });
    } else {
      res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found: " + method } });
    }
  } catch (e) {
    console.error("MCP error:", e);
    res.json({ jsonrpc: "2.0", id: req.body?.id, error: { code: -32603, message: e.message } });
  }
});

process.on("uncaughtException", e => console.error("UNCAUGHT:", e));
process.on("unhandledRejection", e => console.error("UNHANDLED:", e));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("MCP HTTP Server on http://0.0.0.0:" + PORT));