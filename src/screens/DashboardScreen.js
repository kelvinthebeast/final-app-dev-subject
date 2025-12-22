import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit'; 
import * as Notifications from 'expo-notifications'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

// 👇 IMPORT THÊM 'RANKS' ĐỂ TÍNH TOÁN HIỂN THỊ
import useBookStore, { RANKS } from '../store/useBookStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const screenWidth = Dimensions.get('window').width;

const DashboardScreen = ({ navigation }) => {
  // 👇 LẤY THÊM 'totalMinutesRead' ĐỂ TÍNH RANK
  const { dailyReadingStats, isReminderEnabled, reminderTime, setReminder, books, restoreData, totalMinutesRead } = useBookStore();

  useEffect(() => {
    async function configurePushNotifications() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') await Notifications.requestPermissionsAsync();
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default', importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C',
        });
      }
    }
    configurePushNotifications();
  }, []);

  const formatTime = (totalMinutes) => {
      if (!totalMinutes) return "0p";
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return h > 0 ? `${h}h ${m}p` : `${m}p`;
  };

  const getCurrentRankInfo = () => {
      // 1. Tìm Rank hiện tại (Rank cao nhất mà phút đọc thỏa mãn)
      // Reverse để tìm từ cao xuống thấp, gặp cái nào thỏa mãn thì lấy luôn
      const currentRank = RANKS.slice().reverse().find(r => totalMinutesRead >= r.minMinutes) || RANKS[0];
      
      // 2. Tìm Rank tiếp theo
      const nextRankIndex = RANKS.findIndex(r => r.id === currentRank.id) + 1;
      const nextRank = RANKS[nextRankIndex];

      // 3. Tính phần trăm tiến độ
      let progress = 100; // Mặc định Max cấp
      let nextGoal = "Đã đạt cấp tối đa!";
      
      if (nextRank) {
          const range = nextRank.minMinutes - currentRank.minMinutes;
          const current = totalMinutesRead - currentRank.minMinutes;
          progress = (current / range) * 100;
          nextGoal = `Cần đọc thêm ${nextRank.minMinutes - totalMinutesRead} phút để lên ${nextRank.title}`;
      }

      return { currentRank, nextRank, progress, nextGoal };
  };

  const { currentRank, nextRank, progress, nextGoal } = getCurrentRankInfo();


  // --- HUY HIỆU (Thành tích) ---
  const calculateBadges = () => {
      const totalBooks = books.length;
      let totalMinutes = 0;
      Object.values(dailyReadingStats).forEach(min => totalMinutes += min);

      const badges = [
          { id: 1, icon: '🌱', name: 'Khởi đầu', condition: totalBooks >= 1, desc: 'Thêm cuốn đầu tiên' },
          { id: 2, icon: '🔥', name: 'Chăm chỉ', condition: totalMinutes >= 60, desc: 'Đọc đủ 60 phút' },
          { id: 3, icon: '📚', name: 'Mọt sách', condition: totalBooks >= 5, desc: 'Tủ sách có 5 cuốn' },
          { id: 4, icon: '💎', name: 'Bậc thầy', condition: totalMinutes >= 500, desc: 'Đọc đủ 500 phút' },
      ];
      return badges;
  };
  const badges = calculateBadges();

  // --- BACKUP/RESTORE ---
  const handleBackup = async () => {
      try {
          const state = useBookStore.getState();
          const backupData = {
              books: state.books,
              readingSessions: state.readingSessions,
              dailyReadingStats: state.dailyReadingStats,
              settings: state.settings || {},
              totalMinutesRead: state.totalMinutesRead, // Backup cả tổng thời gian
              createdAt: new Date().toISOString()
          };

          const path = FileSystem.documentDirectory + 'BookKeeper_Backup.json';
          await FileSystem.writeAsStringAsync(path, JSON.stringify(backupData), { encoding: 'utf8' });

          if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
          else Alert.alert("Lỗi", "Thiết bị không hỗ trợ chia sẻ.");
      } catch (error) { Alert.alert("Lỗi Backup", error.message); }
  };

  const handleRestore = async () => {
      try {
          const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
          if (result.canceled) return;
          Alert.alert(
              "Cảnh báo quan trọng", "Khôi phục sẽ ghi đè dữ liệu hiện tại. Tiếp tục?",
              [{ text: "Hủy", style: "cancel" }, { text: "Đồng ý", style: 'destructive', onPress: async () => {
                  try {
                      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' });
                      const data = JSON.parse(content);
                      if (data.books && restoreData) {
                          restoreData(data);
                          Alert.alert("Thành công", "Đã khôi phục dữ liệu!");
                      } else Alert.alert("Lỗi", "File không hợp lệ.");
                  } catch (e) { Alert.alert("Lỗi đọc file", e.message); }
              }}]
          );
      } catch (error) { Alert.alert("Lỗi Restore", error.message); }
  };

  // --- CHART DATA ---
  const chartDataRaw = [];
  const labels = [];
  let totalWeekMinutes = 0;
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0]; 
      const dayLabel = d.getDate() + '/' + (d.getMonth() + 1); 
      const mins = dailyReadingStats[dateKey] || 0;
      labels.push(dayLabel);
      chartDataRaw.push(mins);
      totalWeekMinutes += mins;
  }
  const averageMinutes = Math.round(totalWeekMinutes / 7);

  // --- NOTIFICATIONS ---
  const getInitialDate = () => {
      const d = new Date(); d.setHours(reminderTime?.hour || 20); d.setMinutes(reminderTime?.minute || 0); d.setSeconds(0);
      return d;
  };
  const [date, setDate] = useState(getInitialDate());
  const [showPicker, setShowPicker] = useState(false);

  const scheduleNotification = async (triggerDate) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!isReminderEnabled) return; 
    const hour = triggerDate.getHours();
    const minute = triggerDate.getMinutes();
    try {
        await Notifications.scheduleNotificationAsync({
          content: { title: "📖 Đến giờ đọc sách rồi!", body: "Duy trì thói quen mỗi ngày bạn nhé.", sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour, minute, repeats: true },
        });
        Alert.alert("Đã hẹn giờ", `Nhắc lúc ${hour}:${minute < 10 ? '0' + minute : minute} hằng ngày.`);
    } catch (error) { Alert.alert("Lỗi", error.message); }
  };

  const testNotificationNow = async () => {
      try {
        await Notifications.scheduleNotificationAsync({
            content: { title: "🔔 Test thử nè!", body: "Thông báo hoạt động tốt nhé sếp!" },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, repeats: false }, 
        });
      } catch (error) { Alert.alert("Lỗi Test", error.message); }
  };

  const onChangeTime = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
        setDate(selectedDate);
        if (isReminderEnabled) { setReminder(true, { hour: selectedDate.getHours(), minute: selectedDate.getMinutes() }); scheduleNotification(selectedDate); }
        else { setReminder(false, { hour: selectedDate.getHours(), minute: selectedDate.getMinutes() }); }
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
      {/* 1. THẺ RANK (MỚI THÊM) */}
      <View style={styles.rankCard}>
          <View style={styles.rankHeader}>
              <View>
                  <Text style={styles.rankLabel}>DANH HIỆU HIỆN TẠI</Text>
                  <Text style={styles.rankTitle}>{currentRank.title}</Text>
                  <Text style={styles.rankTotal}>Tổng: {totalMinutesRead} phút</Text>
              </View>
              <Text style={styles.rankIcon}>{currentRank.icon}</Text>
          </View>
          
          <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          
          <Text style={styles.rankNextGoal}>{nextGoal}</Text>
      </View>

      <Text style={styles.headerTitle}>Thống Kê</Text>

      {/* 2. HUY HIỆU */}
      <View style={styles.badgeSection}>
         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {badges.map(badge => (
                <View key={badge.id} style={[styles.badgeCard, !badge.condition && styles.badgeLocked]}>
                    <Text style={{fontSize: 32}}>{badge.condition ? badge.icon : '🔒'}</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
            ))}
         </ScrollView>
      </View>

      {/* 3. CHART */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Hoạt động tuần này</Text>
        <BarChart
            data={{ labels: labels, datasets: [{ data: chartDataRaw }] }}
            width={screenWidth - 60} height={180} yAxisLabel="" yAxisSuffix="" 
            chartConfig={{
                backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
                decimalPlaces: 0, color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: () => `#888`, barPercentage: 0.6,
            }}
            style={{ marginTop: 10 }} showValuesOnTopOfBars={false} withInnerLines={false}
        />
      </View>

      {/* 4. BACKUP */}
      <Text style={[styles.headerTitle, { marginTop: 10 }]}>Dữ Liệu</Text>
      <View style={styles.backupContainer}>
          <TouchableOpacity style={[styles.actionCard, styles.cardBackup]} onPress={handleBackup}>
              <Text style={{fontSize: 24, marginBottom: 5}}>☁️</Text>
              <Text style={styles.actionTitle}>Sao Lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, styles.cardRestore]} onPress={handleRestore}>
              <Text style={{fontSize: 24, marginBottom: 5}}>⚡</Text>
              <Text style={styles.actionTitle}>Khôi Phục</Text>
          </TouchableOpacity>
      </View>

      {/* 5. NOTIFICATION */}
      <Text style={[styles.headerTitle, { marginTop: 10 }]}>Thông Báo</Text>
      <View style={styles.settingCard}>
        <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>⏰ Nhắc nhở hằng ngày</Text>
            <Switch trackColor={{ false: "#e9e9ea", true: "#34C759" }} onValueChange={toggleSwitch} value={isReminderEnabled} />
        </View>
        {isReminderEnabled && (
             <View style={{marginTop: 10}}>
                {Platform.OS === 'android' ? (
                     <TouchableOpacity onPress={() => setShowPicker(true)}><Text style={{color:'#007AFF', fontWeight:'bold', fontSize:16}}>Chỉnh giờ: {date.getHours()}:{date.getMinutes()}</Text></TouchableOpacity>
                ) : (
                    <DateTimePicker value={date} mode="time" display="compact" onChange={onChangeTime} />
                )}
             </View>
        )}
        {showPicker && Platform.OS === 'android' && <DateTimePicker value={date} mode="time" is24Hour={true} onChange={onChangeTime} />}
      </View>

      <View style={{height: 100}}/>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', padding: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#000', marginTop: 15 },
  
  // RANK CARD (Mới)
  rankCard: { backgroundColor: '#333', borderRadius: 16, padding: 20, marginBottom: 10, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.3, elevation: 5 },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  rankLabel: { color: '#aaa', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
  rankTitle: { color: '#FFD700', fontSize: 28, fontWeight: 'bold' },
  rankTotal: { color: '#fff', fontSize: 14, marginTop: 5 },
  rankIcon: { fontSize: 50 },
  progressBarContainer: { height: 8, backgroundColor: '#555', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#34C759' },
  rankNextGoal: { color: '#ccc', fontSize: 12, fontStyle: 'italic' },

  // BADGES
  badgeSection: { marginBottom: 10 },
  badgeCard: { backgroundColor: '#fff', padding: 10, borderRadius: 12, marginRight: 10, alignItems: 'center', width: 90, height: 100, justifyContent: 'center' },
  badgeLocked: { opacity: 0.5, backgroundColor: '#ddd' },
  badgeName: { fontWeight: 'bold', marginTop: 5, fontSize: 11, textAlign: 'center' },

  // CHART
  chartCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, alignSelf: 'flex-start' },

  // BACKUP
  backupContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 },
  cardBackup: { borderBottomWidth: 3, borderBottomColor: '#34C759' },
  cardRestore: { borderBottomWidth: 3, borderBottomColor: '#FF9500' },
  actionTitle: { fontWeight: 'bold', color: '#333' },

  // SETTINGS
  settingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '500' },
});

export default DashboardScreen;