import {
  getAnnouncementById,
  getAnnouncements,
  getMyAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../services/announcement/announcement";

import type { Announcement } from "../types/general/announcement";
import type { PaginatedResponse, PaginationQueryParams } from "../types/general/pagination";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

export const useAnnouncements = (params: PaginationQueryParams = {}) => {
 

  const { data, isLoading, isFetching, error } = useQuery<PaginatedResponse<Announcement>>({
    queryKey: ["announcements", params.page, params.page_size, params.search],
    queryFn: () => getAnnouncements(params),
    placeholderData: keepPreviousData, // keeps old page visible while next page loads
    refetchOnWindowFocus: false,
  });

  return {
    announcements: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    isFetching,
    error,
  };
};

export const useAnnouncement = (announcementId: number) => {
  const { data: announcement, isLoading, error } = useQuery<Announcement>({
    queryKey: ["announcement", announcementId],
    queryFn: () => getAnnouncementById(announcementId),
    refetchOnWindowFocus: false,
  });

  return { announcement, isLoading, error };
};

export const useMyAnnouncements = (params: PaginationQueryParams) => {

  const { data, isLoading, isFetching, error, refetch } = useQuery<PaginatedResponse<Announcement>>({
    queryKey: ["my-announcements", params.page, params.page_size, params.search],
    queryFn: () => getMyAnnouncements(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  return {
    announcements: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    isFetching,
    error,
    refetch,
  };
};

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["my-announcements"] });
    },
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, formData }: { announcementId: number; formData: FormData }) =>
      updateAnnouncement(announcementId, formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["my-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement", variables.announcementId] });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["my-announcements"] });
    },
  });
};