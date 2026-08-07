"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRedirect({
  to,
  children,
}: {
  to: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <>{children}</>;
}
