import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useActiveLoopPersonContextId } from "../state/loopsStore";
import { usePersonContextStore } from "../state/personContextStore";

/**
 * Header icon component for Person Context
 * Uses loop-scoped person context (each loop can have its own person context)
 */
interface PersonContextHeaderIconProps {
  onPress: () => void;
}

export function PersonContextHeaderIcon({
  onPress,
}: PersonContextHeaderIconProps) {
  // Get the person context ID for the current active loop
  const activeLoopPersonContextId = useActiveLoopPersonContextId();
  // Get the actual person context data
  const getPersonContextById = usePersonContextStore((s) => s.getPersonContextById);
  const activePersonContext = activeLoopPersonContextId
    ? getPersonContextById(activeLoopPersonContextId)
    : null;
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
          <Ionicons name="search" size={24} color="#FFFFFF" />
          {/* Linked indicator - double checkmark */}
          <View
            style={{
              position: "absolute",
              top: -2,
              right: -4,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#111111",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark-done" size={10} color="#FFFFFF" />
          </View>
        </View>
      ) : (
        <Ionicons name="search-outline" size={22} color="#6B7280" />
      )}
    </Pressable>
  );
}
