import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, Scale, AlertCircle } from "lucide-react";
import type { DailyRecordResponse } from "@/types/dailyRecord";

interface GrowthCurveChartProps {
  records: DailyRecordResponse[];
  isLoading?: boolean;
  error?: string | null;
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: {
      date: string;
      age: number | string;
      avgWeight: number | null;
      minWeight?: number | null;
    };
  }>;
  label?: string;
}

function CustomGrowthTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm text-xs space-y-1.5 min-w-[160px]">
      <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex justify-between items-center">
        <span>Day {data.age}</span>
        <span className="text-[11px] font-normal text-slate-500">{data.date}</span>
      </div>
      <div className="space-y-1 pt-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-bold text-slate-900">
              {entry.value != null ? `${entry.value.toLocaleString()} g` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GrowthCurveChart({
  records,
  isLoading = false,
  error = null,
  height = 320,
}: GrowthCurveChartProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading growth curve data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/40 p-6 text-center shadow-xs"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 text-rose-700">
          <AlertCircle size={24} />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  // Filter and map daily records that have actual weight recorded
  const chartData = records
    .filter((r) => r.avgWeightG != null && r.avgWeightG > 0)
    .map((r, index) => ({
      date: r.recordDate,
      age: r.ageDays ?? index + 1,
      name: `Day ${r.ageDays ?? index + 1}`,
      avgWeight: r.avgWeightG,
      minWeight: r.minBodyWeightG ?? null,
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Growth Curve</h3>
              <p className="text-xs text-slate-500">Average Bird Weight over Age (g)</p>
            </div>
          </div>
        </div>
        <div
          className="flex flex-col items-center justify-center text-center p-8"
          style={{ minHeight: height - 60 }}
        >
          <Scale className="h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No weight records logged</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Enter average bird weights in daily records to plot flock weight progression over time.
          </p>
        </div>
      </div>
    );
  }

  const latestWeight = chartData[chartData.length - 1]?.avgWeight;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <TrendingUp size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Growth Curve</h3>
            <p className="text-xs text-slate-500">Average Bird Weight Progression (g)</p>
          </div>
        </div>
        {latestWeight != null && (
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60">
            <span>Latest Weight:</span>
            <span className="font-bold">{latestWeight.toLocaleString()} g</span>
          </div>
        )}
      </div>

      <div className="mt-4 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={(val) => `${val}g`}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomGrowthTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", paddingTop: "0px" }}
            />
            <Line
              type="monotone"
              dataKey="avgWeight"
              name="Avg Weight (g)"
              stroke="#059669"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#059669", strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 6, fill: "#047857", stroke: "#ffffff", strokeWidth: 2 }}
            />
            {chartData.some((d) => d.minWeight != null) && (
              <Line
                type="monotone"
                dataKey="minWeight"
                name="Min Weight Target (g)"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
