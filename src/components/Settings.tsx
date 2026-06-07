import { useState, useEffect } from "react";
import { initAuth, googleSignIn, logout, User } from "../lib/auth";
import { syncToDrive, syncFromDrive } from "../lib/driveSync";
import { getIsLogMode, setIsLogModeConfig, clearLogs, exportLogsStr } from "../lib/logger";
import {
  Cloud,
  Check,
  Download,
  Upload,
  LogOut,
  Moon,
  Sun,
  Target,
  MessageCircle,
  Type,
  AlignLeft,
} from "lucide-react";
import { clearStorage, setStorage } from "../lib/storage";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface SettingsProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onDataSync: (data: any, newTimestamp: number) => void;
  getAllData: () => any;
  autoGoalDisplayMode: "multiple" | "single";
  setAutoGoalDisplayMode: (val: "multiple" | "single") => void;
  globalFontSize: number;
  setGlobalFontSize: (val: number | ((prev: number) => number)) => void;
  preventWordWrap: boolean;
  setPreventWordWrap: (val: boolean) => void;
  showNavLabelsMobile: boolean;
  setShowNavLabelsMobile: (val: boolean) => void;
  autoBackupStatus: string;
  lastAutoBackupAt: string | null;
}

export default function Settings({
  isDarkMode,
  setIsDarkMode,
  onDataSync,
  getAllData,
  autoGoalDisplayMode,
  setAutoGoalDisplayMode,
  globalFontSize,
  setGlobalFontSize,
  preventWordWrap,
  setPreventWordWrap,
  showNavLabelsMobile,
  setShowNavLabelsMobile,
  autoBackupStatus,
  lastAutoBackupAt,
}: SettingsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isLogMode, setIsLogMode] = useState(getIsLogMode());

  const showTemporaryStatus = (message: string, duration = 4000) => {
    setSyncStatus(message);
    window.setTimeout(() => setSyncStatus(null), duration);
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (u) => setUser(u),
      () => setUser(null)
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) setUser(res.user);
    } catch (e: any) {
      console.error(e);
      try { window.alert("로그인에 실패했습니다."); } catch(err) {}
    }
  };

  const handleUpload = async () => {
    setIsSyncing(true);
    setSyncStatus("Google Drive에 백업 중...");
    try {
      const data = getAllData();
      await syncToDrive(data, Date.now());
      showTemporaryStatus("Google Drive 백업 완료!");
    } catch (e: any) {
      showTemporaryStatus(`백업 실패: ${e.message}`, 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    setIsSyncing(true);
    setSyncStatus("Google Drive에서 복원 중...");
    try {
      const res = await syncFromDrive();
      if (res && res.data) {
        onDataSync(res.data, res.timestamp);
        showTemporaryStatus("Google Drive 복원 완료!");
      } else {
        showTemporaryStatus("저장된 데이터가 없습니다.");
      }
    } catch (e: any) {
      showTemporaryStatus(`복원 실패: ${e.message}`, 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const handleFactoryReset = async () => {
    await clearStorage();
    window.location.reload();
  };

  const handleManualSave = async () => {
    const data = getAllData();
    try {
      await Promise.all(
        Object.entries(data).map(([key, value]) => setStorage(key, value))
      );
      try { window.alert("모든 데이터가 현재 기기에 안전하게 저장되었습니다!"); } catch (e) {}
    } catch (error) {
      console.error("수동 저장 실패", error);
      try { window.alert("수동 저장에 실패했습니다. 잠시 후 다시 시도해 주세요."); } catch (e) {}
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-12">
      {/* Dark Mode & Theme Settings */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-1">
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-orange-400" />
            )}
            화면 테마
          </h3>
          <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
            눈이 편안한 테마를 설정해보세요.
          </p>
        </div>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-white rounded-xl font-bold transition-colors hover:bg-blue-100 dark:hover:bg-slate-600 shrink-0"
        >
          {isDarkMode ? "밝은 테마로 변경" : "어두운 테마로 변경"}
        </button>
      </div>

      {/* Font Size Settings */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-1">
            <Type className="w-5 h-5 text-slate-500" />
            글자 크기 조절
          </h3>
          <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
            화면의 전체적인 글자 크기를 키우거나 줄입니다.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-600 shrink-0">
          <button
            onClick={() => setGlobalFontSize((s) => Math.max(10, s - 1))}
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            -
          </button>
          <span className="font-bold text-slate-800 dark:text-white w-10 text-center text-sm">
            {globalFontSize}px
          </span>
          <button
            onClick={() => setGlobalFontSize((s) => Math.min(24, s + 1))}
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Prevent Word Wrap Settings */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-1">
            <AlignLeft className="w-5 h-5 text-indigo-500" />
            글자 짤림 방지
          </h3>
          <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
            화면이 좁을 때 단어 중간에 줄바꿈이 일어나는 것을 방지합니다.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={preventWordWrap}
            onChange={(e) => setPreventWordWrap(e.target.checked)}
          />
          <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-500"></div>
          <span className="ml-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            {preventWordWrap ? "ON" : "OFF"}
          </span>
        </label>
      </div>

      {/* Mobile Nav Settings */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-indigo-500" />
            작은 화면 상단 메뉴 표시
          </h3>
          <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
            화면이 좁을 때 아이콘만 보이지 않고 메뉴명도 표시합니다. (스와이프로
            이동 가능)
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showNavLabelsMobile}
            onChange={(e) => setShowNavLabelsMobile(e.target.checked)}
          />
          <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-500"></div>
          <span className="ml-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            {showNavLabelsMobile ? "ON" : "OFF"}
          </span>
        </label>
      </div>

      {/* Auto Goal Display Mode */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-red-500" />
            자동 도전 표시 설정
          </h3>
          <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
            진행중인 자동 도전이 여러개일 때 어떤 방식으로 표시할지 설정합니다.
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setAutoGoalDisplayMode("multiple")}
            className={cn(
              "px-3 py-1.5 font-bold text-xs rounded-lg transition-colors",
              autoGoalDisplayMode === "multiple"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            개별 블록 표시
          </button>
          <button
            onClick={() => setAutoGoalDisplayMode("single")}
            className={cn(
              "px-3 py-1.5 font-bold text-xs rounded-lg transition-colors",
              autoGoalDisplayMode === "single"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            하나로 분할 표시
          </button>
        </div>
      </div>

      {/* Local Data Manual Save */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-1">
            <Check className="w-5 h-5 text-emerald-500" />
            수동 데이터 저장
          </h3>
          <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
            모든 데이터는 자동 저장되지만, 원할 때 기기에 수동으로 더 확실히
            저장할 수 있습니다.
          </p>
        </div>
        <button
          onClick={handleManualSave}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white rounded-xl font-bold transition-colors hover:bg-indigo-600 shadow-sm"
        >
          지금 수동으로 저장
        </button>
      </div>

      {/* Cloud Sync Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900 dark:text-white">
                구글 클라우드 백업/복원
              </h3>
              <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
                Google Drive의 숨겨진 폴더를 사용해 다른 기기와 안전하게 자동 동기화합니다.
              </p>
            </div>
          </div>
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">
              Google 계정으로 로그인한 뒤 안전하게 클라우드에 데이터를 동기화하세요.
            </p>
            <button className="gsi-material-button" onClick={handleLogin}>
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  Sign in with Google
                </span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-3">
                <img
                  src={user.photoURL || ""}
                  alt="Profile"
                  className="w-8 h-8 rounded-full blur-none"
                />
                <div>
                  <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleUpload}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-bold transition-colors"
              >
                <Upload className="w-4 h-4" /> 지금 수동으로 백업하기
              </button>
              <button
                onClick={handleDownload}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-sm font-bold transition-colors"
              >
                <Download className="w-4 h-4" /> 클라우드에서 가져오기
              </button>
            </div>
            
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 space-y-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                자동 동기화 상태:{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {autoBackupStatus}
                </span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                인터넷이 연결되어 있으면 백그라운드에서 Google Drive와 자동 연동합니다.
              </p>
            </div>

            {syncStatus && (
              <p className="text-center font-bold text-xs text-blue-600 dark:text-blue-400">
                {syncStatus}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Customer Support */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-purple-500" />
            고객센터
          </h3>
          <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
            앱 사용 중 궁금한 점이나 개선 사항이 있다면 문의해주세요.
          </p>
        </div>
        <button
          onClick={() => setShowSupportModal(true)}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-purple-500 text-white rounded-xl font-bold transition-colors hover:bg-purple-600 shadow-sm"
        >
          1:1 문의하기
        </button>
      </div>

      {/* Developer Logs Settings */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-2 mb-1">
              <Check className="w-5 h-5 text-indigo-500" />
              로그 기록 모드
            </h3>
            <p className="text-xs font-medium text-blue-400 dark:text-slate-400">
              오류 수정을 위해 앱의 백그라운드 작업 및 동기화 로그를 기록합니다.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isLogMode}
              onChange={(e) => {
                const val = e.target.checked;
                setIsLogModeConfig(val);
                setIsLogMode(val);
                showTemporaryStatus(`로그 기록 모드가 ${val ? '켜졌' : '꺼졌'}습니다.`, 2000);
              }}
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>

        {isLogMode && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
            <button
              onClick={() => {
                let proceed = true;
                try { proceed = window.confirm('기록된 로그를 모두 삭제하시겠습니까?'); } catch(e) { proceed = true; }
                if (proceed) {
                  clearLogs();
                  showTemporaryStatus('로그가 삭제되었습니다.', 2000);
                }
              }}
              className="flex items-center justify-center px-4 py-2 text-xs text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors"
            >
              로그 지우기
            </button>
            <button
              onClick={() => {
                const logsStr = exportLogsStr();
                const blob = new Blob([logsStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `BrightStudy_Logs_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center justify-center px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
            >
              로그 내보내기 (.json)
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone: Reset All Data */}
      <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">
            전체 초기화
          </h3>
          <p className="text-xs font-medium text-red-500/80 dark:text-red-400/80">
            기기에 저장된 모든 데이터를 영구적으로 삭제합니다.
          </p>
        </div>
        <button
          onClick={() => setShowResetModal(true)}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-xl font-bold transition-colors hover:bg-red-700 shadow-sm"
        >
          모든 데이터 삭제
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6"
          >
            <div>
              <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">
                정말 모든 데이터를 삭제하겠습니까?
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                삭제된 데이터는 복구할 수 없습니다. (단, 클라우드에 백업을 해둔
                경우 추후 다운로드로 복구 가능합니다.)
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={handleFactoryReset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                전체 초기화
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                취소
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Support Confirmation Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6"
          >
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-purple-500" />
                고객센터 1:1 문의
              </h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center break-keep">
                어플 사용시 오류 발견사항이나 개선 사항 및 기타 문의사항은
                "디스코드 채널{" "}
                <a
                  href="https://discord.gg/4GHSDBDAnE"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 hover:text-blue-600 hover:underline"
                >
                  https://discord.gg/4GHSDBDAnE
                </a>
                " 으로 문의 바랍니다.
              </p>
            </div>

            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
            >
              닫기
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
