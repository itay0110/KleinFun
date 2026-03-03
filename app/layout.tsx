import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { KleinFunProvider } from "@/lib/state";

export const metadata: Metadata = {
  title: "KleinFun",
  description: "Lightweight group availability & activity planner"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <KleinFunProvider>
          <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-4">
            {children}
          </div>
        </KleinFunProvider>
      </body>
    </html>
  );
}

