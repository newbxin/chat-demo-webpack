type AppEnv = {
  readonly VITE_STATIC_WEBSITE_ONLY?: string;
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_LANGGRAPH_BASE_URL?: string;
};

type NormalizedEnv = {
  STATIC_WEBSITE_ONLY: boolean;
  NEXT_PUBLIC_STATIC_WEBSITE_ONLY: boolean;
  NEXT_PUBLIC_BACKEND_BASE_URL: string;
  NEXT_PUBLIC_LANGGRAPH_BASE_URL: string;
};

const rawEnv = import.meta.env as ImportMetaEnv & AppEnv;

export const env: NormalizedEnv = {
  STATIC_WEBSITE_ONLY: rawEnv.VITE_STATIC_WEBSITE_ONLY === "true",
  NEXT_PUBLIC_STATIC_WEBSITE_ONLY: rawEnv.VITE_STATIC_WEBSITE_ONLY === "true",
  NEXT_PUBLIC_BACKEND_BASE_URL: rawEnv.VITE_BACKEND_BASE_URL ?? "",
  NEXT_PUBLIC_LANGGRAPH_BASE_URL: rawEnv.VITE_LANGGRAPH_BASE_URL ?? "",
};
