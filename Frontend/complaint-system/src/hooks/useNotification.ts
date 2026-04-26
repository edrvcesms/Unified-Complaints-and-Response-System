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
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => markNotificationAsRead(notificationId),
    onMutate: async (notificationId: number) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications']);

      queryClient.setQueryData<Notification[]>(['notifications'], (currentNotifications) =>
        (currentNotifications ?? []).map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications']);

      queryClient.setQueryData<Notification[]>(['notifications'], (currentNotifications) =>
        (currentNotifications ?? []).map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      return { previousNotifications };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
    },
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
