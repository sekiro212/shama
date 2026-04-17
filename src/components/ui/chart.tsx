import * as React from "react";
import { Tooltip as RechartsTooltip } from "recharts";

export type ChartConfig = Record<
  string,
  { label: string; color: string; icon?: React.ComponentType }
>;

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
  children: React.ReactNode;
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  const cssVars = Object.entries(config).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[`--color-${key}`] = value.color;
      return acc;
    },
    {},
  );

  return (
    <div
      className={className}
      style={cssVars as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  config?: ChartConfig;
  labelKey?: string;
  nameKey?: string;
  hideLabel?: boolean;
  formatter?: (value: number) => string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  config,
  hideLabel,
  formatter,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-card rounded-lg p-2.5 text-xs shadow-lg border border-[#323D50]/10 dark:border-white/10 bg-white dark:bg-[#1a2235]">
      {!hideLabel && label && (
        <p className="font-medium text-[#323D50] dark:text-[#F5F5F5] mb-1.5">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const cfgEntry = config?.[entry.dataKey];
          return (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || cfgEntry?.color }}
              />
              <span className="text-[#6B7B8D] dark:text-white/60">
                {cfgEntry?.label ?? entry.name}:
              </span>
              <span className="font-medium text-[#323D50] dark:text-[#F5F5F5] ms-auto">
                {formatter ? formatter(entry.value) : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { RechartsTooltip as ChartTooltip };
