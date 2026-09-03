import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Chip, Field, Kicker, PrimaryButton, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { useI18n } from "../../src/context/I18nContext";
import { apiGet, apiPost } from "../../src/lib/api";
import { isSupabaseConfigured } from "../../src/lib/env";
import { SUBJECTS } from "../../src/lib/learning/catalog";
import type { Grade, Topic } from "../../src/lib/learning/types";
import { readLocalClasses, publishLocalTopic } from "../../src/lib/teacher-local";

type BoardStudent = {
  id: string;
  email?: string;
  name?: string;
  snapshot?: { mastery?: number; accuracy?: number; grade?: number; weakTopics?: string[]; subjectId?: string };
  missedTasks?: Array<{ topicId: string; taskId: string; skill: string; prompt: string }>;
};

type HeatCell = { studentId: string; failing?: boolean; accuracy?: number };
type HeatRow = { topicId: string; title: string; cells: HeatCell[] };

export default function TeachingScreen() {
  const { t, palette } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState<"progress" | "builder">("progress");
  const [students, setStudents] = useState<BoardStudent[]>([]);
  const [heatmap, setHeatmap] = useState<HeatRow[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = useState("");
  const [selected, setSelected] = useState<BoardStudent | null>(null);
  const [missed, setMissed] = useState<BoardStudent["missedTasks"]>([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("math");
  const [prompt, setPrompt] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ classes?: Array<{ id: string; name: string }>; students?: BoardStudent[]; heatmap?: HeatRow[] }>(
      "/api/class/board",
    )
      .then((data) => {
        setClasses(data.classes ?? []);
        setStudents(data.students ?? []);
        setHeatmap(data.heatmap ?? []);
        if (data.classes?.[0]) setClassId(data.classes[0].id);
      })
      .catch(() => {
        const local = readLocalClasses();
        setClasses(local);
        setStudents([]);
        setHeatmap([]);
        if (local[0]) setClassId(local[0].id);
      });
  }, [user?.email]);

  const avgMastery = students.length
    ? Math.round(students.reduce((s, item) => s + (item.snapshot?.mastery ?? 0), 0) / students.length)
    : 0;
  const avgAccuracy = students.length
    ? Math.round(students.reduce((s, item) => s + (item.snapshot?.accuracy ?? 0), 0) / students.length)
    : 0;
  const atRisk = students.filter((item) => (item.snapshot?.accuracy ?? 100) < 60).length;

  async function publish() {
    if (!title.trim()) {
      setMsg(t("builder.needTitle"));
      return;
    }
    if (!classId) {
      setMsg(t("builder.needClass"));
      return;
    }
    if (!prompt.trim() || !optA.trim() || !optB.trim()) {
      setMsg(t("builder.needTask"));
      return;
    }
    const topic: Topic = {
      id: `custom-${Date.now()}`,
      subjectId,
      title: title.trim(),
      grades: [9, 10, 11] as Grade[],
      summary: title.trim(),
      skills: [title.trim()],
      theory: [title.trim()],
      materials: [],
      custom: true,
      author: user?.email,
      tasks: [
        {
          id: `custom-task-${Date.now()}`,
          topicId: `custom-${Date.now()}`,
          type: "single",
          difficulty: 1,
          skill: title.trim(),
          prompt: prompt.trim(),
          options: [optA, optB],
          answer: 0,
          explanation: optA,
          minutes: 3,
        },
      ],
    };
    try {
      if (isSupabaseConfigured() && !classId.startsWith("local-")) {
        await apiPost("/api/learning/topics", { classId, topic });
      } else {
        publishLocalTopic(classId, topic);
      }
      setMsg(t("builder.published", { title: topic.title }));
    } catch (err) {
      publishLocalTopic(classId, topic);
      setMsg(err instanceof Error ? err.message : t("builder.publishFail"));
    }
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("learnAdmin.kicker")}</Kicker>
        <Title>{t("learnAdmin.title")}</Title>
        <Body>{t("learnAdmin.desc")}</Body>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label={t("learnAdmin.tab.progress")} selected={tab === "progress"} onPress={() => setTab("progress")} />
          <Chip label={t("learnAdmin.tab.builder")} selected={tab === "builder"} onPress={() => setTab("builder")} />
        </View>
      </Card>

      {tab === "progress" ? (
        <>
          <Card>
            <Title>{t("board.live")}</Title>
            <Body>{t("board.liveHint")}</Body>
            <Body>{t("board.avgMastery")}: {avgMastery}%</Body>
            <Body>{t("board.avgAccuracy")}: {avgAccuracy}%</Body>
            <Body>{t("board.atRisk")}: {atRisk}</Body>
            <Body>{t("board.count")}: {students.length}</Body>
          </Card>
          {!students.length ? (
            <Card>
              <Body>{t("board.empty")}</Body>
              <Body>{t("board.emptyDemo")}</Body>
            </Card>
          ) : (
            students.map((item) => (
              <Card key={item.id}>
                <Title>{item.name || item.email || item.id}</Title>
                <Body>
                  {t("board.col.mastery")} {item.snapshot?.mastery ?? 0}% · {t("board.col.accuracy")} {item.snapshot?.accuracy ?? 0}%
                </Body>
                <PrimaryButton
                  label={t("board.students")}
                  onPress={() => {
                    setSelected(item);
                    setMissed(item.missedTasks ?? []);
                  }}
                />
              </Card>
            ))
          )}
          <Card>
            <Title>{t("board.heatmap")}</Title>
            <Body>{t("board.heatmapHint")}</Body>
            {!heatmap.length ? <Body>{t("board.problemEmpty")}</Body> : null}
            {heatmap.map((row) => (
              <Pressable
                key={row.topicId}
                onPress={() => {
                  const failing = row.cells.filter((cell) => cell.failing).map((cell) => cell.studentId);
                  const related = students.filter((s) => failing.includes(s.id));
                  setMissed(related.flatMap((s) => s.missedTasks ?? []));
                }}
                style={{ paddingVertical: 8 }}
              >
                <Body>{row.title}</Body>
                <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
                  {row.cells.map((cell) => (
                    <View
                      key={cell.studentId}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        backgroundColor: cell.failing ? palette.danger : palette.secondary,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            ))}
          </Card>
          {selected ? (
            <Card>
              <Title>{selected.name || selected.email}</Title>
              <Body>{t("board.weakSkills", { list: (selected.snapshot?.weakTopics ?? []).join(", ") || "—" })}</Body>
              {!missed?.length ? <Body>{t("board.noMissedYet")}</Body> : missed.map((item) => (
                <Body key={item.taskId}>{item.prompt} · {item.skill}</Body>
              ))}
            </Card>
          ) : missed?.length ? (
            <Card>
              <Title>{t("board.missed")}</Title>
              {missed.map((item) => (
                <Body key={item.taskId}>{item.prompt}</Body>
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <Title>{t("builder.title")}</Title>
          <Body>{t("builder.hint")}</Body>
          <Field label={t("builder.topicTitle")} value={title} onChangeText={setTitle} placeholder={t("builder.titlePh")} />
          <Body>{t("builder.subject")}</Body>
          {SUBJECTS.map((item) => (
            <Chip key={item.id} label={item.title} selected={subjectId === item.id} onPress={() => setSubjectId(item.id)} />
          ))}
          <Body>{t("builder.publishTo")}</Body>
          {classes.map((item) => (
            <Chip key={item.id} label={item.name} selected={classId === item.id} onPress={() => setClassId(item.id)} />
          ))}
          <Field label={t("builder.prompt")} value={prompt} onChangeText={setPrompt} />
          <Field label={t("builder.option", { n: 1 })} value={optA} onChangeText={setOptA} />
          <Field label={t("builder.option", { n: 2 })} value={optB} onChangeText={setOptB} />
          {msg ? <Body>{msg}</Body> : null}
          <PrimaryButton label={t("builder.publish")} onPress={() => void publish()} />
        </Card>
      )}
    </Screen>
  );
}
