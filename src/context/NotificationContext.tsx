import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info";
  timestamp: string;
  read: boolean;
}

export interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<NotificationItem, "id" | "read" | "timestamp"> & { timestamp?: string }) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem("finpilot-notifications");
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem("finpilot-notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const addNotification = (notification: Omit<NotificationItem, "id" | "read" | "timestamp"> & { timestamp?: string }) => {
    const newItem: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      timestamp: notification.timestamp || "Just now",
      read: false,
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAllAsRead,
      clearNotification,
      clearAll,
      addNotification,
    }),
    [notifications, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
