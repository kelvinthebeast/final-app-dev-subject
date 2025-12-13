import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit'; 
import * as Notifications from 'expo-notifications'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import useBookStore from '../store/useBookStore';

// 1. CẤU HÌNH HIỂN THỊ THÔNG BÁO
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const screenWidth = Dimensions.get('window').width;

const DashboardScreen = ({ navigation }) => {
  const { dailyReadingStats, isReminderEnabled, reminderTime, setReminder } = useBookStore();

  // --- 2. CẤU HÌNH KÊNH CHO ANDROID (QUAN TRỌNG) ---
  useEffect(() => {
    async function configurePushNotifications() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Cảnh báo', 'Bạn cần cấp quyền thông báo để tính năng hoạt động!');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    }

    configurePushNotifications();
  }, []);

  // --- HÀM FORMAT THỜI GIAN ---
  const formatTime = (totalMinutes) => {
      if (!totalMinutes) return "0p";
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      if (h > 0) return `${h}h ${m}p`;
      return `${m}p`;
  };

  // --- DATA BIỂU ĐỒ ---
  const chartDataRaw = [];
  const labels = [];
  let totalWeekMinutes = 0;
  
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0]; 
      const dayLabel = d.getDate() + '/' + (d.getMonth() + 1); 
      const mins = dailyReadingStats[dateKey] || 0;
      labels.push(dayLabel);
      chartDataRaw.push(mins);
      totalWeekMinutes += mins;
  }
  const averageMinutes = Math.round(totalWeekMinutes / 7);

  // --- LOGIC NHẮC NHỞ ---
  const getInitialDate = () => {
      const d = new Date();
      d.setHours(reminderTime?.hour || 20);
      d.setMinutes(reminderTime?.minute || 0);
      d.setSeconds(0);
      return d;
  };

  const [date, setDate] = useState(getInitialDate());
  const [showPicker, setShowPicker] = useState(false);

  // --- HÀM HẸN GIỜ (ĐÃ SỬA LỖI TRIGGER) ---
  const scheduleNotification = async (triggerDate) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!isReminderEnabled) return; 

    const hour = triggerDate.getHours();
    const minute = triggerDate.getMinutes();

    try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "📖 Đến giờ đọc sách rồi!",
            body: "Duy trì thói quen mỗi ngày bạn nhé. Bấm vào để đọc ngay!",
            sound: true,
          },
          trigger: {
            // 👇 THÊM DÒNG NÀY: Khai báo rõ đây là kiểu Lịch (Calendar)
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: hour,
            minute: minute,
            repeats: true, 
          },
        });
        
        Alert.alert("Thành công", `App sẽ nhắc bạn vào lúc ${hour}:${minute < 10 ? '0' + minute : minute} hằng ngày.`);
    } catch (error) {
        console.log(error);
        Alert.alert("Lỗi", "Không thể lên lịch thông báo: " + error.message);
    }
  };

  // --- HÀM TEST NHANH (ĐÃ SỬA LỖI TRIGGER) ---
  const testNotificationNow = async () => {
      try {
        await Notifications.scheduleNotificationAsync({
            content: {
              title: "🔔 Test thử nè!",
              body: "Thông báo hoạt động tốt nhé sếp!",
            },
            trigger: { 
                // 👇 THÊM DÒNG NÀY: Khai báo rõ đây là kiểu Khoảng thời gian (TimeInterval)
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 2,
                repeats: false
            }, 
        });
      } catch (error) {
          Alert.alert("Lỗi Test", error.message);
      }
  };

  const onChangeTime = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
        setDate(selectedDate);
        const h = selectedDate.getHours();
        const m = selectedDate.getMinutes();
        if (isReminderEnabled) {
            setReminder(true, { hour: h, minute: m });
            scheduleNotification(selectedDate);
        } else {
            setReminder(false, { hour: h, minute: m });
        }
    }
  };

  const toggleSwitch = async () => {
      const newState = !isReminderEnabled;
      setReminder(newState, { hour: date.getHours(), minute: date.getMinutes() });
      if (newState) await scheduleNotification(date);
      else await Notifications.cancelAllScheduledNotificationsAsync();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Thống Kê</Text>

      {/* TỔNG QUAN */}
      <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TRUNG BÌNH MỖI NGÀY</Text>
          <Text style={styles.summaryValue}>{formatTime(averageMinutes)}</Text>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
              <Text style={styles.summarySub}>Tổng tuần này:</Text>
              <Text style={styles.summarySubValue}>{formatTime(totalWeekMinutes)}</Text>
          </View>
      </View>

      {/* BIỂU ĐỒ */}
      <View style={styles.chartCard}>
        <BarChart
            data={{ labels: labels, datasets: [{ data: chartDataRaw }] }}
            width={screenWidth - 40} height={240} yAxisLabel="" yAxisSuffix="" 
            formatYLabel={(value) => {
                const h = parseInt(value) / 60;
                return h >= 1 ? `${h.toFixed(1)}h` : `${parseInt(value)}p`;
            }}
            chartConfig={{
                backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
                decimalPlaces: 0, color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`, barPercentage: 0.7,
                propsForBackgroundLines: { strokeDasharray: "", stroke: "#f0f0f0" }
            }}
            style={{ borderRadius: 16 }} showValuesOnTopOfBars={false} 
        />
        <Text style={styles.chartHint}>7 ngày gần nhất</Text>
      </View>

      {/* CÀI ĐẶT */}
      <Text style={[styles.headerTitle, { marginTop: 20 }]}>Cài Đặt</Text>
      <View style={styles.settingCard}>
        <View style={styles.rowBetween}>
            <View>
                <Text style={styles.cardTitle}>⏰ Nhắc nhở đọc sách</Text>
                <Text style={styles.cardSub}>Thông báo hằng ngày</Text>
            </View>
            <Switch
                trackColor={{ false: "#e9e9ea", true: "#34C759" }}
                thumbColor={"#fff"}
                onValueChange={toggleSwitch}
                value={isReminderEnabled}
            />
        </View>

        {isReminderEnabled && (
            <View style={styles.timePickerRow}>
                <Text style={styles.timeLabel}>Thời gian:</Text>
                {Platform.OS === 'android' ? (
                     <TouchableOpacity style={styles.androidTimeBtn} onPress={() => setShowPicker(true)}>
                        <Text style={styles.androidTimeText}>
                            {date.getHours()}:{date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <DateTimePicker
                        testID="dateTimePicker" value={date} mode="time" is24Hour={true}
                        display="compact" onChange={onChangeTime} style={{ width: 100 }}
                    />
                )}
            </View>
        )}

        {showPicker && Platform.OS === 'android' && (
             <DateTimePicker value={date} mode="time" is24Hour={true} display="default" onChange={onChangeTime} />
        )}
        
        {isReminderEnabled && (
            <TouchableOpacity style={styles.testBtn} onPress={testNotificationNow}>
                <Text style={{color: '#007AFF', fontSize: 12}}>🔔 Gửi thử thông báo sau 2s (Test)</Text>
            </TouchableOpacity>
        )}

      </View>

      <View style={{height: 50}}/>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', padding: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, color: '#000', marginLeft: 5 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 15 },
  summaryLabel: { fontSize: 13, color: '#8e8e93', fontWeight: '600', marginBottom: 5, letterSpacing: 0.5 },
  summaryValue: { fontSize: 34, fontWeight: 'bold', color: '#000' },
  divider: { height: 1, backgroundColor: '#e5e5ea', marginVertical: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summarySub: { fontSize: 15, color: '#333' },
  summarySubValue: { fontSize: 15, fontWeight: '600', color: '#333' },
  chartCard: { backgroundColor: '#fff', borderRadius: 14, padding: 10, paddingBottom: 20, alignItems: 'center', marginBottom: 15 },
  chartHint: { marginTop: 10, color: '#8e8e93', fontSize: 12 },
  settingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '500', color: '#000' },
  cardSub: { fontSize: 13, color: '#8e8e93', marginTop: 2 },
  timePickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#e5e5ea', paddingTop: 15 },
  timeLabel: { fontSize: 16, color: '#333' },
  androidTimeBtn: { backgroundColor: '#f2f2f7', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  androidTimeText: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  testBtn: { marginTop: 15, alignItems: 'center', padding: 10 }
});

export default DashboardScreen;