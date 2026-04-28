"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Props = {
  targetId: string;
  className?: string;
  children: string;
};

function scrollToTarget(targetId: string, behavior: ScrollBehavior) {
  const target = document.getElementById(targetId);
  if (!target) return false;

  target.scrollIntoView({
    behavior,
    block: "start",
    inline: "nearest",
  });

  return true;
}

export default function VerExpedienteCompletoButton({
  targetId,
  className,
  children,
}: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hash !== `#${targetId}`) return;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToTarget(targetId, "auto");
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, targetId]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const found = scrollToTarget(targetId, "smooth");
        if (!found) return;
        window.history.replaceState(null, "", `${pathname}#${targetId}`);
      }}
    >
      {children}
    </button>
  );
}
