import { useCurrentFrame, interpolate } from "remotion";

type Props = {
  target: number;
  suffix?: string;
  prefix?: string;
  durationInFrames?: number;
  decimals?: number;
};

export const AnimatedCounter: React.FC<Props> = ({
  target,
  suffix = "",
  prefix = "",
  durationInFrames = 60,
  decimals = 0,
}) => {
  const frame = useCurrentFrame();

  const value = interpolate(frame, [0, durationInFrames], [0, target], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const display =
    decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toString();

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};
