import React from "react";
import { Sidebar } from "./(dashboard)/_components/sidebar";


export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  );
}
