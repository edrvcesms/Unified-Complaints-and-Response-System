export interface Barangay {
  id: number
  name: string
  address: string
  contact_number: string
  email: string
}

export interface ReportPeriod {
  month: number
  year: number
  month_name: string
  period_start: string
  period_end: string
}

export interface Incident {
  incident_id: number
  incident_title: string
  complaint_count: number
  first_reported_at: string
  last_reported_at: string
}

export interface CategoryData {
  category: string
  total_incidents: number
  incidents: Incident[]
  total_complaint_count: number
}

export interface MonthlyIncidentReport {
  barangay: Barangay
  report_period: ReportPeriod
  data: CategoryData[]
}