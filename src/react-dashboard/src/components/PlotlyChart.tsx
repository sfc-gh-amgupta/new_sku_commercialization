"use client";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface PlotlyChartProps {
  data: any[];
  title?: string;
  height?: number;
  yFormat?: string;
  xTitle?: string;
  yTitle?: string;
  barmode?: "group" | "stack";
  showLegend?: boolean;
  layout?: Record<string, any>;
}

export default function PlotlyChart({ data, title, height = 300, yFormat, xTitle, yTitle, barmode, showLegend = true, layout: layoutOverride }: PlotlyChartProps) {
  const baseLayout: any = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    font: { color: "#e2e8f0", size: 11 },
    margin: { t: title ? 30 : 10, r: 20, b: xTitle ? 50 : 35, l: yTitle ? 65 : 55 },
    xaxis: { gridcolor: "#e2e8f0", title: xTitle || undefined, tickfont: { color: "#475569" }, titlefont: { color: "#94a3b8" } },
    yaxis: { gridcolor: "#e2e8f0", tickformat: yFormat || "~s", title: yTitle || undefined, tickfont: { color: "#475569" }, titlefont: { color: "#94a3b8" } },
    legend: { orientation: "h", y: -0.25, font: { size: 10, color: "#e2e8f0" } },
    showlegend: showLegend,
    barmode: barmode || "group",
    height,
    autosize: true,
  };

  if (layoutOverride) {
    const { xaxis, yaxis, ...rest } = layoutOverride;
    Object.assign(baseLayout, rest);
    if (xaxis) baseLayout.xaxis = { ...baseLayout.xaxis, ...xaxis };
    if (yaxis) baseLayout.yaxis = { ...baseLayout.yaxis, ...yaxis };
    baseLayout.plot_bgcolor = "#ffffff";
  }

  return (
    <div>
      {title && <h3 className="text-center text-sm font-medium text-white mb-2">{title}</h3>}
      <Plot
        data={data}
        layout={baseLayout}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height }}
      />
    </div>
  );
}
