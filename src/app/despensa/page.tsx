"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import PantryEditor from "@/components/PantryEditor";

export default function DespensaPage() {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-lg flex-1 p-6 pb-24">
        <header className="mb-6">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Inicio
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Mi despensa</h1>
          <p className="text-sm text-text-secondary">
            Tu catálogo personal. Se alimenta de lo que agregás a tus listas.
          </p>
        </header>
        <PantryEditor />
      </div>
    </PageTransition>
  );
}