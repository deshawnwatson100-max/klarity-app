import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useStylesStore } from "../state/stylesStore";
import { getStyleSummaryTag } from "../types/communicationStyle";

type Props = StackScreenProps<RootStackParamList, "CommunicationStylesScreen">;

export function CommunicationStylesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const profiles = useStylesStore((s) => s.getAllProfiles());

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSelectProfile = (profileId: string) => {
    navigation.navigate("StyleDetailScreen", { profileId });
  };

  // Get color for style tag
  const getTagColor = (tag: string): string => {
    if (tag.includes("Professional")) return "#4C9CFF"; // Blue
    if (tag.includes("Soft") || tag.includes("Gentle")) return "#B47CFF"; // Purple
    if (tag.includes("Direct") || tag.includes("Casual")) return "#FF884D"; // Orange
    if (tag.includes("Playful") || tag.includes("Expressive")) return "#FFD755"; // Yellow
    return "#9CA3AF"; // Gray default
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050505",
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#262626",
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={handleBack}
            className="active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-xl font-bold">Communication Styles</Text>
          <View style={{ width: 28 }} />
        </View>
        <Text className="text-neutral-400 text-sm text-center">
          Customize how Klarity writes replies for each person.
        </Text>
      </View>

      {/* Content */}
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {profiles.length === 0 ? (
            /* Empty State */
            <View className="items-center justify-center py-20">
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#0A0A0A",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="people-outline" size={40} color="#4C9CFF" />
              </View>
              <Text className="text-neutral-300 text-lg font-semibold text-center mb-2">
                No Communication Styles Yet
              </Text>
              <Text className="text-neutral-500 text-sm text-center px-8 leading-6">
                As you use Klarity to communicate with different people, profiles will
                automatically be created here.
              </Text>
            </View>
          ) : (
            /* Profiles List */
            <View className="gap-3">
              {profiles.map((profile, index) => {
                const styleTag = getStyleSummaryTag(profile);
                const tagColor = getTagColor(styleTag);

                return (
                  <Animated.View
                    key={profile.id}
                    entering={FadeIn.delay(index * 50).duration(300)}
                  >
                    <Pressable
                      onPress={() => handleSelectProfile(profile.id)}
                      className="active:opacity-70"
                    >
                      <View
                        style={{
                          backgroundColor: "#0A0A0A",
                          borderRadius: 16,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: "#262626",
                        }}
                      >
                        <View className="flex-row items-center">
                          {/* Avatar */}
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              backgroundColor: tagColor + "20",
                              borderWidth: 2,
                              borderColor: tagColor + "40",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                            }}
                          >
                            {profile.contactAvatarUrl ? (
                              <Text className="text-white text-base font-bold">
                                {profile.contactInitials}
                              </Text>
                            ) : (
                              <Text
                                style={{ color: tagColor }}
                                className="text-base font-bold"
                              >
                                {profile.contactInitials}
                              </Text>
                            )}
                          </View>

                          {/* Content */}
                          <View className="flex-1">
                            <Text className="text-white text-base font-semibold mb-1">
                              {profile.contactName}
                            </Text>

                            {/* Style Tag */}
                            <View
                              style={{
                                backgroundColor: tagColor + "20",
                                borderWidth: 1,
                                borderColor: tagColor + "40",
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                alignSelf: "flex-start",
                              }}
                            >
                              <Text
                                style={{ color: tagColor }}
                                className="text-xs font-semibold"
                              >
                                {styleTag}
                              </Text>
                            </View>
                          </View>

                          {/* Chevron */}
                          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                        </View>
                      </View>
                    </Pressable>

                    {/* Accent Glow Separator */}
                    {index < profiles.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          marginVertical: 12,
                          backgroundColor: tagColor + "15",
                          shadowColor: tagColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                        }}
                      />
                    )}
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
