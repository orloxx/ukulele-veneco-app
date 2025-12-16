"use client";

import Lottie from "lottie-react";
import animationData from "./animation.json";

interface ElectricUkuleleProps {
  size?: number;
}

export function ElectricUkulele({ size = 300 }: ElectricUkuleleProps) {
  return (
    <Lottie
      animationData={animationData}
      loop={true}
      autoplay={true}
      style={{ width: size, height: size }}
    />
  );
}

export default ElectricUkulele;
