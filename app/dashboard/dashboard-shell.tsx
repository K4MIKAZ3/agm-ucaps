"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { DashboardProyecto, DashboardItem, DashboardKpi } from "@/lib/dashboard-utils";

type DashboardViewsProps = {
  kpi: DashboardKpi;
  proyectos: DashboardProyecto[];
  itemsByProyecto: Record<string, DashboardItem[]>;
  canManage: boolean;
};

const DashboardViews = dynamic(
  () => import("./dashboard-views"),
  {
    ssr: false,
    loading: () => (
      <div className="card" style={{ padding: 24, textAlign: "center" }}>
        Cargando dashboard…
      </div>
    ),
  }
) as ComponentType<DashboardViewsProps>;

type Props = {
  kpi: DashboardKpi;
  proyectos: DashboardProyecto[];
  itemsByProyecto: Record<string, DashboardItem[]>;
  canManage: boolean;
};

export default function DashboardShell(props: Props) {
  return <DashboardViews {...props} />;
}
