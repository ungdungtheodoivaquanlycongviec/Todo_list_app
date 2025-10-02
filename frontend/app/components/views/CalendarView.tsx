"use client"

import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface CalendarEvent {
  id: number;
  title: string;
  project: string;
  date: string;
  time: string;
  status: string;
}

interface WaitingListItem {
  id: number;
  title: string;
  time: string | null;
  type: string;
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 9, 1)); // October 2023
  const [searchQuery, setSearchQuery] = useState('');
  
  // TODO: Replace with API calls
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: 1,
      title: "Sóc lọ",
      project: "gym",
      date: "2023-10-02",
      time: "24h",
      status: "Exp. yesterday"
    }
  ]);

  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([
    { id: 1, title: "📱 Install updates on PC and smartphone", time: "0:30h", type: "tech" },
    { id: 2, title: "💪 Sign up for the gym", time: null, type: "health" },
    { id: 3, title: "🔔 Check your health", time: null, type: "health" },
    { id: 4, title: "🔧 Clean your house", time: "2h", type: "home" },
    { id: 5, title: "💰 Get personal finances in order", time: "1:30h", type: "finance" },
  ]);

  // Hàm chuyển tháng
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Hàm về tháng hiện tại
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Lấy thông tin tháng và năm
  const getMonthYearString = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Lấy các ngày trong tháng để hiển thị (chỉ hiển thị một số ngày như trong hình)
  const getDisplayDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Tạo mảng các ngày cần hiển thị (như trong hình)
    const displayDays = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Thêm các ngày từ 2 đến 6 (như trong hình October 2023)
    for (let i = 2; i <= 6; i++) {
      if (i <= daysInMonth) {
        const date = new Date(year, month, i);
        displayDays.push({
          date: i,
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: date
        });
      }
    }
    
    return displayDays;
  };

  const handleAddEvent = () => {
    // TODO: Connect to backend API
    console.log('Add new event - connect to API');
  };

  const handleEventClick = (eventId: number) => {
    // TODO: Open event details
    console.log('Event clicked:', eventId);
  };

  const handleWaitingListItemClick = (itemId: number) => {
    // TODO: Open waiting list item details
    console.log('Waiting list item clicked:', itemId);
  };

  const handleDayClick = (day: number) => {
    console.log('Day clicked:', day);
    // TODO: Open day view or add event modal
  };

  const displayDays = getDisplayDays();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <button 
          onClick={handleAddEvent}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add new
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main Calendar - Giống hình thực tế */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold">
                  {getMonthYearString(currentDate)}
                </h2>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button 
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={goToToday}
              >
                Today
              </button>
            </div>

            {/* Calendar Days Grid - Giống hình thực tế */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              {displayDays.map((dayInfo) => (
                <div
                  key={dayInfo.date}
                  className="text-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleDayClick(dayInfo.date)}
                >
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {dayInfo.day}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {dayInfo.date}
                  </div>
                </div>
              ))}
            </div>

            {/* Events Section - Giống hình thực tế */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">Today</h3>
                <span className="text-sm text-gray-500">October 2023</span>
              </div>

              {/* Events List */}
              <div className="space-y-3">
                {events.map(event => (
                  <div 
                    key={event.id}
                    className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r-lg cursor-pointer hover:bg-red-200"
                    onClick={() => handleEventClick(event.id)}
                  >
                    <div className="font-medium text-sm text-gray-900">{event.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{event.project}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {event.time} • {event.status}
                    </div>
                  </div>
                ))}
              </div>

              {/* Upcoming Days */}
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-3">Upcoming</h3>
                <div className="space-y-2">
                  {displayDays.slice(1).map(dayInfo => (
                    <div
                      key={dayInfo.date}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleDayClick(dayInfo.date)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold text-gray-900 w-8 text-center">
                          {dayInfo.date}
                        </div>
                        <div className="text-sm text-gray-600">
                          {dayInfo.day}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        No events
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting List Sidebar - Giống hình thực tế */}
        <div className="w-80">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Search - Giống hình */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Waiting List Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Waiting list</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {waitingList.length}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Put unscheduled tasks here and come back to them later
            </p>

            {/* Waiting List Items */}
            <div className="space-y-3">
              {waitingList.map((item) => (
                <div 
                  key={item.id}
                  className="bg-gray-50 border border-gray-200 p-3 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => handleWaitingListItemClick(item.id)}
                >
                  <div className="text-sm text-gray-800">{item.title}</div>
                  {item.time && (
                    <div className="text-xs text-gray-500 mt-1">{item.time}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}