export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl">📶</div>
      <h1 className="text-2xl font-bold">Sin conexión</h1>
      <p className="text-muted-foreground">
        Parece que estás sin conexión. Revisa tu red e inténtalo de nuevo.
      </p>
    </div>
  );
}
