import React from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from "react-native-svg";

interface KlarityLogoProps {
  size?: number;
}

/**
 * Klarity Logo - Abstract "K" lettermark with signal waves
 *
 * A minimal tech logo combining a stylized K shape
 * with radiating arcs suggesting clarity/signal/insight.
 */
export function KlarityLogo({ size = 24 }: KlarityLogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Defs>
          {/* Primary gradient - electric blue to cyan */}
          <LinearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
            <Stop offset="100%" stopColor="#06B6D4" stopOpacity={1} />
          </LinearGradient>

          {/* Secondary gradient for accents */}
          <LinearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#EC4899" stopOpacity={0.7} />
          </LinearGradient>
        </Defs>

        {/* Outer signal arc - largest */}
        <Path
          d="M 26 16 A 10 10 0 0 0 16 6"
          fill="none"
          stroke="url(#mainGradient)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.4}
        />

        {/* Middle signal arc */}
        <Path
          d="M 22 16 A 6 6 0 0 0 16 10"
          fill="none"
          stroke="url(#mainGradient)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.7}
        />

        {/* Inner signal arc - smallest */}
        <Path
          d="M 18 16 A 2 2 0 0 0 16 14"
          fill="none"
          stroke="url(#mainGradient)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={1}
        />

        {/* Center dot - the source point */}
        <Circle
          cx={16}
          cy={16}
          r={3}
          fill="url(#accentGradient)"
        />

        {/* Stylized K stem - vertical line */}
        <Path
          d="M 8 8 L 8 24"
          stroke="url(#mainGradient)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* K diagonal arms */}
        <Path
          d="M 8 16 L 14 10"
          stroke="url(#mainGradient)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Path
          d="M 8 16 L 14 22"
          stroke="url(#mainGradient)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
