import { getAnnouncementById, getAnnouncements, createAnnouncement } from "../services/announcement/announcement";
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

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
};