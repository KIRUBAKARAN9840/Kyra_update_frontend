import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from 'react-native';

const WeekdayButton = ({ day, date, isActive, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 7,
      }}
    >
      <LinearGradient
        colors={['#007bff18', '#28a74616']}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{ borderRadius: 100 }}
      >
        <View
          style={[
            styles.weekdayButton,
            isActive && styles.activeWeekdayButton,
            styles.disableWeekdayButton,
          ]}
        >
          <Text
            style={[styles.weekdayText, isActive && styles.activeWeekdayText]}
          >
            {date}
          </Text>
        </View>
      </LinearGradient>
      <Text
        style={[styles.weekdayLabel, isActive && styles.activeWeekdayLabel]}
      >
        {day}
      </Text>
    </TouchableOpacity>
  );
};

export default WeekdayButton;

const styles = StyleSheet.create({
  weekDayStrip: {
    paddingLeft: 8,
    paddingTop: 10,
    paddingBottom: 16,
  },
  weekdayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 123, 255, 0.06)',
  },
  activeWeekdayButton: {
    backgroundColor: '#007BFF',
  },
  disableWeekdayButton: {
    // backgroundColor: 'rgba(104, 104, 104, 0.301)',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '400',
  },
  weekdayLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  activeWeekdayText: {
    color: 'white',
  },
  activeWeekdayLabel: {
    color: '#007BFF',
  },
});
