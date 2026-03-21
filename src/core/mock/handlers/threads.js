const { getThread, createThread, updateThread, getThreadHistory, searchThreads, deleteThread } = require("../../mock/data/store");

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// POST /mock/api/threads/search
async function handleThreadSearch(req, res) {
  const body = await parseBody(req);
  const threads = searchThreads({
    limit: body.limit,
    offset: body.offset,
    sortBy: body.sortBy,
    sortOrder: body.sortOrder,
  });
  sendJSON(res, 200, threads);
}

// POST /mock/api/threads/{threadId}/history
async function handleThreadHistory(req, res, threadId) {
  const body = await parseBody(req);
  const limit = body.limit ?? 10;
  const history = getThreadHistory(threadId, limit);
  sendJSON(res, 200, history);
}

// POST /mock/api/threads
async function handleThreadCreate(req, res) {
  const body = await parseBody(req);
  const thread = createThread(body.values);
  sendJSON(res, 201, thread);
}

// GET /mock/api/threads/{threadId}
function handleThreadGet(req, res, threadId) {
  if (req.method !== "GET") {
    res.writeHead(405, { Allow: "GET" });
    res.end();
    return;
  }
  const thread = getThread(threadId);
  if (!thread) {
    sendJSON(res, 404, { error: "Thread not found" });
    return;
  }
  sendJSON(res, 200, thread);
}

// DELETE /mock/api/threads/{threadId}
function handleThreadDelete(req, res, threadId) {
  if (req.method !== "DELETE") {
    res.writeHead(405, { Allow: "DELETE" });
    res.end();
    return;
  }
  const deleted = deleteThread(threadId);
  if (!deleted) {
    sendJSON(res, 404, { error: "Thread not found" });
    return;
  }
  res.writeHead(204);
  res.end();
}

// GET/POST /mock/api/threads/{threadId}/state
async function handleThreadState(req, res, threadId) {
  if (req.method === "GET") {
    const thread = getThread(threadId);
    if (!thread) {
      sendJSON(res, 404, { error: "Thread not found" });
      return;
    }
    sendJSON(res, 200, { values: thread.values });
  } else if (req.method === "POST") {
    const body = await parseBody(req);
    const thread = updateThread(threadId, body.values);
    if (!thread) {
      sendJSON(res, 404, { error: "Thread not found" });
      return;
    }
    sendJSON(res, 200, { values: thread.values });
  } else {
    res.writeHead(405, { Allow: "GET, POST" });
    res.end();
  }
}

module.exports = {
  handleThreadSearch,
  handleThreadHistory,
  handleThreadCreate,
  handleThreadGet,
  handleThreadDelete,
  handleThreadState,
};
