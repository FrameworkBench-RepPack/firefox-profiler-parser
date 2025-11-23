import {
  PowerAmountUnit,
  PowerAmount,
  PowerAmountSeries,
  type SerializedPowerAmount,
  type SerializedPowerAmountSeries,
} from "../power-amount.ts";
import { type Counter } from "../schemas/profilerSchema.ts";

export type SerializedBenchmarkPowerConsumption = {
  total: SerializedPowerAmount;
  measurements: SerializedPowerAmountSeries;
};

export type BenchmarkPowerConsumption = {
  total: PowerAmount;
  measurements: PowerAmountSeries;
};

export function processPowerConsumption(
  counter: Counter,
): BenchmarkPowerConsumption {
  if (counter.category !== "power")
    throw new Error("Counter does not contain power samples");

  const timeIndex = counter.samples.schema["time"];
  const powerIndex = counter.samples.schema["count"];

  if (timeIndex === undefined || powerIndex === undefined)
    throw new Error("Counter does not contain power samples");

  const powerConsumption: {
    total: number;
    measurements: { time: number; power: number }[];
  } = {
    total: 0,
    measurements: [],
  };

  for (const sample of counter.samples.data) {
    const time = sample[timeIndex];
    const power = sample[powerIndex];

    if (!time || !power) throw new Error("Time or power not defined");

    powerConsumption.total += power;
    powerConsumption.measurements.push({
      time,
      power,
    });
  }

  return {
    total: new PowerAmount(
      powerConsumption.total,
      PowerAmountUnit.PicoWattHour,
    ),
    measurements: new PowerAmountSeries(
      PowerAmountUnit.PicoWattHour,
      powerConsumption.measurements,
    ),
  };
}
