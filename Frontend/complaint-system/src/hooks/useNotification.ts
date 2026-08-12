import { getUserNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../services/notifications/userNotification";
import type { Notification } from "../types/notifications/notification";
import { keepPreviousData, useMutation } from "@tanstack/react-query";
import { queryClient } from "../main";
import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, PaginationQueryParams } from "../types/general/pagination";

const DEFAULT_NOTIFICATION_PARAMS: PaginationQueryParams = {
  page: 1,
  page_size: 10,
};

export const useNotifications = (params: PaginationQueryParams = DEFAULT_NOTIFICATION_PARAMS) => {
  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Notification>, Error>({
    queryKey: ['notifications', params.page, params.page_size, params.search],
    queryFn: () => getUserNotifications(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => markNotificationAsRead(notificationId),
    onMutate: async (notificationId: number) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousNotifications = queryClient.getQueryData<PaginatedResponse<Notification>>(['notifications', params.page, params.page_size, params.search]);

      queryClient.setQueryData<PaginatedResponse<Notification>>(
        ['notifications', params.page, params.page_size, params.search],
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((notification) =>
                  notification.id === notificationId ? { ...notification, is_read: true } : notification
                ),
              }
            : current
      );

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications', params.page, params.page_size], context.previousNotifications);
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

      const previousNotifications = queryClient.getQueryData<PaginatedResponse<Notification>>(['notifications', params.page, params.page_size]);

      queryClient.setQueryData<PaginatedResponse<Notification>>(
        ['notifications', params.page, params.page_size],
        (current) =>
          current
            ? { ...current, data: current.data.map((notification) => ({ ...notification, is_read: true })) }
            : current
      );

      return { previousNotifications };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications', params.page, params.page_size], context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    notifications: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}