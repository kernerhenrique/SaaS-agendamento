import { Suspense } from "react";

import { BRAND } from "@/config/brand";

import { LoginForm } from "./login-form";

/** Login do painel: capa da marca Aprazzo ao lado no desktop (design system: capa 1920×1080). */
export default function AdminLoginPage() {
  return (
    <main className="flex flex-1">
      <div className="relative hidden flex-1 overflow-hidden bg-primary lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element -- capa estática da marca em /public */}
        <img src={BRAND.coverPath} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="flex flex-1 items-center justify-center p-6 lg:max-w-xl">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
