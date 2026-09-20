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
import { Activity, AlertCircle, FileSpreadsheet } from "lucide-react";
import type { DailyRecordResponse } from "@/types/dailyRecord";

interface FcrTrajectoryChartProps {
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
      fcr: number | null;
      standardFcr?: number | null;
      feedConsumedKg?: number | null;
    };
  }>;
  label?: string;
}

function CustomFcrTooltip({ active, payload }: CustomTooltipProps) {
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
              {entry.value != null ? Number(entry.value).toFixed(3) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FcrTrajectoryChart({
  records,
  isLoading = false,
  error = null,
  height = 300,
}: FcrTrajectoryChartProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading FCR trajectory...</p>
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

  // Filter actual real records with calculated FCR values
  const chartData = records
    .filter((r) => r.fcr != null && r.fcr > 0)
    .map((r, index) => ({
      date: r.recordDate,
      age: r.ageDays ?? index + 1,
      name: `Day ${r.ageDays ?? index + 1}`,
      fcr: Number(r.fcr),
      standardFcr: r.standardFcr != null ? Number(r.standardFcr) : null,
      feedConsumedKg: r.feedConsumedKg,
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Activity size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">FCR Trajectory</h3>
              <p className="text-xs text-slate-500">Feed Conversion Ratio over Age</p>
            </div>
          </div>
        </div>
        <div
          className="flex flex-col items-center justify-center text-center p-8"
          style={{ minHeight: height - 60 }}
        >
          <FileSpreadsheet className="h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No FCR data available</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            FCR is calculated automatically when feed consumed and average bird weights are recorded.
          </p>
        </div>
      </div>
    );
  }

  const latestFcr = chartData[chartData.length - 1]?.fcr;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">FCR Trajectory</h3>
            <p className="text-xs text-slate-500">Feed Conversion Efficiency Trend</p>
          </div>
        </div>
        {latestFcr != null && (
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200/60">
            <span>Latest FCR:</span>
            <span className="font-bold">{latestFcr.toFixed(3)}</span>
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
              tickFormatter={(val) => Number(val).toFixed(2)}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomFcrTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", paddingTop: "0px" }}
            />
            <Line
              type="monotone"
              dataKey="fcr"
              name="Actual FCR"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 6, fill: "#1d4ed8", stroke: "#ffffff", strokeWidth: 2 }}
            />
            {chartData.some((d) => d.standardFcr != null) && (
              <Line
                type="monotone"
                dataKey="standardFcr"
                name="Standard FCR Target"
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
