package com.brightstudy.app; // 실제 패키지명 기입

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemHelper")
public class SystemHelperPlugin extends Plugin {

    @PluginMethod
    public void startForegroundService(PluginCall call) {
        String title = call.getString("title", "Bright Study");
        String text = call.getString("text", "타이머 진행중...");
        Double endTimeDouble = call.getDouble("endTime");
        String endTimeStr = call.getString("endTimeStr");

        Intent intent = new Intent(getContext(), SystemHelperService.class);
        intent.putExtra("title", title);
        intent.putExtra("text", text);
        
        long parsedEndTime = 0;
        if (endTimeStr != null) {
            try {
                parsedEndTime = Long.parseLong(endTimeStr);
            } catch (Exception e) {}
        } else if (endTimeDouble != null) {
            parsedEndTime = endTimeDouble.longValue();
        }
        
        if (parsedEndTime > 0) {
            intent.putExtra("endTime", parsedEndTime);
        }
        
        intent.setAction("START");
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void updateForegroundService(PluginCall call) {
        String text = call.getString("text", "");
        Double endTimeDouble = call.getDouble("endTime");
        
        Intent intent = new Intent(getContext(), SystemHelperService.class);
        intent.putExtra("text", text);
        if (endTimeDouble != null) {
            intent.putExtra("endTime", endTimeDouble.longValue());
        }
        intent.setAction("UPDATE");
        
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void stopForegroundService(PluginCall call) {
        Intent intent = new Intent(getContext(), SystemHelperService.class);
        intent.setAction("STOP");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void bringToFront(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, getActivity().getClass());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(intent);
        call.resolve();
    }

    private android.os.PowerManager.WakeLock wakeLock;

    @PluginMethod
    public void acquireWakelock(PluginCall call) {
        if (wakeLock == null) {
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            wakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "BrightStudy:TimerWakelock");
        }
        if (!wakeLock.isHeld()) {
            wakeLock.acquire();
        }
        call.resolve();
    }

    @PluginMethod
    public void releaseWakelock(PluginCall call) {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        call.resolve();
    }

    @PluginMethod
    public void vibrate(PluginCall call) {
        android.media.AudioManager audioManager = (android.media.AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null && audioManager.getRingerMode() == android.media.AudioManager.RINGER_MODE_SILENT) {
            // 무음 모드인 경우 진동하지 않음 (사용자 의도 존중)
            call.resolve();
            return;
        }

        long[] pattern = {0, 500, 200, 500, 200, 500};
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            android.os.VibratorManager vibratorManager = (android.os.VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            android.os.Vibrator vibrator = vibratorManager.getDefaultVibrator();
            if (vibrator != null) {
                vibrator.vibrate(android.os.VibrationEffect.createWaveform(pattern, -1));
            }
        } else {
            android.os.Vibrator vibrator = (android.os.Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(android.os.VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        }
        call.resolve();
    }

    // --- 새롭게 추가되는 권한 확인 로직 ---

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        boolean overlay = true;
        boolean exactAlarm = true;
        boolean batteryOptimization = true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            overlay = Settings.canDrawOverlays(getContext());
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            batteryOptimization = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                exactAlarm = alarmManager.canScheduleExactAlarms();
            }
        }
        ret.put("overlay", overlay);
        ret.put("exactAlarm", exactAlarm);
        ret.put("batteryOptimization", batteryOptimization);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void requestBatteryOptimizationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (!pm.isIgnoringBatteryOptimizations(getContext().getPackageName())) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    getContext().startActivity(intent);
                } catch (Exception e) {
                    Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(fallback);
                }
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void getLogcat(PluginCall call) {
        try {
            Process process = Runtime.getRuntime().exec("logcat -d -v time");
            java.io.BufferedReader bufferedReader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()));
            StringBuilder log = new StringBuilder();
            String line;
            while ((line = bufferedReader.readLine()) != null) {
                log.append(line).append("\n");
            }
            JSObject ret = new JSObject();
            ret.put("logcat", log.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Cannot get logcat", e);
        }
    }

    @PluginMethod
    public void saveLogToDownloads(PluginCall call) {
        try {
            String logData = call.getString("data");
            String fileName = call.getString("fileName");
            if (logData == null || fileName == null) {
                call.reject("Missing data or fileName");
                return;
            }
            
            java.io.File downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs();
            }
            
            java.io.File file = new java.io.File(downloadsDir, fileName);
            java.io.FileOutputStream fos = new java.io.FileOutputStream(file);
            fos.write(logData.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            fos.close();
            
            JSObject ret = new JSObject();
            ret.put("path", file.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Cannot save to Downloads", e);
        }
    }
}