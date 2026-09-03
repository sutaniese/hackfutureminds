import { useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "../src/components/Screen";
import { Body, Card, ErrorText, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { useAuth } from "../src/context/AuthContext";
import { useI18n } from "../src/context/I18nContext";
import { useLearning } from "../src/context/LearningContext";
import {
  MAX_BYTES,
  MAX_DATA_CHARS,
  MAX_FILES,
  byteLabel,
  loadPortfolioFiles,
  loadPortfolioNotes,
  randomFileId,
  savePortfolioFiles,
  savePortfolioNotes,
  totalDataChars,
  uriToDataUrl,
  type StoredFileItem,
} from "../src/lib/portfolio/localFiles";
import { readJson } from "../src/lib/storage";
import type { GenerateResponse } from "../src/types/generate";
import type { OnboardingAnswers } from "../src/types/onboarding";

export default function PortfolioScreen() {
  const { t, palette } = useI18n();
  const { user } = useAuth();
  const { profile, state } = useLearning();
  const answers = readJson<OnboardingAnswers | null>("ten-onboarding-answers", null);
  const generated = readJson<GenerateResponse | null>("ten-generate-response", null);
  const [notes, setNotes] = useState(loadPortfolioNotes);
  const [files, setFiles] = useState<StoredFileItem[]>(loadPortfolioFiles);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const limits = useMemo(() => t("portfolio.limits", { b: byteLabel(MAX_BYTES), n: MAX_FILES }), [t]);

  function onNotes(value: string) {
    setNotes(value);
    savePortfolioNotes(value);
  }

  function commitFile(item: StoredFileItem) {
    setFiles((prev) => {
      if (prev.length >= MAX_FILES) {
        setError(t("portfolio.errMany", { n: MAX_FILES }));
        return prev;
      }
      if (totalDataChars(prev, item.dataUrl.length) > MAX_DATA_CHARS) {
        setError(t("portfolio.errQuota"));
        return prev;
      }
      const next = [...prev, item];
      savePortfolioFiles(next);
      return next;
    });
  }

  async function addFromUri(name: string, mime: string, size: number, uri: string, dataUrl?: string | null) {
    if (size > MAX_BYTES) {
      setError(t("portfolio.errFileBig", { name, max: byteLabel(MAX_BYTES) }));
      return;
    }
    const resolved = dataUrl?.startsWith("data:")
      ? dataUrl
      : dataUrl
        ? `data:${mime || "application/octet-stream"};base64,${dataUrl}`
        : await uriToDataUrl(uri, mime);
    if (!resolved) {
      setError(t("portfolio.errEmpty"));
      return;
    }
    if (resolved.length > 2_500_000) {
      setError(t("portfolio.errStillBig"));
      return;
    }
    commitFile({
      id: randomFileId(),
      name,
      mime: mime || "application/octet-stream",
      size,
      dataUrl: resolved,
      addedAt: Date.now(),
    });
  }

  async function pickDocuments() {
    setError(null);
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/*",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;
      for (const asset of result.assets) {
        await addFromUri(
          asset.name || "file",
          asset.mimeType || "application/octet-stream",
          asset.size ?? 0,
          asset.uri,
        );
      }
    } catch {
      setError(t("portfolio.errRead"));
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t("portfolio.errPhotos"));
      return;
    }
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: MAX_FILES,
      });
      if (result.canceled) return;
      for (const asset of result.assets) {
        const mime = asset.mimeType || "image/jpeg";
        const name = asset.fileName || `photo-${Date.now()}.jpg`;
        const size = asset.fileSize ?? Math.ceil(((asset.base64?.length ?? 0) * 3) / 4);
        await addFromUri(name, mime, size, asset.uri, asset.base64);
      }
    } catch {
      setError(t("portfolio.errRead"));
    } finally {
      setBusy(false);
    }
  }

  function removeFile(id: string) {
    setError(null);
    setFiles((prev) => {
      const next = prev.filter((item) => item.id !== id);
      savePortfolioFiles(next);
      return next;
    });
  }

  function clearAll() {
    setError(null);
    setFiles([]);
    savePortfolioFiles([]);
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("nav.portfolio")}</Kicker>
        <Title>{t("portfolio.title")}</Title>
        <Body>{t("portfolio.sub")}</Body>
        <Body>{t("portfolio.localOnly")}</Body>
        <Body>{user?.name || user?.email || "—"}</Body>
        {profile ? (
          <Body>
            {t("learn.grade", { n: profile.grade })} · {profile.goals.map((g) => t(`goal.${g}`)).join(", ")}
          </Body>
        ) : null}
        {state.diagnostic ? <Body>{t("learn.levelPill", { label: t(`level.${state.diagnostic.level}`) })}</Body> : null}
        {answers?.achievements ? <Body>{answers.achievements}</Body> : null}
        {generated?.portfolio_block ? <Body>{generated.portfolio_block}</Body> : null}
      </Card>

      <Card>
        <Title>{t("portfolio.about")}</Title>
        <TextInput
          value={notes}
          onChangeText={onNotes}
          placeholder={t("portfolio.phNotes")}
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 120,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.surface,
            color: palette.ink,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
          }}
        />
      </Card>

      <Card>
        <Title>{t("portfolio.uploads")}</Title>
        <Body>{limits}</Body>
        <PrimaryButton
          label={busy ? t("portfolio.load") : t("portfolio.choose")}
          onPress={() => void pickDocuments()}
          busy={busy}
        />
        <SecondaryButton label={t("portfolio.attachPhoto")} onPress={() => void pickPhoto()} disabled={busy} />
        <ErrorText message={error} />
      </Card>

      {files.length ? (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <Title>{t("portfolio.added")}</Title>
            <Pressable onPress={clearAll} accessibilityRole="button">
              <Text style={{ color: palette.danger, fontWeight: "700" }}>{t("portfolio.removeAll")}</Text>
            </Pressable>
          </View>
          {files.map((file) => (
            <View
              key={file.id}
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 16,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Body style={{ flex: 1 }}>{file.name}</Body>
                <Body>{byteLabel(file.size)}</Body>
              </View>
              {file.mime.startsWith("image/") && file.dataUrl ? (
                <Image
                  source={{ uri: file.dataUrl }}
                  style={{ width: "100%", height: 160, borderRadius: 12, backgroundColor: palette.accentSoft }}
                  resizeMode="contain"
                />
              ) : null}
              <SecondaryButton label={t("portfolio.removeFile", { n: file.name })} onPress={() => removeFile(file.id)} />
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
