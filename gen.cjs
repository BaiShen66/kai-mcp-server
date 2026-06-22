const fs = require("fs");
const old = fs.readFileSync("C:/kai-mcp-server/server.mjs", "utf-8");

let c = old.replace(
  ']',
  '  { name: "get_trending", description: "菴起¶佝请视频", inputSchema: { type: "object", properties: {}, required: [] } },' + 
  '  { name: "search_wechat", description: "搜索微信公众友笮文塬", inputSchema: { type: "object", properties: { keyword: { type: "string", description: "关键词" }, page: { type: "number", description: "页码" } }, required: ["keyword"] } }' + 
  '\n ]'
);

const impl = `
  if (name === "get_trending") {
    const res = await fetch("https://api.bilibili.com/x/web-interface/popular", {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.bilibili.com/" }
    });
    const data = await res.json();
    const videos = (data.data?.list || []).slice(0, 10).map(v => ({
      title: v.title?.replace(/<[^>]+>/g, ""),
      author: v.owner?.name,
      play: v.stat?.view,
      duration: v.duration,
      url: "https://www.bilibili.com/video/" + v.bvid
    }));
    return { content: [{ type: "text", text: JSON.stringify(videos, null, 2) }] };
  }
  if (name === "search_wechat") {
    const page = args.page || 1;
    const url = "https://weixin.sogou.com/weixin?type=2&query=" + encodeURIComponent(args.keyword) + "&page=" + page;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "text/html" }
    });
    const html = await res.text();
    const items = [];
    const liRegex = /<li[^>]*id="sogou_vr[^"]*"[^>]*>([\s\S]*?)(?=<\/li>)/g;
    let match;
    while ((match = liRegex.exec(html)) !== null) {
      const li = match[1];
      const titleMatch = li.match(/<h3>\s*<a[^>]*>([\s\S]*?)</a>\s*<\/h3>/);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      if (!title) continue;
      const urlMatch = li.match(/href="([^"]*?)"/);
      const articleUrl = urlMatch ? "https://weixin.sogou.com" + urlMatch[1].replace(/&amp;/g, "&") : "";
      const summaryMatch = li.match(/<p class="txt-info"[\>]*>([\s\S]*?)<\/p>/);
      const summary = summaryMatch ? summaryMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      const accountMatch = li.match(/<span class="all-time-y2">([\s\S]*?)<\/span>/);
      const account = accountMatch ? accountMatch[1].trim() : "";
      const timeMatch = li.match(/timeConvert\(\d+)\)/);
      const imgMatch = li.match(/<img[^>]*src="([^"]+?)"/);
      const cover = imgMatch ? (imgMatch[1].startsWith("//") ? "https:/" + imgMatch[1] : imgMatch[1]) : "";
      items.push({ title, summary, account, time: timeMatch ? parseInt(timeMatch[1]) : 0, cover, url: articleUrl });
    }
    const results = items.slice(0, 10).map(v => ({
      title: v.title, summary: v.summary, account: v.account,
      date: v.time ? new Date(v.time * 1000).toISOString().slice(0, 10) : "未知",
      cover: v.cover, url: v.url
    }));
    if (results.length === 0) return { content: [{ type: "text", text: "未有搜索结果" }] };
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
`;

c = c.replace('throw new Error', impl + '\n  throw new Error');

const b64 = Buffer.from(c, 'utf-8').toString('base64');
fs.writeFileSync('C:/kai-mcp-server/server.b64', b64, 'utf-8');
console.log('gen ok');
