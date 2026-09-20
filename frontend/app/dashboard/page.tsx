import { Suspense } from "react";

import { DashboardContent } from "@/components/dashboard-content";

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>;
}
