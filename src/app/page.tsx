import Link from "next/link";
import { ElectricUkulele } from "@/components/ElectricUkulele/ElectricUkulele";
import { EXTERNAL_URLS, SITE_INFO } from "@/lib/constants";
import { containerStyles } from "@/lib/styles";

export default function Home() {
  return (
    <div
      className={`${containerStyles.page} flex items-center justify-center px-8`}
    >
      <main className="max-w-6xl w-full">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
          {/* Electric Ukulele Animation */}
          <div className="w-64 h-64 lg:w-80 lg:h-80 shrink-0">
            <div className="w-full h-full bg-linear-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-lg">
              <ElectricUkulele size={320} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 text-left max-w-xl">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {SITE_INFO.appName}
            </h1>
            <p className="text-lg text-gray-700 mb-4">
              Una app creada a partir del PDF de{" "}
              <a
                href={EXTERNAL_URLS.EL_UKULELE_VENECO}
                target="_blank"
                rel="noopener noreferrer"
                className={containerStyles.externalLink}
              >
                {SITE_INFO.name}
              </a>
              , pa' que sea más fácil encontrar y filtrar estas canciones.
            </p>
            <p className="text-base text-gray-600 mb-8">
              Canciones venezolanas adaptadas al ukulele. Normalmente estas
              canciones se tocan en cuatro, pero el ukulele es más fácil de
              conseguir pa' los que vivimos fuera de Venezuela.
            </p>
            <Link href="/list" className={containerStyles.button}>
              Dale pues →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
