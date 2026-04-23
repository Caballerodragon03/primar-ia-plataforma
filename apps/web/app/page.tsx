import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Primar<span className="text-primary">-IA</span>
        </h1>
        <p className="text-secondary text-lg mb-8">
          La lonja digital del sector primario espanol
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-primary text-gray-900 font-semibold px-6 py-3 rounded-button hover:opacity-90 transition-opacity"
          >
            Entrar a la plataforma
          </Link>
          <Link
            href="/register"
            className="border border-secondary text-secondary font-semibold px-6 py-3 rounded-button hover:bg-gray-100 transition-colors"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </main>
  );
}
