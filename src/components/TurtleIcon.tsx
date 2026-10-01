import { Turtle, type LucideProps } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

const HORIZONTAL_OFFSET = 2;

export function TurtleIcon(props: LucideProps) {
  return (
    <View style={styles.icon} pointerEvents="none">
      <Turtle {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { transform: [{ translateX: HORIZONTAL_OFFSET }] },
});
