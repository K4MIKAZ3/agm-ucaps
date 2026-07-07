"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { DashboardProyecto, DashboardItem, DashboardKpi } from "@/lib/dashboard-utils";
import type { MonthlyPortfolioPoint } from "@/lib/dashboard-snapshots";

type DashboardViewsProps = {
  kpi: DashboardKpi;
  proyectos: DashboardProyecto[];
  itemsByProyecto: Record<string, DashboardItem[]>;
  itemCounts: Record<string, number>;
  monthlyTrend: MonthlyPortfolioPoint[];
  canManage: boolean;
};

const DashboardViews = dynamic(() => import("./dashboard-views"), {
  ssr: false,
  loading: () => (
    <div className="card" style={{ padding: 24, textAlign: "center" }}>
      Cargando dashboard…
    </div>
  ),
}) as ComponentType<DashboardViewsProps>;

export default function DashboardShell(props: DashboardViewsProps) {
  return <DashboardViews {...props} />;
}
