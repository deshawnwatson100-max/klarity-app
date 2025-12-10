import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { useCalendarStore } from "../state/calendarStore";
import { INTENTIONS, EVENT_TYPES } from "../types/calendar";
import { RootStackParamList } from "../navigation/RootNavigator";
import { DayDetailDrawer } from "../components/DayDetailDrawer";
import { ReflectionModal } from "../components/ReflectionModal";
import { FloatingParticles } from "../components/FloatingParticles";
import { SoftFlares } from "../components/SoftFlares";

type Props = StackScreenProps<RootStackParamList, "CalendarScreen">;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<any[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reflectionModalVisible, setReflectionModalVisible] = useState(false);
  const [selectedEntryForReflection, setSelectedEntryForReflection] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Shared values for swipe transition
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const getEntriesForDate = useCalendarStore((s) => s.getEntriesForDate);
  const updateEntry = useCalendarStore((s) => s.updateEntry);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Reset animation values when screen is focused
  useEffect(() => {
    translateX.value = 0;
    scale.value = 1;
    opacity.value = 1;
  }, []);

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleDatePress = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const entries = getEntriesForDate(dateStr);

    if (entries.length > 0) {
      setSelectedDate(dateStr);
      setSelectedEntries(entries);
      setDrawerVisible(true);
    }
  };

  const handleOpenLoop = (loopId: string) => {
    // Navigate to ChatScreen with the specific loop
    setDrawerVisible(false);
    // You would implement navigation to the specific loop here
    console.log("Opening loop:", loopId);
  };

  const handleAddReflection = (entryId: string) => {
    const entry = selectedEntries.find((e) => e.id === entryId);
    if (entry) {
      setSelectedEntryForReflection({
        id: entryId,
        title: entry.title || entry.quickSummary,
      });
      setReflectionModalVisible(true);
    }
  };

  const handleSaveReflection = (clarityScore: number, reflectionNotes: string) => {
    if (selectedEntryForReflection) {
      updateEntry(selectedEntryForReflection.id, {
        clarityScore,
        reflectionNotes,
        status: "completed",
      });
      setReflectionModalVisible(false);
      setSelectedEntryForReflection(null);
      // Refresh the entries
      if (selectedDate) {
        setSelectedEntries(getEntriesForDate(selectedDate));
      }
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const screenWidth = Dimensions.get("window").width;
    const dayWidth = (screenWidth - 32) / 7; // padding consideration

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <View
          key={`empty-${i}`}
          style={{ width: dayWidth, height: dayWidth }}
          className="p-1"
        />
      );
    }

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const entries = getEntriesForDate(dateStr);
      const hasEntries = entries.length > 0;

      // Get intention colors for this date
      const intentionColors = entries.map(
        (entry) => INTENTIONS[entry.intention].color
      );

      const isToday =
        day === new Date().getDate() &&
        currentMonth === new Date().getMonth() &&
        currentYear === new Date().getFullYear();

      days.push(
        <Pressable
          key={day}
          onPress={() => handleDatePress(day)}
          style={{ width: dayWidth, height: dayWidth }}
          className="p-1"
        >
          {({ pressed }) => (
            <View
              className="flex-1 items-center justify-center rounded-xl"
              style={{
                backgroundColor: hasEntries
                  ? "rgba(20, 20, 24, 0.45)"
                  : isToday
                  ? "rgba(20, 20, 24, 0.35)"
                  : "rgba(20, 20, 24, 0.15)",
                borderWidth: isToday ? 1 : 0.5,
                borderColor: isToday
                  ? "rgba(156, 163, 175, 0.4)"
                  : "rgba(156, 163, 175, 0.08)",
                transform: [{ scale: pressed ? 0.95 : 1 }],
                // Frosted glass inner shadow effect
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
              }}
            >
              <Text
                className="text-base font-medium"
                style={{
                  color: hasEntries ? "#F9FAFB" : "#9CA3AF",
                }}
              >
                {day}
              </Text>

              {/* Event Type indicators with gradient glow */}
              {hasEntries && (
                <View className="flex-row gap-1 mt-1.5 flex-wrap justify-center">
                  {Array.from(new Set(entries.map((e) => e.eventType)))
                    .slice(0, 3)
                    .map((eventType, index) => (
                      <View
                        key={`event-${index}`}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 2.5,
                          shadowColor: EVENT_TYPES[eventType].color,
                          shadowOpacity: 0.9,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 0 },
                        }}
                      >
                        <LinearGradient
                          colors={[
                            EVENT_TYPES[eventType].color,
                            EVENT_TYPES[eventType].color + "CC",
                            EVENT_TYPES[eventType].color + "88",
                          ]}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                          }}
                        />
                      </View>
                    ))}
                  {entries.length > 3 && (
                    <Text
                      className="text-[9px] ml-0.5"
                      style={{ color: "#9CA3AF", opacity: 0.7 }}
                    >
                      +{entries.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </Pressable>
      );
    }

    return days;
  };

  // Handler for navigating back to InputScreen (must be wrapped with runOnJS)
  const handleNavigateBack = () => {
    navigation.navigate("InputScreen");
  };

  // Swipe gesture to go back to InputScreen
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-50) // Only trigger when swiping left with at least 50px
        .failOffsetX(50) // Fail if swiping right
        .onUpdate((event) => {
          // Only allow left swipes (negative translationX)
          if (event.translationX < 0) {
            translateX.value = event.translationX;
            scale.value = interpolate(
              Math.abs(event.translationX),
              [0, 150],
              [1, 0.92],
              Extrapolate.CLAMP
            );
            opacity.value = interpolate(
              Math.abs(event.translationX),
              [0, 100],
              [1, 0.7],
              Extrapolate.CLAMP
            );
          }
        })
        .onEnd((event) => {
          // If user swiped left with sufficient distance and velocity
          if (event.velocityX < -800 && event.translationX < -120) {
            translateX.value = withTiming(-400, { duration: 120 }, (finished) => {
              if (finished) {
                runOnJS(handleNavigateBack)();
              }
            });
            scale.value = withTiming(0.85, { duration: 120 });
            opacity.value = withTiming(0, { duration: 120 });
          } else {
            // Spring back to original position
            translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
            scale.value = withSpring(1, { damping: 20, stiffness: 300 });
            opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
          }
        }),
    [navigation]
  );

  // Animated style for the swipe transition
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
    shadowOpacity: interpolate(
      Math.abs(translateX.value),
      [0, 400],
      [0, 0.3],
      Extrapolate.CLAMP
    ),
    shadowRadius: 20,
    shadowColor: "#000000",
  }));

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
        {/* Deep charcoal background - identical to InputScreen */}
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

        {/* Soft flares - Layer 1 */}
        <SoftFlares />

        {/* Floating particles - Layer 2 */}
        <FloatingParticles count={20} />

        <View className="flex-1" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-6 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-bold mb-1" style={{ color: "#F9FAFB" }}>
            Your Emotional Timeline
          </Text>
          <Text className="text-sm" style={{ color: "#E5E7EB" }}>
            Track your clarity journey
          </Text>
        </View>

        {/* Home Button */}
        <Pressable
          onPress={() => navigation.navigate("InputScreen")}
          className="active:opacity-60 mt-1"
        >
          <Ionicons name="home" size={28} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Month Navigation */}
      <View className="flex-row items-center justify-between px-4 mb-6">
        <Pressable
          onPress={handlePreviousMonth}
          className="p-2 active:opacity-60"
        >
          <Ionicons name="chevron-back" size={24} color="#9CA3AF" />
        </Pressable>

        <Text className="text-xl font-semibold" style={{ color: "#F9FAFB" }}>
          {MONTHS[currentMonth]} {currentYear}
        </Text>

        <Pressable
          onPress={handleNextMonth}
          className="p-2 active:opacity-60"
        >
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Legend */}
      <View className="px-4 mb-4">
        <View className="flex-row flex-wrap gap-2 justify-center">
          {Object.entries(INTENTIONS).map(([key, config]) => (
            <View
              key={key}
              className="flex-row items-center rounded-full px-3 py-2"
              style={{
                backgroundColor: "rgba(20, 20, 24, 0.4)",
                borderWidth: 0.5,
                borderColor: "rgba(156, 163, 175, 0.1)",
                minWidth: "22%",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  shadowColor: config.color,
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <LinearGradient
                  colors={[config.color, config.color + "CC", config.color + "88"]}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                  }}
                />
              </View>
              <Text className="text-xs font-medium ml-2" style={{ color: "#E5E7EB" }}>
                {config.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Calendar Grid */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Day headers */}
        <View className="flex-row mb-2">
          {DAYS.map((day) => (
            <View
              key={day}
              style={{ width: (Dimensions.get("window").width - 32) / 7 }}
              className="items-center"
            >
              <Text className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar days */}
        <View className="flex-row flex-wrap mb-8">{renderCalendarDays()}</View>

        {/* Empty state hint */}
        <View className="items-center py-8">
          <Ionicons name="calendar-outline" size={48} color="#505050" />
          <Text className="text-sm mt-3 text-center px-8" style={{ color: "#9CA3AF" }}>
            Dates with colored dots contain emotional log entries.{"\n"}Tap to
            view details.
          </Text>
        </View>
      </ScrollView>

      {/* Day Detail Drawer */}
      <DayDetailDrawer
        visible={drawerVisible}
        date={selectedDate || ""}
        entries={selectedEntries}
        onClose={() => setDrawerVisible(false)}
        onOpenLoop={handleOpenLoop}
        onAddReflection={handleAddReflection}
      />

      {/* Reflection Modal */}
      <ReflectionModal
        visible={reflectionModalVisible}
        entryTitle={selectedEntryForReflection?.title || ""}
        onClose={() => {
          setReflectionModalVisible(false);
          setSelectedEntryForReflection(null);
        }}
        onSave={handleSaveReflection}
      />
    </View>
      </Animated.View>
    </GestureDetector>
  );
}
