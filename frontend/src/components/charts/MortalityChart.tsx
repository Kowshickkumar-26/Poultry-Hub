import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { AlertTriangle, AlertCircle, HeartPulse } from "lucide-react";
import type { DailyRecordResponse } from "@/types/dailyRecord";

interface MortalityChartProps {
  records: DailyRecordResponse[];
  initialBirds?: number;
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
      dailyMortality: number;
      morningMortality: number;
      cumulativeMortality: number;
      cumulativeMortalityPct?: number | null;
    };
  }>;
  label?: string;
}

function CustomMortalityTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm text-xs space-y-2 min-w-[190px]">
      <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex justify-between items-center">
        <span>Day {data.age}</span>
        <span className="text-[11px] font-normal text-slate-500">{data.date}</span>
      </div>
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 font-medium">Daily Mortality:</span>
          <span className="font-bold text-rose-600">{data.dailyMortality} birds</span>
        </div>
        {data.morningMortality > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Morning Deaths:</span>
            <span className="font-semibold text-slate-700">{data.morningMortality}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 pt-1">
          <span className="text-slate-600 font-medium">Cumulative Total:</span>
          <span className="font-bold text-slate-900">{data.cumulativeMortality} birds</span>
        </div>
        {data.cumulativeMortalityPct != null && (
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Mortality %:</span>
            <span className="font-bold text-rose-700">{Number(data.cumulativeMortalityPct).toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MortalityChart({
  records,
  isLoading = false,
  error = null,
  height = 300,
}: MortalityChartProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-rose-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading mortality data...</p>
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

  // Filter daily records
  const chartData = records.map((r, index) => ({
    date: r.recordDate,
    age: r.ageDays ?? index + 1,
    name: `Day ${r.ageDays ?? index + 1}`,
    dailyMortality: r.mortality ?? 0,
    morningMortality: r.morningMortality ?? 0,
    cumulativeMortality: r.cumulativeMortality ?? 0,
    cumulativeMortalityPct: r.cumulativeMortalityPct,
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mortality Analysis</h3>
              <p className="text-xs text-slate-500">Daily Bird Losses (birds)</p>
            </div>
          </div>
        </div>
        <div
          className="flex flex-col items-center justify-center text-center p-8"
          style={{ minHeight: height - 60 }}
        >
          <HeartPulse className="h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No mortality records logged</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Daily bird mortality records will appear here as daily logs are entered.
          </p>
        </div>
      </div>
    );
  }

  const latestRecord = chartData[chartData.length - 1];
  const totalCumulativeMortality = latestRecord?.cumulativeMortality ?? 0;
  const latestPct = latestRecord?.cumulativeMortalityPct;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mortality Analysis</h3>
            <p className="text-xs text-slate-500">Daily Deaths & Flock Health</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 border border-rose-200/60">
          <span>Total Loss:</span>
          <span className="font-bold">{totalCumulativeMortality.toLocaleString()}</span>
          {latestPct != null && (
            <span className="text-rose-600 font-bold">({Number(latestPct).toFixed(2)}%)</span>
          )}
        </div>
      </div>

      <div className="mt-4 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
              allowDecimals={false}
            />
            <Tooltip content={<CustomMortalityTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", paddingTop: "0px" }}
            />
            <Bar
              dataKey="dailyMortality"
              name="Daily Mortality (birds)"
              fill="#e11d48"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
