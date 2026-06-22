import { registerPlugin } from "@capacitor/core";

export interface SystemHelperPlugin {
  bringToFront(): Promise<void>;
  checkPermissions(): Promise<{
    overlay: boolean;
    exactAlarm: boolean;
    batteryOptimization: boolean;
  }>;
  requestOverlayPermission(): Promise<void>;
  requestExactAlarmPermission(): Promise<void>;
  requestBatteryOptimizationPermission(): Promise<void>;
  acquireWakelock(): Promise<void>;
  releaseWakelock(): Promise<void>;
  vibrate(): Promise<void>;
  getLogcat(): Promise<{ logcat: string }>;
  saveLogToDownloads(options: {
    data: string;
    fileName: string;
  }): Promise<{ path: string }>;
}

export const SystemHelper = registerPlugin<SystemHelperPlugin>("SystemHelper");
