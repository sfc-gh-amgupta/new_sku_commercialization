interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: "green" | "red" | "yellow" | "gray";
}

export default function MetricCard({ label, value, delta, deltaColor = "gray" }: MetricCardProps) {
  const colorMap = { green: "text-emerald-400", red: "text-red-400", yellow: "text-yellow-400", gray: "text-slate-400" };
  return (
    <div className="bg-[#1e3a5f] rounded-lg border border-[#2a4d73] p-4 shadow-lg">
      <p className="text-sm text-blue-300">{label}</p>
      <p className="text-2xl font-bold mt-1 text-white">{value}</p>
      {delta && <p className={`text-sm mt-1 ${colorMap[deltaColor]}`}>{delta}</p>}
    </div>
  );
}
