"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SITE_INFO } from "@/lib/constants";
import { containerStyles } from "@/lib/styles";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const showBackButton =
    pathname?.startsWith("/list") || pathname?.startsWith("/song");

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
      <div className={`${containerStyles.main} py-4`}>
        <div className="flex items-center justify-between">
          {/* Back button or spacer */}
          <div className="w-24">
            {showBackButton && (
              <button
                type="button"
                onClick={() => router.back()}
                className={`flex items-center ${containerStyles.interactiveText}`}
                aria-label="Volver"
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="text-sm font-medium">Volver</span>
              </button>
            )}
          </div>

          {/* Home link */}
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
          >
            <h1>{SITE_INFO.appName}</h1>
          </Link>

          {/* Right spacer for balance */}
          <div className="w-24" />
        </div>
      </div>
    </header>
  );
}
