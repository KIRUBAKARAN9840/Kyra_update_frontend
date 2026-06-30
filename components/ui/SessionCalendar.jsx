import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SessionCalendar = ({ maxSelections, onSelectionChange, availableDates = [] }) => {
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Convert availableDates strings to Date objects for comparison
  const availableDateObjects = availableDates.map(dateStr => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  // Generate 30 days from today
  const generateCalendarDates = () => {
    const allDates = [];
    const startDate = new Date(today);

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      allDates.push(date);
    }

    // Group by month
    const datesByMonth = {};
    allDates.forEach(date => {
      const monthKey = `${date.getMonth()}-${date.getFullYear()}`;
      if (!datesByMonth[monthKey]) {
        datesByMonth[monthKey] = {
          month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          dates: []
        };
      }
      datesByMonth[monthKey].dates.push(date);
    });

    return Object.values(datesByMonth);
  };

  const monthsData = generateCalendarDates();

  const isSelected = (date) => {
    return selectedDates.some(d => d.toDateString() === date.toDateString());
  };

  const isDateAvailable = (date) => {
    // If no available dates provided, no dates are available
    if (availableDates.length === 0) return false;

    return availableDateObjects.some(d => d.toDateString() === date.toDateString());
  };

  const handleDatePress = (date) => {
    // Don't allow selection of unavailable dates
    if (!isDateAvailable(date)) return;
    let newSelectedDates = [...selectedDates];

    if (isSelected(date)) {
      // Unselect the date
      newSelectedDates = newSelectedDates.filter(d => d.toDateString() !== date.toDateString());
    } else {
      // Check if we can add more dates
      if (maxSelections && newSelectedDates.length >= maxSelections) {
        // For 1 or 5 sessions, remove the oldest selection
        if (maxSelections <= 5) {
          newSelectedDates.shift();
        } else {
          return; // Don't add if limit reached for custom
        }
      }
      newSelectedDates.push(date);
    }

    newSelectedDates.sort((a, b) => a - b);
    setSelectedDates(newSelectedDates);
    onSelectionChange(newSelectedDates);
  };

  const renderMonth = (monthData) => {
    const dates = monthData.dates;
    const weeks = [];
    let currentWeek = [];

    // Add empty slots for the first week
    // Sunday = 0, Monday = 1, ..., Saturday = 6
    const firstDay = dates[0].getDay();
    const emptySlots = firstDay; // No adjustment needed since Sunday is index 0

    for (let i = 0; i < emptySlots; i++) {
      currentWeek.push(null);
    }

    dates.forEach((date) => {
      currentWeek.push(date);
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    // Add remaining dates
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return (
      <View key={monthData.month} style={styles.monthContainer}>
        <View style={styles.monthHeaderContainer}>
          <Text style={styles.monthTitle}>{monthData.month}</Text>
        </View>

        {/* Week day headers */}
        <View style={styles.weekHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((date, dateIndex) => {
                if (!date) {
                  return <View key={`empty-${dateIndex}`} style={styles.emptyDateItem} />;
                }

                const selected = isSelected(date);
                const isToday = date.toDateString() === today.toDateString();
                const isAvailable = isDateAvailable(date);

                return (
                  <TouchableOpacity
                    key={dateIndex}
                    style={[
                      styles.dateItem,
                      selected && styles.selectedDateItem,
                      isToday && !selected && styles.todayDateItem,
                      !isAvailable && styles.disabledDateItem
                    ]}
                    onPress={() => handleDatePress(date)}
                    disabled={!isAvailable}
                  >
                    <Text style={[
                      styles.dateText,
                      selected && styles.selectedDateText,
                      isToday && !selected && styles.todayDateText,
                      !isAvailable && styles.disabledDateText
                    ]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {monthsData.map(monthData => renderMonth(monthData))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  monthContainer: {
    marginBottom: 24,
  },
  monthHeaderContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  calendarGrid: {
    gap: 8,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    minHeight: 40,
  },
  selectedDateItem: {
    backgroundColor: '#00C853',
  },
  todayDateItem: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  emptyDateItem: {
    flex: 1,
    aspectRatio: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedDateText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todayDateText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledDateItem: {
    backgroundColor: '#F3F4F6',
    opacity: 0.5,
  },
  disabledDateText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
});

export default SessionCalendar;
