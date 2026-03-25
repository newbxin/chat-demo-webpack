/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_WEBSITE_ONLY?: string;
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_LANGGRAPH_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
