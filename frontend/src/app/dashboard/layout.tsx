import React, { Suspense } from "react";
import DashboardLayoutClient from "./DashboardLayoutClient";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </Suspense>
  );
}