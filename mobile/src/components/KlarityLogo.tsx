import React from "react";
import { View } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

interface KlarityLogoProps {
  size?: number;
}

/**
 * Klarity Logo - Royal crescent / modern tech
 *
 * Elegant crescent shape with a sleek, premium feel
 * suggesting clarity, insight, and sophistication.
 */
export function KlarityLogo({ size = 24 }: KlarityLogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Defs>
          <LinearGradient id="crescentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset="100%" stopColor="#E2E8F0" stopOpacity={0.95} />
          </LinearGradient>
        </Defs>

        {/* Outer crescent - main shape */}
        <Path
          d="M 16 2
             A 14 14 0 1 1 16 30
             A 10 10 0 1 0 16 2 Z"
          fill="url(#crescentGradient)"
        />

        {/* Inner accent dot - the focal point */}
        <Circle
          cx={10}
          cy={16}
          r={2.5}
          fill="#10A37F"
        />
      </Svg>
    </View>
  );
}
