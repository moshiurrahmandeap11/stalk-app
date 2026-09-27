const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const CHAT_HEAD_MODULE_KT = `package com.stalk.app.chathead

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ChatHeadModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ChatHeadModule"

    @ReactMethod
    fun showBubble(conversationId: String, title: String, unreadCount: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
            return
        }
        val intent = Intent(reactContext, ChatHeadService::class.java).apply {
            action = ChatHeadService.ACTION_SHOW
            putExtra("conversationId", conversationId)
            putExtra("title", title)
            putExtra("unreadCount", unreadCount)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun hideBubble() {
        val intent = Intent(reactContext, ChatHeadService::class.java).apply {
            action = ChatHeadService.ACTION_HIDE
        }
        reactContext.startService(intent)
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + reactContext.packageName)
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
        }
    }
}
`;

const CHAT_HEAD_SERVICE_KT = `package com.stalk.app.chathead

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import kotlin.math.abs

class ChatHeadService : Service() {

    companion object {
        const val ACTION_SHOW = "ACTION_SHOW"
        const val ACTION_HIDE = "ACTION_HIDE"
        private const val CHANNEL_ID = "stalk_chathead_channel"
        private const val NOTIFICATION_ID = 9981
    }

    private var windowManager: WindowManager? = null
    private var chatHeadView: FrameLayout? = null
    private var params: WindowManager.LayoutParams? = null

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var currentConversationId: String = ""

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                val conversationId = intent.getStringExtra("conversationId") ?: ""
                val title = intent.getStringExtra("title") ?: "Chat"
                val unreadCount = intent.getIntExtra("unreadCount", 0)
                currentConversationId = conversationId
                showOrUpdateBubble(title, unreadCount)
            }
            ACTION_HIDE -> {
                removeBubble()
                stopForeground(true)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun showOrUpdateBubble(title: String, unreadCount: Int) {
        if (chatHeadView == null) {
            val sizePx = dpToPx(60)
            val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            params = WindowManager.LayoutParams(
                sizePx,
                sizePx,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 20
                y = 200
            }

            // Create circular bubble layout
            chatHeadView = FrameLayout(this).apply {
                val bg = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor("#0084FF"))
                    setStroke(dpToPx(2), Color.WHITE)
                }
                background = bg
                elevation = dpToPx(6).toFloat()

                // Initials Text
                val textView = TextView(context).apply {
                    text = title.take(1).uppercase()
                    setTextColor(Color.WHITE)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
                    gravity = Gravity.CENTER
                }
                addView(
                    textView,
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        Gravity.CENTER
                    )
                )

                // Unread Badge if > 0
                if (unreadCount > 0) {
                    val badgeSize = dpToPx(20)
                    val badgeView = TextView(context).apply {
                        text = if (unreadCount > 9) "9+" else unreadCount.toString()
                        setTextColor(Color.WHITE)
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
                        gravity = Gravity.CENTER
                        val badgeBg = GradientDrawable().apply {
                            shape = GradientDrawable.OVAL
                            setColor(Color.RED)
                            setStroke(dpToPx(1), Color.BLACK)
                        }
                        background = badgeBg
                    }
                    val badgeParams = FrameLayout.LayoutParams(badgeSize, badgeSize).apply {
                        gravity = Gravity.TOP or Gravity.END
                    }
                    addView(badgeView, badgeParams)
                }

                // Touch & Drag Listener
                setOnTouchListener(object : View.OnTouchListener {
                    override fun onTouch(v: View, event: MotionEvent): Boolean {
                        val p = params ?: return false
                        when (event.action) {
                            MotionEvent.ACTION_DOWN -> {
                                initialX = p.x
                                initialY = p.y
                                initialTouchX = event.rawX
                                initialTouchY = event.rawY
                                return true
                            }
                            MotionEvent.ACTION_MOVE -> {
                                p.x = initialX + (event.rawX - initialTouchX).toInt()
                                p.y = initialY + (event.rawY - initialTouchY).toInt()
                                windowManager?.updateViewLayout(chatHeadView, p)
                                return true
                            }
                            MotionEvent.ACTION_UP -> {
                                val diffX = abs(event.rawX - initialTouchX)
                                val diffY = abs(event.rawY - initialTouchY)
                                // If movement was minimal, consider it a tap -> open app
                                if (diffX < 15 && diffY < 15) {
                                    openApp()
                                } else {
                                    // Snap to nearest edge (left or right)
                                    val displayMetrics = resources.displayMetrics
                                    val screenWidth = displayMetrics.widthPixels
                                    p.x = if (p.x + sizePx / 2 < screenWidth / 2) 10 else screenWidth - sizePx - 10
                                    windowManager?.updateViewLayout(chatHeadView, p)
                                }
                                return true
                            }
                        }
                        return false
                    }
                })
            }

            try {
                windowManager?.addView(chatHeadView, params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun openApp() {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("conversationId", currentConversationId)
            putExtra("openChatHead", true)
        }
        if (launchIntent != null) {
            startActivity(launchIntent)
            removeBubble()
            stopForeground(true)
            stopSelf()
        }
    }

    private fun removeBubble() {
        if (chatHeadView != null) {
            try {
                windowManager?.removeView(chatHeadView)
            } catch (e: Exception) {
                // Ignore
            }
            chatHeadView = null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Stalk Chat Head Service",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "Keeps Stalk floating chat head active"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Stalk Chat Head")
            .setContentText("Chat head is active over other apps")
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    override fun onDestroy() {
        removeBubble()
        super.onDestroy()
    }
}
`;

