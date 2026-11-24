"use client";

import React, { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCard initialMode="register" />
    </Suspense>
  );
}
