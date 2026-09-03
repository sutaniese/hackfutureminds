import { useEffect, useState } from "react";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Chip, Field, Kicker, PrimaryButton, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { useI18n } from "../../src/context/I18nContext";
import { apiGet, apiPost } from "../../src/lib/api";

type BoardStudent = { id: string; name?: string; email?: string };

export default function AgentScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [students, setStudents] = useState<BoardStudent[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [published, setPublished] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ students?: BoardStudent[] }>("/api/class/board")
      .then((data) => {
        setStudents(data.students ?? []);
        if (data.students?.[0]) setStudentId(data.students[0].id);
      })
      .catch(() => setStudents([]));
  }, [user?.email]);

  async function send(publish = false) {
    const text = message.trim();
    if (!text) return;
    setChat((prev) => [...prev, { role: "user", text }]);
    setMessage("");
    try {
      const data = await apiPost<{ reply: string; published?: { title?: string } | null }>("/api/agent/chat", {
        studentId: studentId || undefined,
        message: text,
        publish,
      });
      setChat((prev) => [...prev, { role: "assistant", text: data.reply }]);
      if (data.published?.title) setPublished(t("agent.published", { title: data.published.title }));
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { role: "assistant", text: err instanceof Error ? err.message : t("err.generic") },
      ]);
    }
  }

  const selected = students.find((item) => item.id === studentId);

  return (
    <Screen>
      <Card>
        <Kicker>{t("agent.pageKicker")}</Kicker>
        <Title>{t("agent.pageTitle")}</Title>
        <Body>{t("agent.pageDesc")}</Body>
        {students.map((item) => (
          <Chip
            key={item.id}
            label={item.name || item.email || item.id}
            selected={studentId === item.id}
            onPress={() => setStudentId(item.id)}
          />
        ))}
        {!students.length ? <Body>{t("agent.pick")}</Body> : null}
        {selected ? <Body>{t("agent.empty", { name: selected.name || selected.email || selected.id })}</Body> : null}
        {chat.map((item, i) => (
          <Body key={`${item.role}-${i}`}>{item.role === "user" ? "→ " : "← "}{item.text}</Body>
        ))}
        {published ? <Body>{published}</Body> : null}
        <Field label={t("agent.aria")} value={message} onChangeText={setMessage} placeholder={t("agent.ph")} />
        <PrimaryButton label={t("agent.send")} onPress={() => void send(false)} />
        {user?.role === "teacher" ? (
          <PrimaryButton label={t("builder.publish")} onPress={() => void send(true)} />
        ) : null}
      </Card>
    </Screen>
  );
}
