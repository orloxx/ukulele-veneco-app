import Link from "next/link";

export default function NotFound() {
  return (
    <div className="uv-notfound">
      <p className="uv-eyebrow">404</p>
      <h1 className="uv-notfound__title">Esa canción no está aquí</h1>
      <p className="uv-notfound__body">
        Puede que esté escrita de otra manera. Búscala en el cancionero por
        título o por artista.
      </p>
      <Link href="/list" className="uv-btn uv-btn--primary uv-btn--lg">
        <span>Volver al cancionero</span>
      </Link>
    </div>
  );
}
