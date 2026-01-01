import React from "react";
import { View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

interface KlarityLogoProps {
  size?: number;
}

/**
 * Klarity Logo - ChatGPT-inspired abstract shape
 *
 * Minimal circular logo with an abstract flowing shape
 * suggesting clarity, insight, and conversation flow.
 */
export function KlarityLogo({ size = 24 }: KlarityLogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {/* Outer circle */}
        <Circle
          cx={16}
          cy={16}
          r={14}
          fill="#FFFFFF"
        />

        {/* Abstract flowing shape - like a stylized spark/lens */}
        <Path
          d="M 16 7
             C 22 10, 24 14, 24 16
             C 24 18, 22 22, 16 25
             C 10 22, 8 18, 8 16
             C 8 14, 10 10, 16 7 Z"
          fill="none"
          stroke="#000000"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner dot - the clarity point */}
        <Circle
          cx={16}
          cy={16}
          r={2.5}
          fill="#10A37F"
        />
      </Svg>
    </View>
  );
}
