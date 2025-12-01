import React from "react";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { RelationshipDirectionSelector } from "../components/RelationshipDirectionSelector";
import { IntentionType } from "../types/calendar";

type Props = StackScreenProps<RootStackParamList, "RelationshipDirectionScreen">;

export function RelationshipDirectionScreen({ navigation }: Props) {
  const handleContinue = (intention: IntentionType) => {
    navigation.navigate("GuidanceScreen", { intention });
  };

  return <RelationshipDirectionSelector onContinue={handleContinue} />;
}
