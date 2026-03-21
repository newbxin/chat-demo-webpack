const {
  handleThreadSearch,
  handleThreadHistory,
  handleThreadCreate,
  handleThreadGet,
  handleThreadDelete,
  handleThreadState,
} = require("./handlers/threads");

const { handleRunsStream } = require("./handlers/runs");

function setupMockServer(app) {
  // Thread search
  app.post("/mock/api/threads/search", (req, res) => {
    handleThreadSearch(req, res);
  });

  // Thread creation
  app.post("/mock/api/threads", (req, res) => {
    handleThreadCreate(req, res);
  });

  // Thread get/delete
  app.get("/mock/api/threads/:threadId", (req, res) => {
    handleThreadGet(req, res, req.params.threadId);
  });
  app.delete("/mock/api/threads/:threadId", (req, res) => {
    handleThreadDelete(req, res, req.params.threadId);
  });

  // Thread history - THIS IS THE CRITICAL ONE THAT WAS FAILING
  app.post("/mock/api/threads/:threadId/history", (req, res) => {
    handleThreadHistory(req, res, req.params.threadId);
  });

  // Thread state (GET/POST)
  app.get("/mock/api/threads/:threadId/state", (req, res) => {
    handleThreadState(req, res, req.params.threadId);
  });
  app.post("/mock/api/threads/:threadId/state", (req, res) => {
    handleThreadState(req, res, req.params.threadId);
  });

  // Runs streaming
  app.post("/mock/api/threads/:threadId/runs/stream", (req, res) => {
    handleRunsStream(req, res, req.params.threadId);
  });

  console.log("[Mock Server] Registered /mock/api routes");
}

module.exports = { setupMockServer };
