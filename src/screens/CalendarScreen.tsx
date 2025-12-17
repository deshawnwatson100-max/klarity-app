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
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useCalendarStore } from "../state/calendarStore";
import { INTENTIONS, EVENT_TYPES } from "../types/calendar";
import { RootStackParamList } from "../navigation/RootNavigator";
import { Header } from "../components/Header";
import { DayDetailDrawer } from "../components/DayDetailDrawer";
import { DailyClaritySummary } from "../components/DailyClaritySummaryCard";
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

  // Content area animation values (for focused chat area transition)
  // Start at 0 opacity so animation plays when screen first mounts
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);

  // iOS-native easing for content transitions
  const CONTENT_TRANSITION_DURATION = 250;
  const CONTENT_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

  const getEntriesForDate = useCalendarStore((s) => s.getEntriesForDate);
  const updateEntry = useCalendarStore((s) => s.updateEntry);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Animated style for content area
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  // Navigation helper function for runOnJS
  const navigateToInputScreen = () => {
    navigation.navigate("InputScreen");
  };

  // Animate content out before navigation
  const animateContentOutAndNavigate = () => {
    contentOpacity.value = withTiming(0, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    });
    contentTranslateY.value = withTiming(-20, {
      duration: CONTENT_TRANSITION_DURATION,
      easing: CONTENT_EASING,
    }, (finished) => {
      if (finished) {
        runOnJS(navigateToInputScreen)();
      }
    });
  };

  // Animate content in when screen gains focus
  // CalendarScreen is NEVER the initial screen, so always animate on focus
  useFocusEffect(
    React.useCallback(() => {
      // Reset to starting position then animate in
      contentOpacity.value = 0;
      contentTranslateY.value = 30;

      contentOpacity.value = withTiming(1, {
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
      });
      contentTranslateY.value = withTiming(0, {
        duration: CONTENT_TRANSITION_DURATION,
        easing: CONTENT_EASING,
      });

      return () => {};
    }, [])
  );

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

    console.log("[CalendarScreen] Date pressed:", dateStr);
    console.log("[CalendarScreen] Entries found:", entries.length);

    // Always open the drawer, even if there are no entries
    // The drawer will show the Daily Clarity Summary or empty state
    setSelectedDate(dateStr);
    setSelectedEntries(entries);
    setDrawerVisible(true);
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

  const handleViewChatLoops = () => {
    setDrawerVisible(false);
    // Navigate to ChatScreen with loops for the selected date
    navigation.navigate("ChatScreen");
    console.log("Viewing chat loops for date:", selectedDate);
  };

  // Generate mock daily clarity summary for dates with entries
  const getDailySummaryForDate = (dateStr: string): DailyClaritySummary | null => {
    const entries = getEntriesForDate(dateStr);
    if (entries.length === 0) return null;

    // Mock data - in production, this would come from actual chat loop analysis
    return {
      date: dateStr,
      navigatedItems: [
        "Handled a difficult conversation with patience",
        "Set boundaries in a professional setting",
        "Expressed feelings clearly without escalation",
      ],
      emotionalImpact: {
        summary: "The interactions today were emotionally charged but manageable. You stayed composed during challenging moments.",
        intensity: 6,
      },
      whatYouDidWell: [
        "Maintained composure during difficult moments",
        "Communicated needs effectively and respectfully",
      ],
      whatToImprove: [
        "Could have taken more time before responding in heated moments",
        "Consider setting clearer expectations upfront",
      ],
      intentionForTomorrow: "Approach conversations with more patience and clarity, taking time to breathe before responding.",
    };
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

  // Handler for navigating back with animation
  const handleNavigateBack = () => {
    animateContentOutAndNavigate();
  };

  // Swipe gesture to go back - triggers content animation, not full-screen swipe
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-50)
        .failOffsetX(50)
        .onEnd((event) => {
          // Left swipe - navigate back to InputScreen
          if (event.velocityX < -500 && event.translationX < -80) {
            runOnJS(handleNavigateBack)();
          }
        }),
    []
  );

  // Static container style (no full-screen animation - content area animates instead)
  const animatedContainerStyle = useAnimatedStyle(() => ({
    flex: 1,
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

        {/* Header - Static, not part of content animation */}
        <Header isCalendarScreen onNavigateHome={handleNavigateBack} />

        {/* Content - Animated for transitions */}
        <Animated.View style={[{ flex: 1 }, contentAnimatedStyle]}>
      {/* Calendar Title */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-semibold" style={{ color: "#F9FAFB" }}>
          Your Emotional Timeline
        </Text>
        <Text className="text-sm mt-1" style={{ color: "#9CA3AF" }}>
          Track your clarity journey
        </Text>
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
        summary={selectedDate ? getDailySummaryForDate(selectedDate) : null}
        onViewChatLoops={handleViewChatLoops}
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
    </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