const CHAT_HEAD_PACKAGE_KT = `package com.stalk.app.chathead

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ChatHeadPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ChatHeadModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

module.exports = function withChatHead(config) {
  // 1. AndroidManifest updates (Permission + Service registration)
  config = withAndroidManifest(config, (modConfig) => {
    const mainApplication = modConfig.modResults.manifest.application?.[0];
    if (mainApplication) {
      if (!mainApplication.service) {
        mainApplication.service = [];
      }
      const hasService = mainApplication.service.some(
        (s) => s.$?.["android:name"] === "com.stalk.app.chathead.ChatHeadService"
      );
      if (!hasService) {
        mainApplication.service.push({
          $: {
            "android:name": "com.stalk.app.chathead.ChatHeadService",
            "android:enabled": "true",
            "android:exported": "false",
          },
        });
      }
    }
    return modConfig;
  });

  // 2. DangerousMod: Write Kotlin files into android/app/src/main/java/com/stalk/app/chathead/
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const targetDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "stalk",
        "app",
        "chathead"
      );

      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, "ChatHeadModule.kt"), CHAT_HEAD_MODULE_KT, "utf8");
      fs.writeFileSync(path.join(targetDir, "ChatHeadService.kt"), CHAT_HEAD_SERVICE_KT, "utf8");
      fs.writeFileSync(path.join(targetDir, "ChatHeadPackage.kt"), CHAT_HEAD_PACKAGE_KT, "utf8");

      return modConfig;
    },
  ]);

  // 3. Register ChatHeadPackage in MainApplication
  config = withMainApplication(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (!contents.includes("import com.stalk.app.chathead.ChatHeadPackage")) {
      contents = "import com.stalk.app.chathead.ChatHeadPackage\n" + contents;
    }
    if (!contents.includes("add(ChatHeadPackage())") && !contents.includes("packages.add(ChatHeadPackage())")) {
      contents = contents.replace(
        /PackageList\(this\)\.getPackages\(\)\.apply\s*\{/,
        "PackageList(this).getPackages().apply {\n              add(ChatHeadPackage())"
      );
    }
    modConfig.modResults.contents = contents;
    return modConfig;
  });

  return config;
};
