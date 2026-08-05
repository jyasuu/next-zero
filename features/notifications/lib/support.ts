export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && typeof window.Notification !== "undefined"
}

export function permissionState(): NotificationPermission {
  if (!isNotificationSupported()) return "denied"
  return Notification.permission
}

export function requestPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return Promise.resolve("denied")
  return Notification.requestPermission()
}
