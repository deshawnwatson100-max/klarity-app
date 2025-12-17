import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLoopsStore } from "../state/loopsStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { TrackedRelationship, KlarityLoop } from "../types/loop";

type Props = StackScreenProps<RootStackParamList, "RelationshipGrowthScreen">;

export function RelationshipGrowthScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);

  const trackedRelationships = useLoopsStore((s) => s.trackedRelationships);
  const getLoopsForRelationship = useLoopsStore((s) => s.getLoopsForRelationship);
  const switchToLoop = useLoopsStore((s) => s.switchToLoop);

  const handleBack = () => {
    if (selectedRelationship) {
      setSelectedRelationship(null);
    } else {
      navigation.goBack();
    }
  };

  const handleSelectRelationship = (relationshipId: string) => {
    setSelectedRelationship(relationshipId);
  };

  const handleSelectLoop = (loopId: string) => {
    switchToLoop(loopId);
    navigation.navigate("ChatScreen");
  };

  // Format date relative
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  // Get emotional summary for loops
  const getEmotionalSummary = (loops: KlarityLoop[]) => {
    const withClarity = loops.filter((l) => l.emotionalClarity !== undefined);
    if (withClarity.length === 0) return null;

    const avgClarity = Math.round(
      withClarity.reduce((sum, l) => sum + (l.emotionalClarity || 0), 0) / withClarity.length
    );

    return avgClarity;
  };

  const renderRelationshipList = () => {
    if (trackedRelationships.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "rgba(167, 139, 250, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="heart-outline" size={28} color="#A78BFA" />
          </View>
          <Text
            className="text-lg font-medium text-center mb-2"
            style={{ color: "#E5E7EB" }}
          >
            No relationships tracked yet
          </Text>
          <Text
            className="text-sm text-center"
            style={{ color: "#6B7280", lineHeight: 20 }}
          >
            When you have conversations about specific people, you can choose to track patterns for long-term clarity.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {trackedRelationships.map((relationship, index) => {
          const loops = getLoopsForRelationship(relationship.id);
          const avgClarity = getEmotionalSummary(loops);

          return (
            <Animated.View
              key={relationship.id}
              entering={FadeInDown.duration(300).delay(index * 50)}
            >
              <Pressable
                onPress={() => handleSelectRelationship(relationship.id)}
                className="mx-4 mb-3 active:opacity-60"
              >
                <View
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text
                      className="text-lg font-medium"
                      style={{ color: "#E5E7EB" }}
                    >
                      {relationship.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </View>

                  <View className="flex-row items-center">
                    <Text className="text-sm" style={{ color: "#6B7280" }}>
                      {loops.length} conversation{loops.length !== 1 ? "s" : ""}
                    </Text>
                    {avgClarity !== null && (
                      <>
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: "#4B5563",
                            marginHorizontal: 8,
                          }}
                        />
                        <View className="flex-row items-center">
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor:
                                avgClarity >= 70
                                  ? "#10B981"
                                  : avgClarity >= 40
                                  ? "#F59E0B"
                                  : "#EF4444",
                              marginRight: 6,
                            }}
                          />
                          <Text className="text-sm" style={{ color: "#6B7280" }}>
                            {avgClarity}% avg clarity
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    );
  };

  const renderRelationshipDetail = () => {
    const relationship = trackedRelationships.find((r) => r.id === selectedRelationship);
    if (!relationship) return null;

    const loops = getLoopsForRelationship(relationship.id);

    return (
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Summary Card */}
        <View className="mx-4 mb-4">
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text
              className="text-sm mb-1"
              style={{ color: "#6B7280" }}
            >
              Tracking since {formatDate(relationship.createdAt)}
            </Text>
            <Text
              className="text-sm"
              style={{ color: "#9CA3AF", lineHeight: 20 }}
            >
              {loops.length} conversation{loops.length !== 1 ? "s" : ""} recorded
            </Text>
          </View>
        </View>

        {/* Related Chats */}
        <Text
          className="text-sm font-medium mx-4 mb-3"
          style={{ color: "#6B7280" }}
        >
          Related Conversations
        </Text>

        {loops.length === 0 ? (
          <View className="mx-4 py-8 items-center">
            <Text className="text-sm" style={{ color: "#6B7280" }}>
              No conversations linked yet
            </Text>
          </View>
        ) : (
          loops.map((loop, index) => (
            <Animated.View
              key={loop.id}
              entering={FadeInDown.duration(300).delay(index * 50)}
            >
              <Pressable
                onPress={() => handleSelectLoop(loop.id)}
                className="mx-4 mb-2 active:opacity-60"
              >
                <View
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text
                      className="text-sm font-medium flex-1 mr-2"
                      style={{ color: "#E5E7EB" }}
                      numberOfLines={1}
                    >
                      {loop.title}
                    </Text>
                    <Text className="text-xs" style={{ color: "#6B7280" }}>
                      {formatDate(loop.updatedAt)}
                    </Text>
                  </View>

                  {loop.emotionalClarity !== undefined && (
                    <View className="flex-row items-center mt-1">
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            loop.emotionalClarity >= 70
                              ? "#10B981"
                              : loop.emotionalClarity >= 40
                              ? "#F59E0B"
                              : "#EF4444",
                          marginRight: 6,
                        }}
                      />
                      <Text className="text-xs" style={{ color: "#6B7280" }}>
                        {loop.emotionalClarity}% clarity
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>
    );
  };

  const selectedRelationshipData = selectedRelationship
    ? trackedRelationships.find((r) => r.id === selectedRelationship)
    : null;

  return (
    <View className="flex-1">
      {/* Background */}
      <LinearGradient
        colors={["#050608", "#0A0A0C", "#050608"]}
        locations={[0, 0.5, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={handleBack}
            className="active:opacity-60 mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#9CA3AF" />
          </Pressable>
          <Text className="text-xl font-semibold" style={{ color: "#F9FAFB" }}>
            {selectedRelationshipData
              ? selectedRelationshipData.name
              : "Relationship Growth"}
          </Text>
        </View>
      </View>

      {/* Content */}
      {selectedRelationship ? renderRelationshipDetail() : renderRelationshipList()}
    </View>
  );
}
