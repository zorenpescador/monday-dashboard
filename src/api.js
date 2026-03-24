const MCP_SERVER = {
  type: "url",
  url: "https://mcp.monday.com/mcp",
  name: "monday-mcp",
};

async function callClaude(prompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a monday.com assistant. Use the monday.com MCP tools to fetch data.
Always respond with ONLY valid JSON (no markdown, no backticks, no preamble).
User ID is 75120898. User name is Zoren Pescador.`,
      messages: [{ role: "user", content: prompt }],
      mcp_servers: [MCP_SERVER],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.content || [];
}

export async function fetchBoards() {
  const raw = await callClaude(
    `Use the monday.com search tool to find all boards. 
     Return a JSON array of objects with fields: id (number only, no prefix), title, url. 
     Return ONLY the JSON array, nothing else.`
  );

  for (const block of raw) {
    if (block.type === "text") {
      const match = block.text?.trim().match(/\[[\s\S]*\]/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
    }
    if (block.type === "mcp_tool_result") {
      try {
        const d = JSON.parse(block.content?.[0]?.text || "{}");
        if (d.data) {
          return d.data.map((b) => ({
            id: parseInt(b.id?.replace("board-", "")),
            title: b.title,
            url: b.url,
          }));
        }
      } catch {}
    }
  }
  return [];
}

export async function fetchTasksFromBoard(boardId, boardTitle) {
  const raw = await callClaude(
    `Use get_board_items_page for board ID ${boardId} with includeColumns=true and limit=100.
     Find items where the person/assignee column includes user ID 75120898 (Zoren Pescador).
     Return ONLY a JSON array of objects: { id, name, status, dueDate, boardTitle, boardId }.
     boardTitle should be "${boardTitle}". boardId should be ${boardId}.
     If no items are assigned to this user, return an empty array [].`
  );

  for (const block of raw) {
    if (block.type === "text") {
      const match = block.text?.trim().match(/\[[\s\S]*\]/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
    }
  }
  return [];
}
