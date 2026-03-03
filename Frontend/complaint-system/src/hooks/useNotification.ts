import { getUserNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../services/notifications/userNotification";
import type { Notification } from "../types/notifications/notification";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../main";
import { useQuery } from "@tanstack/react-query";

export const useNotifications = () => {
  const { data: notifications, isLoading, error, refetch } = useQuery<Notification[], Error>({
    queryKey: ['notifications'],
    queryFn: getUserNotifications,
    refetchOnWindowFocus: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    notifications,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}
