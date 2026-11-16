"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("aiops_token") : null;
    if (token) {
      router.replace("/overview");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
