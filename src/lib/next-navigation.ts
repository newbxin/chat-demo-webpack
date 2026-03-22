// Mock Next.js navigation hooks for React app
export const useRouter = () => ({
  push: (url: string) => (window.location.href = url),
  replace: (url: string) => window.location.replace(url),
  back: () => window.history.back(),
});

export const usePathname = () => window.location.pathname;

export const useSearchParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    get: (key: string) => params.get(key),
    getAll: (key: string) => params.getAll(key),
  };
};

export const useParams = <T extends Record<string, string>>() => {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return {
    thread_id: lastSegment ?? "",
  } as unknown as T;
};
