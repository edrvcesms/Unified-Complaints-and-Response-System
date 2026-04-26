import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CustomDateTimePicker = ({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
}) => {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(value ?? new Date());
  const [time, setTime] = useState({ hour: "09", minute: "00", period: "AM" });

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate)),
    end: endOfWeek(endOfMonth(viewDate)),
  });

  const today = startOfDay(new Date());

  const handleDayClick = (day: Date) => {
    if (isBefore(day, today)) return;
    const h = time.period === "PM" && time.hour !== "12"
      ? String(+time.hour + 12)
      : time.period === "AM" && time.hour === "12"
        ? "00"
        : time.hour;
    const next = new Date(day);
    next.setHours(+h, +time.minute, 0, 0);
    onChange(next);
  };

  const handleTimeChange = (field: "hour" | "minute" | "period", val: string) => {
    const next = { ...time, [field]: val };
    setTime(next);
    if (value) {
      const h = next.period === "PM" && next.hour !== "12"
        ? String(+next.hour + 12)
        : next.period === "AM" && next.hour === "12"
          ? "00"
          : next.hour;
      const updated = new Date(value);
      updated.setHours(+h, +next.minute, 0, 0);
      onChange(updated);
    }
  };

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-700 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-800">
          {format(viewDate, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-700 transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const isPast = isBefore(day, today);
          const isSelected = value ? isSameDay(day, value) : false;
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isTodayDay = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isPast}
              className={`
                relative mx-auto flex items-center justify-center w-8 h-8 rounded-full text-sm transition-colors
                ${!isCurrentMonth ? "text-gray-300" : ""}
                ${isPast ? "text-gray-300 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected
                  ? "bg-primary-600 text-white font-medium"
                  : isTodayDay && !isSelected
                    ? "border border-primary-400 text-primary-700 font-medium hover:bg-primary-50"
                    : !isPast && isCurrentMonth
                      ? "text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                      : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 my-4" />

      {/* Time picker */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary-700">{t('events.form.date')}</span>
        <div className="flex items-center gap-1 ml-2">
          {/* Hour */}
          <select
            value={time.hour}
            onChange={(e) => handleTimeChange("hour", e.target.value)}
            className="w-14 text-center text-sm text-gray-800 bg-primary-50 border-0 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="text-gray-400 font-medium">:</span>
          {/* Minute */}
          <select
            value={time.minute}
            onChange={(e) => handleTimeChange("minute", e.target.value)}
            className="w-14 text-center text-sm text-gray-800 bg-primary-50 border-0 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
          >
            {["00", "15", "30", "45"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {/* AM/PM */}
          <div className="flex rounded-lg overflow-hidden border border-primary-200 ml-1">
            {["AM", "PM"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleTimeChange("period", p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  time.period === p
                    ? "bg-primary-600 text-white"
                    : "text-gray-500 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}