import { getEventById, getEvents, deleteEvent, createEvent, updateEvent } from "../services/event/event";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../main";
import type { Event } from "../types/general/event";

export const useEvents = () => {
  const { data: events, isLoading, error, refetch } = useQuery<Event[]> ({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  return {
    events,
    isLoading,
    error,
    refetch,
  };
}

export const useEventById = (eventId: number) => {
  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ["event", eventId],
    queryFn: () => getEventById(eventId),
    enabled: !!eventId,
  });

  return {
    event,
    isLoading,
    error,
  };
}

export const useCreateEvent = () => {
  const mutation = useMutation({
    mutationFn: (eventData: FormData) => createEvent(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      console.error("Error creating event:", error);
    }
  });

  return mutation;
}

export const useUpdateEvent = () => {
  const mutation = useMutation({
    mutationFn: ({ eventId, eventData }: { eventId: number; eventData: FormData }) => updateEvent(eventId, eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      console.error("Error updating event:", error);
    },
  });

  return mutation;
}

export const useDeleteEvent = () => {
  const mutation = useMutation({
    mutationFn: (eventId: number) => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }
  });

  return mutation;
}