package com.brightstudy.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import java.util.Timer;
import java.util.TimerTask;

public class SystemHelperService extends Service {
    private static final String CHANNEL_ID = "TimerForegroundServiceChannel";
    private String currentTitle = "Bright Study";
    private NotificationManager manager;
    private long endTimeMillis = 0;
    private Timer timer;

    @Override
    public void onCreate() {
        super.onCreate();
        manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createNotificationChannel();
        if (Build.VERSION.SDK_INT >= 34) { // Build.VERSION_CODES.UPSIDE_DOWN_CAKE
            startForeground(1, createNotification(""), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(1, createNotification(""));
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if ("START".equals(action)) {
                currentTitle = intent.getStringExtra("title");
                if (currentTitle == null) currentTitle = "Bright Study";
                String text = intent.getStringExtra("text");
                if (text == null) text = "";
                
                endTimeMillis = intent.getLongExtra("endTime", 0);
                
                if (Build.VERSION.SDK_INT >= 34) {
                    startForeground(1, createNotification(text), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
                } else {
                    startForeground(1, createNotification(text));
                }
                
                if (endTimeMillis > 0) {
                    setEndAlarm(endTimeMillis);
                    startNativeTimer();
                }

            } else if ("UPDATE".equals(action)) {
                String text = intent.getStringExtra("text");
                if (text == null) text = "";
                
                long newEndTime = intent.getLongExtra("endTime", 0);
                if(newEndTime > 0) {
                    endTimeMillis = newEndTime;
                    setEndAlarm(endTimeMillis);
                    startNativeTimer();
                    manager.notify(1, createNotification(text));
                } else if(endTimeMillis == 0) {
                    manager.notify(1, createNotification(text));
                }
                
            } else if ("TIMER_END".equals(action)) {
                endTimeMillis = 0;
                cancelEndAlarm();
                stopNativeTimer();
                manager.notify(1, createNotification("종료됨"));
                
            } else if ("STOP".equals(action)) {
                cancelEndAlarm();
                stopNativeTimer();
                stopForeground(true);
                stopSelfResult(startId);
            }
        }
        return START_NOT_STICKY;
    }

    private void startNativeTimer() {
        stopNativeTimer();
        timer = new Timer();
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                if (endTimeMillis == 0) {
                    stopNativeTimer();
                    return;
                }
                long remainingMillis = endTimeMillis - System.currentTimeMillis();
                if (remainingMillis <= 0) {
                    manager.notify(1, createNotification("종료"));
                    stopNativeTimer();
                } else {
                    int remainingSecs = (int) (remainingMillis / 1000);
                    int h = remainingSecs / 3600;
                    int m = (remainingSecs % 3600) / 60;
                    int s = remainingSecs % 60;
                    String timeStr;
                    if (h > 0) {
                        timeStr = String.format("%d시간 %02d분 %02d초 남음", h, m, s);
                    } else {
                        timeStr = String.format("%02d분 %02d초 남음", m, s);
                    }
                    manager.notify(1, createNotification(timeStr));
                }
            }
        }, 0, 1000);
    }

    private void stopNativeTimer() {
        if (timer != null) {
            timer.cancel();
            timer = null;
        }
    }

    private void setEndAlarm(long timeInMillis) {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(this, SystemHelperService.class);
        intent.setAction("TIMER_END");
        PendingIntent pi = PendingIntent.getService(this, 100, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        if (alarmManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis, pi);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, timeInMillis, pi);
            }
        }
    }

    private void cancelEndAlarm() {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(this, SystemHelperService.class);
        intent.setAction("TIMER_END");
        PendingIntent pi = PendingIntent.getService(this, 100, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (alarmManager != null) {
            alarmManager.cancel(pi);
        }
    }

    private Notification createNotification(String text) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this,
                0, notificationIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(currentTitle)
                .setSmallIcon(R.mipmap.ic_launcher) // 앱 아이콘 사용
                .setContentIntent(pendingIntent)
                .setOnlyAlertOnce(true)
                .setOngoing(true)
                .setSilent(true)      // 타이머 업데이트마다 소리나지 않도록
                .setContentText(text);

        return builder.build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        cancelEndAlarm();
        stopNativeTimer();
        stopForeground(true);
        stopSelf();
    }
    
    @Override
    public void onDestroy() {
        cancelEndAlarm();
        stopNativeTimer();
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Timer Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setSound(null, null);
            serviceChannel.enableVibration(false);
            manager.createNotificationChannel(serviceChannel);
        }
    }
}