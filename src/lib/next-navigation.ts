// Mock Next.js navigation hooks for React app
export const useRouter = () => ({
  push: (url: string) => window.location.href = url,
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

export const useParams = () => {
  return {};
};
