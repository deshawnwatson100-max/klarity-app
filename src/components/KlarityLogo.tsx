import React from "react";
import { View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

interface KlarityLogoProps {
  size?: number;
}

/**
 * Klarity Logo - ChatGPT-inspired minimal design
 *
 * Clean, circular logo with a subtle abstract shape
 * representing clarity and conversation.
 */
export function KlarityLogo({ size = 24 }: KlarityLogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {/* Outer circle - clean border */}
        <Circle
          cx={16}
          cy={16}
          r={14}
          fill="#FFFFFF"
          opacity={0.95}
        />

        {/* Inner abstract K/spark shape */}
        <Path
          d="M 12 10 L 12 22"
          stroke="#000000"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Path
          d="M 12 16 L 20 10"
          stroke="#000000"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Path
          d="M 12 16 L 20 22"
          stroke="#000000"
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Small accent dot */}
        <Circle
          cx={21}
          cy={16}
          r={2}
          fill="#10A37F"
        />
      </Svg>
    </View>
  );
}
