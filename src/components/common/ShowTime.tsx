import { useEffect, useState } from "react";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function ShowTime() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };
    let intervalId: number | undefined;

    updateTime();

    const now = new Date();
    const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeoutId = window.setTimeout(() => {
      updateTime();

      intervalId = window.setInterval(updateTime, 60 * 1000);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <div className="flex h-20 w-[200px] items-center justify-center rounded-2xl bg-sky-300 text-3xl font-semibold tracking-wide text-white shadow-sm">
      <span>{formatTime(currentTime)}</span>
    </div>
  );
}
