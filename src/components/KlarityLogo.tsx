import React from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Circle, G } from "react-native-svg";

interface KlarityLogoProps {
  size?: number;
}

/**
 * Klarity Logo - Abstract prism/lens symbol
 *
 * A modern tech logo representing clarity and insight.
 * Features a geometric prism shape with subtle gradients
 * that suggests light being focused/clarified.
 */
export function KlarityLogo({ size = 24 }: KlarityLogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Defs>
          {/* Main gradient - cool blue to teal */}
          <LinearGradient id="prismGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#60A5FA" stopOpacity={1} />
            <Stop offset="50%" stopColor="#34D399" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#2DD4BF" stopOpacity={1} />
          </LinearGradient>

          {/* Accent gradient for inner element */}
          <LinearGradient id="innerGlow" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#818CF8" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#F0ABFC" stopOpacity={0.6} />
          </LinearGradient>

          {/* Subtle shadow gradient */}
          <LinearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1E293B" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#0F172A" stopOpacity={0.5} />
          </LinearGradient>
        </Defs>

        {/* Outer prism shape - hexagonal lens */}
        <G>
          {/* Main prism body */}
          <Path
            d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
            fill="url(#prismGradient)"
            opacity={0.95}
          />

          {/* Inner facet - left */}
          <Path
            d="M16 2 L4 9 L16 16 Z"
            fill="#F0F9FF"
            opacity={0.25}
          />

          {/* Inner facet - right highlight */}
          <Path
            d="M16 2 L28 9 L16 16 Z"
            fill="#FFFFFF"
            opacity={0.15}
          />

          {/* Center point - the "clarity" focus */}
          <Circle
            cx={16}
            cy={16}
            r={4}
            fill="url(#innerGlow)"
          />

          {/* Inner ring */}
          <Circle
            cx={16}
            cy={16}
            r={6}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={0.5}
            opacity={0.4}
          />

          {/* Light ray lines emanating from center */}
          <Path
            d="M16 10 L16 6"
            stroke="#FFFFFF"
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.5}
          />
          <Path
            d="M21.2 13 L24.5 10.5"
            stroke="#FFFFFF"
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.4}
          />
          <Path
            d="M10.8 13 L7.5 10.5"
            stroke="#FFFFFF"
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.4}
          />
        </G>
      </Svg>
    </View>
  );
}
