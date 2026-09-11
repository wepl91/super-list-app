"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import PantryEditor from "@/components/PantryEditor";

export default function DespensaPage() {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-lg flex-1 p-6 pb-24">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-1">
            <Link
              href="/"
              aria-label="Volver al inicio"
              className="mt-1 rounded-lg p-0.5 text-primary transition-colors hover:opacity-80"
            >
              <ArrowLeft className="h-6 w-6" aria-hidden />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary">Mi despensa</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Tu catálogo personal. Se alimenta de lo que agregás a tus listas.
              </p>
            </div>
          </div>
        </header>
        <PantryEditor />
      </div>
    </PageTransition>
  );
}