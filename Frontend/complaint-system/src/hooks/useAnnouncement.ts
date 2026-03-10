import { getAnnouncementById, getAnnouncements, getMyAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "../services/announcement/announcement";
import type { Announcement } from "../types/general/announcement";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useAnnouncements = () => {
  try {
    const { data: announcements, isLoading, error } = useQuery<Announcement[]>({
      queryKey: ["announcements"],
      queryFn: getAnnouncements,
      refetchOnWindowFocus: false
    });

    return { announcements, isLoading, error };
  } catch (error) {
    console.error("Error in useAnnouncements hook:", error);
    throw error;
  }
};

export const useAnnouncement = (announcementId: number) => {
  try {
    const { data: announcement, isLoading, error } = useQuery<Announcement>({
      queryKey: ["announcement", announcementId],
      queryFn: () => getAnnouncementById(announcementId),
      refetchOnWindowFocus: false
    }); 

    return { announcement, isLoading, error };
  } catch (error) {
    console.error(`Error in useAnnouncement hook for id ${announcementId}:`, error);
    throw error;
  }
};

export const useMyAnnouncements = () => {
  try {
    const { data: announcements, isLoading, error, refetch } = useQuery<Announcement[]>({
      queryKey: ["my-announcements"],
      queryFn: getMyAnnouncements,
      refetchOnWindowFocus: false
    });

    return { announcements, isLoading, error, refetch };
  } catch (error) {
    console.error("Error in useMyAnnouncements hook:", error);
    throw error;
  }
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