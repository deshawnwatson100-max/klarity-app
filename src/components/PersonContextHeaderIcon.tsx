import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useActivePersonContext } from "../state/personContextStore";

/**
 * Header icon component for Person Context
 */
interface PersonContextHeaderIconProps {
  onPress: () => void;
}

export function PersonContextHeaderIcon({
  onPress,
}: PersonContextHeaderIconProps) {
  const activePersonContext = useActivePersonContext();
  const hasActivePerson = !!activePersonContext;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="active:opacity-60"
      style={{ marginRight: 12 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {hasActivePerson ? (
        <View style={{ position: "relative" }}>
          <Ionicons name="person-circle" size={24} color="#818CF8" />
          {/* Active indicator dot */}
          <View
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#34D399",
              borderWidth: 1.5,
              borderColor: "#111111",
            }}
          />
        </View>
      ) : (
        <Ionicons name="person-add-outline" size={22} color="#6B7280" />
      )}
    </Pressable>
  );
}
