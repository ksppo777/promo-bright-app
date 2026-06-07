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
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 px-2 sm:px-4 md:px-0">
      
      {/* 1. 디스플레이 및 인터페이스 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-[13px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">디스플레이 및 환경설정</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {/* Dark Mode */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-orange-400" />}
                화면 테마
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">눈이 편안한 테마로 변경합니다.</p>
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="shrink-0 px-4 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {isDarkMode ? "밝은 테마" : "어두운 테마"}
            </button>
          </div>

          {/* Font Size */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Type className="w-4 h-4 text-slate-400" />
                글자 크기
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">전체 텍스트 크기를 조절합니다.</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setGlobalFontSize((s) => Math.max(10, s - 1))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                -
              </button>
              <span className="font-bold text-slate-800 dark:text-white w-10 text-center text-xs">{globalFontSize}px</span>
              <button
                onClick={() => setGlobalFontSize((s) => Math.min(24, s + 1))}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Prevent Word Wrap */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
               <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <AlignLeft className="w-4 h-4 text-indigo-400" />
                글자 짤림 방지
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">단어 중간의 줄바꿈을 방지합니다.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" className="sr-only peer" checked={preventWordWrap} onChange={(e) => setPreventWordWrap(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {/* Mobile Nav Settings */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
               <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-indigo-400" />
                모바일 상단 메뉴 표시
              </h3>
               <p className="text-xs text-slate-500 dark:text-slate-400">작은 화면에서 탭 메뉴명(텍스트)을 함께 표시합니다.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" className="sr-only peer" checked={showNavLabelsMobile} onChange={(e) => setShowNavLabelsMobile(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {/* Auto Goal Display Mode */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
             <div>
               <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-red-500" />
                자동 도전 표시 형태
              </h3>
               <p className="text-xs text-slate-500 dark:text-slate-400">진행중인 자동 도전을 어떻게 표시할지 설정합니다.</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setAutoGoalDisplayMode("multiple")}
                className={cn("flex-1 sm:flex-none px-4 py-2 font-bold text-xs rounded-lg transition-colors", autoGoalDisplayMode === "multiple" ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
              >개별 블록</button>
              <button
                onClick={() => setAutoGoalDisplayMode("single")}
                className={cn("flex-1 sm:flex-none px-4 py-2 font-bold text-xs rounded-lg transition-colors", autoGoalDisplayMode === "single" ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
              >분할 표시</button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 데이터 및 동기화 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-[13px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">데이터 & 동기화</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          
          {/* Cloud Sync */}
          <div className="px-5 py-5 flex flex-col gap-4">
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full max-w-full overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden w-full min-w-0 pr-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 truncate">구글 클라우드 동기화</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-full" style={{minWidth:0}}>모든 기기에서 데이터를 안전하게 연동합니다.</p>
                  </div>
                </div>
                {user && (
                   <button onClick={logout} className="shrink-0 p-2.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors" title="로그아웃">
                     <LogOut className="w-4 h-4" />
                   </button>
                )}
             </div>

             {!user ? (
               <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 text-center">동기화 기능을 사용하려면 클라우드 계정에 로그인하세요.</p>
                  <button className="gsi-material-button scale-95 origin-center -my-1" onClick={handleLogin}>
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents">Sign in with Google</span>
                    </div>
                  </button>
               </div>
             ) : (
               <div className="flex flex-col gap-4 mt-2">
                 <div className="flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                    <img src={user.photoURL || ""} alt="Profile" className="w-8 h-8 rounded-full shadow-sm" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{user.displayName || "Google 계정"}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</span>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                   <button onClick={handleUpload} disabled={isSyncing} className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
                     <Upload className="w-4 h-4" /> 데이터 백업
                   </button>
                   <button onClick={handleDownload} disabled={isSyncing} className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
                     <Download className="w-4 h-4" /> 불러오기
                   </button>
                 </div>
                 
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700">
                   <div className="flex flex-col gap-0.5">
                     <span className="font-bold text-slate-700 dark:text-slate-300">자동 연동 활성화 상태</span>
                     <span className="text-[11px] text-slate-500 dark:text-slate-400">인터넷 연결 시 백그라운드 자동 연동</span>
                   </div>
                   <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg text-center">{autoBackupStatus}</span>
                 </div>
                 {syncStatus && <p className="text-center font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 py-2 rounded-xl">{syncStatus}</p>}
               </div>
             )}
          </div>

          {/* Local Data Save */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-emerald-500" />
                기기에 직접 저장
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">오프라인에서도 안전하게 데이터를 저장해 둡니다.</p>
            </div>
            <button onClick={handleManualSave} className="shrink-0 w-full sm:w-auto px-5 py-2.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors shadow-sm">
              수동 저장
            </button>
          </div>
        </div>
      </div>

      {/* 3. 고급 설정 및 지원 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-[13px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">고급 및 지원</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          
          {/* Support */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-purple-500" />
                고객센터 1:1 문의
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">디스코드 채널을 통해 오류 및 의견 전송</p>
            </div>
            <button onClick={() => setShowSupportModal(true)} className="shrink-0 px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold transition-colors">
              문의하기
            </button>
          </div>

          {/* Dev Logs */}
          <div className="px-5 py-4 flex flex-col gap-4">
             <div className="flex items-center justify-between gap-4">
               <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-indigo-500" />
                    디버그 로그 모드
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">개발자 오류 분석 목적으로 작동기록을 저장합니다.</p>
               </div>
               <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={isLogMode} onChange={(e) => {
                    const val = e.target.checked;
                    setIsLogModeConfig(val);
                    setIsLogMode(val);
                    showTemporaryStatus(`로그 기록 모드가 ${val ? '켜졌' : '꺼졌'}습니다.`, 2000);
                  }} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
               </label>
             </div>
             {isLogMode && (
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button onClick={() => {
                    let proceed = true;
                    try { proceed = window.confirm('기록된 로그를 모두 삭제하시겠습니까?'); } catch(e) { proceed = true; }
                    if (proceed) { clearLogs(); showTemporaryStatus('로그가 삭제되었습니다.', 2000); }
                  }} className="px-4 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors">
                    로그 지우기
                  </button>
                  <button onClick={() => {
                    const logsStr = exportLogsStr();
                    const blob = new Blob([logsStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url;
                    a.download = `BrightStudy_Logs_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click(); URL.revokeObjectURL(url);
                  }} className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors">
                    로그 추출 (.json)
                  </button>
                </div>
             )}
          </div>

          {/* Factory Reset */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50/50 dark:bg-red-900/10">
            <div>
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">앱 데이터 초기화</h3>
              <p className="text-xs text-red-500/80 dark:text-red-400/80">기기에 보관된 앱 관련 데이터를 완전히 비웁니다.</p>
            </div>
            <button onClick={() => setShowResetModal(true)} className="shrink-0 w-full sm:w-auto px-4 py-2 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-bold transition-colors">
              초기화 설정
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6"
          >
            <div>
              <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">
                정말 삭제하겠습니까?
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                삭제된 데이터는 복구할 수 없습니다. 클라우드에 백업을 해둔
                경우 나중에 복원할 수 있습니다.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={handleFactoryReset}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                삭제하기
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
                고객센터
              </h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center break-keep">
                오류 발견 및 개선 사항 제안 등 문의사항은 아래 커뮤니티로 보내주세요.
                <br /><br />
                <a
                  href="https://discord.gg/4GHSDBDAnE"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl inline-block w-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  디스코드 채널로 이동
                </a>
              </p>
            </div>

            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm mt-2"
            >
              닫기
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
