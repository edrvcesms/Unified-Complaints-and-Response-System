import { reportApi } from "../axios/apiServices";

export const generateBarangayComplaintReport = async (
  fromDate: string,
  toDate: string,
): Promise<Blob> => {
  try {
    return await reportApi.post<Blob>(
      "/barangay-complaints",
      { from_date: fromDate, to_date: toDate },
      { responseType: "blob" },
    );
  } catch (error) {
    console.error("Error generating barangay complaint report:", error);
    throw error;
  }
};
