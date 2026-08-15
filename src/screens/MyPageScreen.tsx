import * as Clipboard from "expo-clipboard";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Copy,
  LogOut,
  Pencil,
  Globe,
  MessageCircle,
  Palette,
  Tags,
  Trash2,
  Turtle,
  UserRound,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { AppAlert } from "../components/AppDialog";
import { CategoryManager } from "../components/CategoryManager";
import { ColorPaletteManager } from "../components/ColorPaletteManager";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useCategoryOptions } from "../hooks/useCategoryOptions";
import { useColorPaletteOptions } from "../hooks/useColorPaletteOptions";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { renameClothingCategory } from "../storage/database";
import type { SocialAuthProvider } from "../services/socialAuth";
import type { ClothingCategory } from "../types/clothing";

type SettingsPage = "main" | "account" | "sync" | "categories" | "colors";

type MyPageScreenProps = {
  clothesCount: number;
  outfitsCount: number;
  pendingCloudCount: number;
  isCloudConfigured: boolean;
  isCloudSignedIn: boolean;
  cloudProvider: string | null;
  cloudDisplayName: string | null;
  cloudHandle: string | null;
  isCloudBusy: boolean;
  isBackupBusy: boolean;
  bottomInset: number;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onSocialSignIn: (provider: SocialAuthProvider) => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onUpdateDisplayName: (displayName: string) => Promise<void>;
  onUpdateHandle: (handle: string) => Promise<void>;
  onSyncPending: () => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onCategoriesChanged: () => Promise<void>;
};

