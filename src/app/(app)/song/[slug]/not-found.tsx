import Link from "next/link";
import { containerStyles } from "@/lib/styles";

export default function NotFound() {
  return (
    <div
      className={`${containerStyles.page} flex items-center justify-center px-4`}
    >
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Canción no encontrada
        </h2>
        <p className="text-gray-600 mb-8">
          La canción que buscas no existe en nuestra base de datos.
        </p>
        <Link href="/" className={containerStyles.button}>
          Volver a la lista de canciones
        </Link>
      </div>
    </div>
  );
}
