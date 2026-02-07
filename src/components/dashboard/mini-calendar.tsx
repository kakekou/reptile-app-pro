'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

interface MonthlyEvents {
  feeding_dates: string[];
  health_dates: string[];
  shed_dates: string[];
  measurement_dates: string[];
}

interface MiniCalendarProps {
  events?: MonthlyEvents;
  onMonthChange?: (year: number, month: number) => void;
}

export function MiniCalendar({ events, onMonthChange }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPrev = () => {
    const prev = subMonths(currentMonth, 1);
    setCurrentMonth(prev);
    onMonthChange?.(prev.getFullYear(), prev.getMonth() + 1);
  };

  const goToNext = () => {
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    onMonthChange?.(next.getFullYear(), next.getMonth() + 1);
  };

  const hasEvent = (day: Date, dates: string[] | undefined) => {
    if (!dates) return false;
    return dates.some((d) => isSameDay(new Date(d), day));
  };

  return (
    <div className="rounded-[20px] bg-bg-secondary p-5 mx-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goToPrev} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-[15px] font-semibold">
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </h3>
        <button onClick={goToNext} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 曜日 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[11px] text-text-tertiary font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 日付 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const hasFeeding = hasEvent(day, events?.feeding_dates);
          const hasHealth = hasEvent(day, events?.health_dates);
          const hasShed = hasEvent(day, events?.shed_dates);
          const hasMeasure = hasEvent(day, events?.measurement_dates);

          return (
            <div key={day.toISOString()} className="flex flex-col items-center py-1">
              <span
                className={`
                  w-7 h-7 flex items-center justify-center rounded-full text-[13px]
                  ${!inMonth ? 'text-text-tertiary/30' : ''}
                  ${today ? 'bg-accent-blue text-white font-bold' : ''}
                `}
              >
                {format(day, 'd')}
              </span>
              {/* ドット表示 */}
              {inMonth && (hasFeeding || hasHealth || hasShed || hasMeasure) && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasFeeding && <span className="w-1 h-1 rounded-full bg-accent-green" />}
                  {hasHealth && <span className="w-1 h-1 rounded-full bg-accent-red" />}
                  {hasShed && <span className="w-1 h-1 rounded-full bg-accent-purple" />}
                  {hasMeasure && <span className="w-1 h-1 rounded-full bg-accent-teal" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/5">
        <Legend color="var(--accent-green)" label="給餌" />
        <Legend color="var(--accent-red)" label="体調" />
        <Legend color="var(--accent-purple)" label="脱皮" />
        <Legend color="var(--accent-teal)" label="計測" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-text-tertiary">{label}</span>
    </div>
  );
}
