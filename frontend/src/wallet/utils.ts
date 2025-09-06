import { formatUnits } from "viem";

export const formatBalance = (
  value: bigint,
  decimals: number,
  decimalPoints: number
) => Number(formatUnits(value, decimals)).toFixed(decimalPoints);