export function MyPageScreen({
  clothesCount,
  outfitsCount,
  pendingCloudCount,
  isCloudConfigured,
  isCloudSignedIn,
  cloudProvider,
  cloudDisplayName,
  cloudHandle,
  isCloudBusy,
  isBackupBusy,
  bottomInset,
  onSignIn,
  onSignUp,
  onSocialSignIn,
  onSignOut,
  onDeleteAccount,
  onUpdateDisplayName,
  onUpdateHandle,
  onSyncPending,
  onExportBackup,
  onImportBackup,
  onCategoriesChanged,
}: MyPageScreenProps) {
  const [page, setPage] = useState<SettingsPage>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeSocialProvider, setActiveSocialProvider] =
    useState<SocialAuthProvider | null>(null);
  const [displayName, setDisplayName] = useState(cloudDisplayName ?? "");
  const [handle, setHandle] = useState(cloudHandle ?? "");
  const [isProfileEditorVisible, setIsProfileEditorVisible] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isHandleCopied, setIsHandleCopied] = useState(false);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const {
    colorOptions,
    customColorOptions,
    setColorOptionOrder,
    setCustomColorOptions,
  } = useColorPaletteOptions();
  const { categoryOptions, setCategoryOptions } = useCategoryOptions();

  useEffect(() => {
    setDisplayName(cloudDisplayName ?? "");
  }, [cloudDisplayName]);

  useEffect(() => {
    setHandle(cloudHandle ?? "");
  }, [cloudHandle]);

  useEffect(() => {
    if (!isHandleCopied) {
      return;
    }

    const timeout = setTimeout(() => setIsHandleCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [isHandleCopied]);

  useEffect(() => {
    if (page === "main") {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setPage("main");
        return true;
      }
    );

    return () => subscription.remove();
  }, [page]);

  const submitAuth = async (mode: "signIn" | "signUp") => {
    if (!email.trim() || !password) {
      AppAlert.alert("입력이 필요해북", "이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    if (mode === "signIn") {
      await onSignIn(email.trim(), password);
      return;
    }

    await onSignUp(email.trim(), password);
  };

  const submitSocialAuth = async (provider: SocialAuthProvider) => {
    setActiveSocialProvider(provider);

    try {
      await onSocialSignIn(provider);
    } finally {
      setActiveSocialProvider(null);
    }
  };

  const openProfileEditor = () => {
    setDisplayName(cloudDisplayName ?? "");
    setHandle(cloudHandle ?? "");
    setIsProfileEditorVisible(true);
  };

  const closeProfileEditor = () => {
    if (isSavingProfile) {
      return;
    }

    setDisplayName(cloudDisplayName ?? "");
    setHandle(cloudHandle ?? "");
    setIsProfileEditorVisible(false);
  };

  const saveProfile = async () => {
    const nextName = displayName.trim();
    const nextHandle = handle.trim().replace(/^@/, "").toLowerCase();

    if (!nextName) {
      AppAlert.alert("이름이 필요해북", "친구에게 표시할 이름을 입력해 주세요.");
      return;
    }

    if (nextName.length > 24) {
      AppAlert.alert("이름이 너무 길어북", "24자 이내로 입력해 주세요.");
      return;
    }

    if (!/^[a-z0-9][a-z0-9._-]{2,19}$/.test(nextHandle)) {
      AppAlert.alert(
        "ID 형식을 확인해북",
        "영문 소문자, 숫자, 점, 밑줄, 하이픈으로 3~20자를 입력해 주세요."
      );
      return;
    }

    setIsSavingProfile(true);

    try {
      if (nextHandle !== cloudHandle) {
        await onUpdateHandle(nextHandle);
      }

      if (nextName !== cloudDisplayName) {
        await onUpdateDisplayName(nextName);
      }

      setIsProfileEditorVisible(false);
      AppAlert.alert("프로필을 저장했어북", "친구에게 새 프로필이 표시돼요.");
    } catch {
      // App-level handlers already show the specific Supabase error.
    } finally {
      setIsSavingProfile(false);
    }
  };

  const copyFriendSearchId = async () => {
    if (!cloudHandle) {
      return;
    }

    try {
      await Clipboard.setStringAsync(`@${cloudHandle}`);
      setIsHandleCopied(true);
    } catch {
      AppAlert.alert("ID를 복사하지 못했어북", "잠시 후 다시 시도해 주세요.");
    }
  };

  const updateCategories = async (
    nextCategories: ClothingCategory[],
    rename?: { from: ClothingCategory; to: ClothingCategory }
  ) => {
    if (rename) {
      await renameClothingCategory(rename.from, rename.to);
    }

    try {
      await setCategoryOptions(nextCategories);
    } catch (error) {
      if (rename) {
        await renameClothingCategory(rename.to, rename.from);
      }

      throw error;
    }

    await onCategoriesChanged();
  };

  if (page === "categories" || page === "colors") {
    const isCategoryPage = page === "categories";

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.subpageHeader}>
            <Pressable
              onPress={() => setPage("main")}
              style={styles.backButton}
              accessibilityLabel="마이페이지로"
              hitSlop={8}
            >
              <ChevronLeft
                color={COLORS.textPrimary}
                size={24}
                strokeWidth={2.2}
              />
            </Pressable>
            <View style={styles.subpageTitleGroup}>
              <Text style={styles.title}>
                {isCategoryPage ? "카테고리 관리" : "색상 팔레트"}
              </Text>
              <Text style={styles.caption}>
                {isCategoryPage
                  ? "이름과 표시 순서를 관리해요"
                  : "색과 표시 순서를 관리해요"}
              </Text>
            </View>
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.subpageContent,
              { paddingBottom: bottomInset + 24 + keyboardHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            {isCategoryPage ? (
              <CategoryManager
                categories={categoryOptions}
                onChange={updateCategories}
              />
            ) : (
              <ColorPaletteManager
                colorOptions={colorOptions}
                customColorOptions={customColorOptions}
                onChange={setCustomColorOptions}
                onReorder={setColorOptionOrder}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (page === "account") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.subpageHeader}>
            <Pressable
              onPress={() => setPage("main")}
              style={styles.backButton}
              accessibilityLabel="마이페이지로"
              hitSlop={8}
            >
              <ChevronLeft
                color={COLORS.textPrimary}
                size={24}
                strokeWidth={2.2}
              />
            </Pressable>
            <View style={styles.subpageTitleGroup}>
              <Text style={styles.title}>계정</Text>
              <Text style={styles.caption}>
                내 프로필과 로그인 방식을 관리해요
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.accountContent,
              { paddingBottom: bottomInset + 24 + keyboardHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            {!isCloudConfigured ? (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>클라우드 설정 필요</Text>
                <Text style={styles.panelText}>
                  `.env`에 Supabase URL과 publishable key를 넣으면 계정을 사용할
                  수 있어요.
                </Text>
              </View>
            ) : isCloudSignedIn ? (
              <>
                <View style={styles.profileCard}>
                  <View style={styles.profileAvatar}>
                    <Turtle color={COLORS.primary} size={40} strokeWidth={2} />
                  </View>
                  <View style={styles.profileIdentity}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {cloudDisplayName || "룩부기 사용자"}
                    </Text>
                    <Text style={styles.profileHandle} numberOfLines={1}>
                      @{cloudHandle || "ID 준비 중"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={openProfileEditor}
                    style={styles.profileEditButton}
                    accessibilityLabel="프로필 수정"
                    hitSlop={8}
                  >
                    <Pencil
                      color={COLORS.primary}
                      size={19}
                      strokeWidth={2.2}
                    />
                  </Pressable>
                </View>

                <View style={styles.accountInfoGroup}>
                  <View style={styles.accountInfoRow}>
                    <Text style={styles.accountInfoLabel}>로그인 방식</Text>
                    <Text style={styles.accountInfoValue}>
                      {getCloudProviderLabel(cloudProvider)}
                    </Text>
                  </View>
                  <View style={styles.accountInfoRow}>
                    <Text style={styles.accountInfoLabel}>친구 검색 ID</Text>
                    <View style={styles.accountInfoValueGroup}>
                      <Text style={styles.accountInfoValue}>
                        @{cloudHandle || "-"}
                      </Text>
                      <Pressable
                        onPress={copyFriendSearchId}
                        disabled={!cloudHandle}
                        style={styles.copyIdButton}
                        accessibilityLabel={
                          isHandleCopied
                            ? "친구 검색 ID 복사됨"
                            : "친구 검색 ID 복사"
                        }
                        hitSlop={8}
                      >
                        {isHandleCopied ? (
                          <Check
                            color={COLORS.primary}
                            size={18}
                            strokeWidth={2.2}
                          />
                        ) : (
                          <Copy
                            color={COLORS.primary}
                            size={18}
                            strokeWidth={2.2}
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={onSignOut}
                  disabled={isCloudBusy}
                  style={[styles.secondaryButton, styles.fullWidthButton]}
                  hitSlop={8}
                >
                  {isCloudBusy ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : (
                    <>
                      <LogOut
                        color={COLORS.primary}
                        size={18}
                        strokeWidth={2.2}
                      />
                      <Text style={styles.secondaryButtonText}>로그아웃</Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.dangerZone}>
                  <Text style={styles.dangerTitle}>회원 탈퇴</Text>
                  <Text style={styles.panelText}>
                    클라우드에 저장된 옷, 코디, 친구 관계와 계정을 영구
                    삭제해요.
                  </Text>
                  <Pressable
                    onPress={() => setIsDeleteDialogVisible(true)}
                    disabled={isCloudBusy}
                    style={styles.deleteAccountButton}
                    accessibilityLabel="회원 탈퇴"
                    hitSlop={8}
                  >
                    <Trash2 color={COLORS.danger} size={18} strokeWidth={2.2} />
                    <Text style={styles.deleteAccountButtonText}>회원 탈퇴</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.stack}>
                <View style={styles.signedOutProfile}>
                  <View style={styles.profileAvatar}>
                    <Turtle color={COLORS.primary} size={40} strokeWidth={2} />
                  </View>
                  <Text style={styles.sectionTitle}>
                    룩부기 계정으로 연결해북
                  </Text>
                  <Text style={styles.panelText}>
                    친구와 옷장을 공유하고 기기 간에 데이터를 동기화할 수
                    있어요.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Google로 로그인"
                  onPress={() => submitSocialAuth("google")}
                  disabled={isCloudBusy}
                  style={[
                    styles.socialButton,
                    isCloudBusy && styles.socialButtonDisabled,
                  ]}
                >
                  {activeSocialProvider === "google" ? (
                    <ActivityIndicator color={COLORS.google} />
                  ) : (
                    <Globe color={COLORS.google} size={20} strokeWidth={2.2} />
                  )}
                  <Text style={styles.googleButtonText}>Google로 계속하기</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="카카오로 로그인"
                  onPress={() => submitSocialAuth("kakao")}
                  disabled={isCloudBusy}
                  style={[
                    styles.socialButton,
                    styles.kakaoButton,
                    isCloudBusy && styles.socialButtonDisabled,
                  ]}
                >
                  {activeSocialProvider === "kakao" ? (
                    <ActivityIndicator color={COLORS.kakaoText} />
                  ) : (
                    <MessageCircle
                      color={COLORS.kakaoText}
                      size={20}
                      strokeWidth={2.2}
                    />
                  )}
                  <Text style={styles.kakaoButtonText}>카카오로 계속하기</Text>
                </Pressable>
                {/* Apple 로그인은 iOS 배포 설정이 완료될 때 다시 활성화합니다.
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Apple로 로그인"
                  onPress={() => submitSocialAuth("apple")}
                  disabled={isCloudBusy}
                  style={[
                    styles.socialButton,
                    styles.appleButton,
                    isCloudBusy && styles.socialButtonDisabled,
                  ]}
                >
                  {activeSocialProvider === "apple" ? (
                    <ActivityIndicator color={COLORS.surface} />
                  ) : (
                    <Apple color={COLORS.surface} size={20} strokeWidth={2.2} />
                  )}
                  <Text style={styles.appleButtonText}>Apple로 계속하기</Text>
                </Pressable> */}
                <View style={styles.authDivider}>
                  <View style={styles.authDividerLine} />
                  <Text style={styles.authDividerText}>또는 이메일로 계속</Text>
                  <View style={styles.authDividerLine} />
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="이메일"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  style={styles.input}
                />
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => submitAuth("signIn")}
                    disabled={isCloudBusy}
                    style={[
                      styles.primaryButton,
                      isCloudBusy && styles.disabledButton,
                    ]}
                    hitSlop={8}
                  >
                    <Text style={styles.primaryButtonText}>로그인</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => submitAuth("signUp")}
                    disabled={isCloudBusy}
                    style={styles.secondaryButton}
                    hitSlop={8}
                  >
                    <Text style={styles.secondaryButtonText}>가입</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          <Modal
            visible={isProfileEditorVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closeProfileEditor}
          >
            <KeyboardAvoidingView
              style={styles.modalKeyboardView}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={closeProfileEditor}
              >
                <Pressable
                  style={styles.profileModal}
                  onPress={(event) => event.stopPropagation()}
                >
                  <View style={styles.modalTitleRow}>
                    <View>
                      <Text style={styles.modalTitle}>프로필 수정</Text>
                      <Text style={styles.modalCaption}>
                        친구에게 표시될 정보를 관리해요
                      </Text>
                    </View>
                    <View style={styles.modalTurtle}>
                      <Turtle
                        color={COLORS.primary}
                        size={24}
                        strokeWidth={2.2}
                      />
                    </View>
                  </View>

                  <View style={styles.nameEditor}>
                    <Text style={styles.fieldLabel}>룩부기 ID</Text>
                    <TextInput
                      value={handle}
                      onChangeText={setHandle}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={20}
                      placeholder="lookboogie_id"
                      placeholderTextColor={COLORS.textSecondary}
                      style={styles.input}
                      returnKeyType="next"
                    />
                    <Text style={styles.fieldHint}>
                      영문 소문자, 숫자, 점, 밑줄, 하이픈 · 3~20자
                    </Text>
                  </View>
                  <View style={styles.nameEditor}>
                    <Text style={styles.fieldLabel}>친구에게 보일 이름</Text>
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      maxLength={24}
                      placeholder="닉네임"
                      placeholderTextColor={COLORS.textSecondary}
                      style={styles.input}
                      returnKeyType="done"
                      onSubmitEditing={saveProfile}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={closeProfileEditor}
                      disabled={isSavingProfile}
                      style={styles.modalCancelButton}
                      hitSlop={8}
                    >
                      <Text style={styles.secondaryButtonText}>취소</Text>
                    </Pressable>
                    <Pressable
                      onPress={saveProfile}
                      disabled={isSavingProfile}
                      style={[
                        styles.modalSaveButton,
                        isSavingProfile && styles.disabledButton,
                      ]}
                      hitSlop={8}
                    >
                      {isSavingProfile ? (
                        <ActivityIndicator color={COLORS.surface} />
                      ) : (
                        <Text style={styles.primaryButtonText}>저장</Text>
                      )}
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </Modal>

          <ConfirmDialog
            visible={isDeleteDialogVisible}
            title="정말 탈퇴할까북?"
            message="클라우드의 옷, 코디, 친구 관계와 계정이 영구 삭제되며 되돌릴 수 없어요. 이 기기의 로컬 옷과 코디는 그대로 남아요."
            cancelLabel="취소"
            confirmLabel="탈퇴하기"
            destructive
            onCancel={() => setIsDeleteDialogVisible(false)}
            onConfirm={() => {
              setIsDeleteDialogVisible(false);
              void onDeleteAccount();
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (page === "sync") {
    const syncCaption = !isCloudConfigured
      ? "클라우드 설정이 필요해요"
      : !isCloudSignedIn
      ? "계정 로그인이 필요해요"
      : pendingCloudCount > 0
      ? `${pendingCloudCount}개 항목이 동기화를 기다려요`
      : "모든 항목이 동기화됐어요";

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.subpageHeader}>
          <Pressable
            onPress={() => setPage("main")}
            style={styles.backButton}
            accessibilityLabel="마이페이지로"
            hitSlop={8}
          >
            <ChevronLeft
              color={COLORS.textPrimary}
              size={24}
              strokeWidth={2.2}
            />
          </Pressable>
          <View style={styles.subpageTitleGroup}>
            <Text style={styles.title}>룩부기 동기화</Text>
            <Text style={styles.caption}>클라우드와 로컬 백업을 관리해요</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.subpageContent,
            styles.syncContent,
            { paddingBottom: bottomInset + 24 },
          ]}
        >
          <View style={styles.syncStatus}>
            <View style={styles.syncIcon}>
              <Cloud color={COLORS.primary} size={28} strokeWidth={2} />
            </View>
            <View style={styles.syncStatusText}>
              <Text style={styles.sectionTitle}>클라우드 동기화</Text>
              <Text style={styles.panelText}>{syncCaption}</Text>
            </View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>
                대기 {pendingCloudCount}
              </Text>
            </View>
          </View>

          {!isCloudConfigured ? (
            <View style={styles.panel}>
              <Text style={styles.panelText}>
                `.env`에 Supabase URL과 publishable key를 설정해 주세요.
              </Text>
            </View>
          ) : !isCloudSignedIn ? (
            <Pressable
              onPress={() => setPage("account")}
              style={[styles.primaryButton, styles.fullWidthButton]}
              hitSlop={8}
            >
              <UserRound color={COLORS.surface} size={18} strokeWidth={2.2} />
              <Text style={styles.primaryButtonText}>계정에서 로그인</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onSyncPending}
              disabled={isCloudBusy || pendingCloudCount === 0}
              style={[
                styles.primaryButton,
                styles.fullWidthButton,
                (isCloudBusy || pendingCloudCount === 0) &&
                  styles.disabledButton,
              ]}
              hitSlop={8}
            >
              {isCloudBusy ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <>
                  <Cloud color={COLORS.surface} size={18} strokeWidth={2.2} />
                  <Text style={styles.primaryButtonText}>대기 항목 동기화</Text>
                </>
              )}
            </Pressable>
          )}

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>로컬 백업</Text>
            <Text style={styles.panelText}>
              옷과 코디의 텍스트 데이터를 JSON 파일로 내보내거나 가져와요.
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={onExportBackup}
                disabled={isBackupBusy}
                style={[
                  styles.primaryButton,
                  isBackupBusy && styles.disabledButton,
                ]}
                hitSlop={8}
              >
                <Text style={styles.primaryButtonText}>내보내기</Text>
              </Pressable>
              <Pressable
                onPress={onImportBackup}
                disabled={isBackupBusy}
                style={styles.secondaryButton}
                hitSlop={8}
              >
                <Text style={styles.secondaryButtonText}>가져오기</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: bottomInset + 24 + keyboardHeight },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.header}>
            <Text style={styles.title}>마이페이지</Text>
            <Text style={styles.caption}>내 옷장과 계정 설정</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{clothesCount}</Text>
              <Text style={styles.statLabel}>등록한 옷</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{outfitsCount}</Text>
              <Text style={styles.statLabel}>저장한 코디</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>룩부기 설정</Text>
            <SettingsRow
              title="계정"
              caption={
                isCloudSignedIn
                  ? getCloudProviderLabel(cloudProvider)
                  : "로그인과 프로필을 관리해요"
              }
              Icon={UserRound}
              onPress={() => setPage("account")}
            />
            <SettingsRow
              title="룩부기 동기화"
              caption={
                pendingCloudCount > 0
                  ? `대기 중인 항목 ${pendingCloudCount}개`
                  : "클라우드와 로컬 백업을 관리해요"
              }
              Icon={Cloud}
              onPress={() => setPage("sync")}
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>개인 설정</Text>
            <SettingsRow
              title="카테고리 관리"
              caption={`${categoryOptions.length}개 · 이름 및 순서`}
              Icon={Tags}
              onPress={() => setPage("categories")}
            />
            <SettingsRow
              title="색상 팔레트"
              caption={`${colorOptions.length}개 · 색상 및 순서`}
              Icon={Palette}
              onPress={() => setPage("colors")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getCloudProviderLabel(provider: string | null) {
  switch (provider) {
    case "google":
      return "Google로 로그인";
    case "kakao":
      return "카카오로 로그인";
    case "apple":
      return "Apple로 로그인";
    case "email":
      return "이메일로 로그인";
    default:
      return "클라우드 계정으로 로그인";
  }
}

type SettingsRowProps = {
  title: string;
  caption: string;
  Icon: typeof Tags;
  onPress: () => void;
};

function SettingsRow({ title, caption, Icon, onPress }: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.settingsRow} hitSlop={8}>
      <View style={styles.settingsIcon}>
        <Icon color={COLORS.primary} size={20} strokeWidth={2.2} />
      </View>
      <View style={styles.settingsTextGroup}>
        <Text style={styles.settingsTitle}>{title}</Text>
        <Text style={styles.settingsCaption}>{caption}</Text>
      </View>
      <ChevronRight color={COLORS.textSecondary} size={20} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, gap: 16 },
  header: { paddingTop: 16 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary },
  caption: { marginTop: 4, fontSize: 12, color: COLORS.textSecondary },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: COLORS.primary },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  panel: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: COLORS.textPrimary },
  pendingBadge: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  panelText: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
  stack: { gap: 8 },
  socialButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  kakaoButton: { borderColor: COLORS.kakao, backgroundColor: COLORS.kakao },
  appleButton: { borderColor: COLORS.apple, backgroundColor: COLORS.apple },
  socialButtonDisabled: { opacity: 0.55 },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  kakaoButtonText: { fontSize: 14, fontWeight: "700", color: COLORS.kakaoText },
  appleButtonText: { fontSize: 14, fontWeight: "700", color: COLORS.surface },
  authDivider: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  authDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  authDividerText: { fontSize: 12, color: COLORS.textSecondary },
  nameEditor: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  fieldHint: { fontSize: 11, lineHeight: 16, color: COLORS.textSecondary },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  actions: { flexDirection: "row", gap: 8 },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "700", color: COLORS.surface },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  disabledButton: { backgroundColor: COLORS.primaryLight },
  fullWidthButton: { flex: 0, width: "100%" },
  settingsRow: {
    minHeight: 64,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  settingsTextGroup: { flex: 1 },
  settingsTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  settingsCaption: { marginTop: 2, fontSize: 12, color: COLORS.textSecondary },
  subpageHeader: {
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  subpageTitleGroup: { flex: 1 },
  subpageContent: { paddingHorizontal: 16, paddingTop: 8 },
  accountContent: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  profileCard: {
    minHeight: 104,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  profileIdentity: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  profileHandle: { marginTop: 4, fontSize: 13, color: COLORS.textSecondary },
  profileEditButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  accountInfoGroup: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  accountInfoRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  accountInfoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  accountInfoValueGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  accountInfoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    color: COLORS.textPrimary,
    marginRight: 4,
  },
  copyIdButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  signedOutProfile: { alignItems: "center", paddingVertical: 16, gap: 8 },
  dangerZone: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  dangerTitle: { fontSize: 14, fontWeight: "700", color: COLORS.danger },
  deleteAccountButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    gap: 8,
  },
  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.danger,
  },
  modalKeyboardView: { flex: 1 },
  modalOverlay: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.overlay,
  },
  profileModal: {
    width: "100%",
    maxWidth: 440,
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    gap: 16,
  },
  modalTitleRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  modalCaption: { marginTop: 4, fontSize: 12, color: COLORS.textSecondary },
  modalTurtle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  modalActions: { flexDirection: "row", gap: 8 },
  modalCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  modalSaveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  syncContent: { gap: 12 },
  syncStatus: {
    minHeight: 88,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  syncIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  syncStatusText: { flex: 1 },
});
