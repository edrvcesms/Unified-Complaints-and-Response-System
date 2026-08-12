import { useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { emergencyQueueApi } from "../../../services/axios/apiServices";

type EmergencyItem = {
  id: number | string;
  title: string;
  severityLevel: string;
  reportedAt: string | Date;
  incidentId: number;
};

type EmergencyQueueResponse = {
  emergencies?: Array<{
    id?: number | string;
    incidentId?: number;
    incident_id?: number;
    title?: string;
    severityLevel?: string;
    severity_level?: string;
    reportedAt?: string;
    reported_at?: string;
    receivedAt?: string;
    received_at?: string;
    createdAt?: string;
    created_at?: string;
  }>;
};

export const EmergencyIncidentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<EmergencyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const getPrefix = useCallback(() => {
    if (location.pathname.startsWith("/lgu")) {
      return "/lgu";
    }

    if (location.pathname.startsWith("/superadmin")) {
      return "/superadmin";
    }

    return "/dashboard";
  }, [location.pathname]);

  const prefix = getPrefix();

  const fetchActiveEmergencies = useCallback(async () => {
    try {
      setLoading(true);

      const response =
        await emergencyQueueApi.get<EmergencyQueueResponse>("/");

      console.log("Active emergencies:", response);

      const emergencies = Array.isArray(response?.emergencies)
        ? response.emergencies
        : [];

      const formattedItems: EmergencyItem[] = emergencies.map(
        (item, index) => ({
          id:
            item.id ??
            item.incidentId ??
            item.incident_id ??
            `emergency-${index}`,

          title: item.title || "Emergency",

          severityLevel:
            item.severityLevel ??
            item.severity_level ??
            "HIGH",

          reportedAt:
            item.reportedAt ??
            item.reported_at ??
            item.receivedAt ??
            item.received_at ??
            item.createdAt ??
            item.created_at ??
            new Date().toISOString(),

          incidentId:
            item.incidentId ??
            item.incident_id ??
            0,
        })
      );

      setItems(formattedItems);
    } catch (error) {
      console.error(
        "Failed to fetch active emergencies:",
        error
      );

      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveEmergencies();
  }, [fetchActiveEmergencies]);

  const handleView = async (item: EmergencyItem) => {
    try {
      await emergencyQueueApi.delete(`/${item.id}/remove`);

      // Remove immediately from the UI
      setItems((currentItems) =>
        currentItems.filter(
          (emergency) => emergency.id !== item.id
        )
      );

      navigate(`${prefix}/incidents/${item.incidentId}`);
    } catch (error) {
      console.error(
        "Failed to mark emergency as viewed:",
        error
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Emergency Incidents
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Active incidents requiring immediate attention
          </p>
        </div>

        {!loading && items.length > 0 && (
          <span className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600">
            {items.length} Active
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">
            Loading emergencies...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <span className="text-xl">✓</span>
          </div>

          <h2 className="mt-4 text-sm font-semibold text-gray-900">
            No active emergencies
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            There are currently no emergency incidents requiring attention.
          </p>
        </div>
      )}

      {/* Emergency List */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between gap-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:border-red-200 hover:shadow-md"
            >
              <div className="flex min-w-0 items-center gap-4">
                {/* Emergency Icon */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3m0 3h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                    />
                  </svg>
                </div>

                {/* Incident Information */}
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-gray-900">
                    {item.title}
                  </p>

                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-red-600">
                      {item.severityLevel}
                    </span>

                    <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300" />

                    <span className="truncate">
                      {new Date(
                        item.reportedAt
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => handleView(item)}
                className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-gray-800 active:scale-95"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};