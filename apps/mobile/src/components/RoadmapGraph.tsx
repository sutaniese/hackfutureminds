import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useI18n } from "../context/I18nContext";
import type { RoadmapNode } from "../lib/roadmap/personalRoadmap";
import { radius } from "../lib/theme";

const CONNECTOR = "M9 68 C18 18, 31 26, 43 61 S55 81, 61 28 S75 17, 78 56 S88 70, 92 31";

const TONE: Record<RoadmapNode["tone"], { fill: string; stroke: string; soft: string; text: string }> = {
  purple: { fill: "#6C63FF", stroke: "#564DE6", soft: "#6C63FF18", text: "#5B54D8" },
  green: { fill: "#43D19E", stroke: "#2FB985", soft: "#43D19E1F", text: "#0F766E" },
  red: { fill: "#FF6B6B", stroke: "#E75555", soft: "#FF6B6B1A", text: "#B91C1C" },
  slate: { fill: "#64748B", stroke: "#475569", soft: "#F1F5F9", text: "#334155" },
};

const GRAPH_H = 380;
const NODE = 52;
const NODE_ACTIVE = 62;

export function RoadmapGraph({
  nodes,
  activeId,
  onSelect,
}: {
  nodes: RoadmapNode[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const { t, palette, highContrast } = useI18n();

  return (
    <View
      accessibilityLabel={t("roadmap.aria")}
      style={[styles.wrap, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: palette.primary }]}>{t("roadmap.graph")}</Text>
        <Text style={[styles.hint, { color: palette.muted }]}>{t("roadmap.tap")}</Text>
      </View>
      <View style={styles.canvas}>
        <View pointerEvents="none" style={styles.dots} />
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path
            d={CONNECTOR}
            fill="none"
            stroke={highContrast ? palette.ink : "rgba(108,99,255,0.22)"}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          <Path
            d={CONNECTOR}
            fill="none"
            stroke={highContrast ? palette.ink : "rgba(108,99,255,0.9)"}
            strokeWidth={0.42}
            strokeDasharray="2 2"
            strokeLinecap="round"
          />
        </Svg>
        {nodes.map((node, index) => {
          const tone = TONE[node.tone];
          const isActive = node.id === activeId;
          const size = isActive ? NODE_ACTIVE : NODE;
          return (
            <Pressable
              key={node.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${node.title}: ${node.subtitle}`}
              onPress={() => onSelect(node.id)}
              style={[
                styles.node,
                {
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  backgroundColor: tone.fill,
                  borderColor: palette.surface,
                  shadowColor: isActive ? tone.fill : "#0F172A",
                },
              ]}
            >
              <Text style={styles.nodeIndex}>{index + 1}</Text>
              <Text
                numberOfLines={2}
                style={[
                  styles.nodeLabel,
                  {
                    color: palette.ink,
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    width: node.x < 18 ? 96 : node.x > 82 ? 96 : 108,
                    left: node.x < 18 ? 0 : node.x > 82 ? undefined : size / 2 - 54,
                    right: node.x > 82 ? 0 : undefined,
                  },
                ]}
              >
                {node.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function RoadmapProgressRail({ value, tone }: { value: number; tone: RoadmapNode["tone"] }) {
  const { palette } = useI18n();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.rail, { backgroundColor: palette.accentSoft }]} accessibilityLabel={`${clamped}%`}>
      <View style={[styles.railFill, { width: `${clamped}%`, backgroundColor: TONE[tone].fill }]} />
    </View>
  );
}

export function roadmapTone(tone: RoadmapNode["tone"]) {
  return TONE[tone];
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  canvas: {
    height: GRAPH_H,
    position: "relative",
    overflow: "hidden",
  },
  dots: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
    backgroundColor: "transparent",
  },
  node: {
    position: "absolute",
    zIndex: 2,
    borderRadius: 999,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  nodeIndex: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  nodeLabel: {
    position: "absolute",
    top: "100%",
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
    textAlign: "center",
    overflow: "hidden",
  },
  rail: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  railFill: {
    height: "100%",
    borderRadius: 999,
  },
});
