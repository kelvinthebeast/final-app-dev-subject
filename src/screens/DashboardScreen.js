import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, 
  Platform, Dimensions, Modal, TouchableWithoutFeedback 
} from 'react-native';
// Fix lỗi SafeAreaView cũ
import { SafeAreaView } from 'react-native-safe-area-context'; 

import { BarChart } from 'react-native-chart-kit'; 
import * as Notifications from 'expo-notifications'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import useBookStore, { RANKS } from '../store/useBookStore';

// Cấu hình hiển thị thông báo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 40; 

const DashboardScreen = ({ navigation }) => {
  const { 
      dailyReadingStats, isReminderEnabled, reminderTime, 
      setReminder, books, restoreData, totalMinutesRead, resetToDefault 
  } = useBookStore();

  const [showPicker, setShowPicker] = useState(false);
  
  const getInitialDate = () => {
      const d = new Date();
      if (reminderTime && reminderTime.hour !== undefined) {
          d.setHours(reminderTime.hour);
          d.setMinutes(reminderTime.minute);
          d.setSeconds(0);
      } else {
          d.setHours(20); d.setMinutes(0);
      }
      return d;
  };
  const [tempDate, setTempDate] = useState(getInitialDate());

  // --- 2. XIN QUYỀN VÀ TẠO KÊNH (CHANNEL) ---
  useEffect(() => {
    async function configurePushNotifications() {
      // 1. Xin quyền
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
      }
      if (finalStatus !== 'granted') {
          Alert.alert("Lỗi", "Cần cấp quyền để nhận thông báo!");
          return;
      }
      
      // 2. Tạo kênh (Bắt buộc cho Android 8.0+)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reading-reminder', {
          name: 'Nhắc nhở đọc sách',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    }
    configurePushNotifications();
  }, []);

  // --- 🔥 3. HÀM ĐẶT LỊCH (ĐÃ FIX LỖI "TYPE INVALID") ---
  const scheduleDailyNotification = async (hour, minute) => {
      try {
          // A. Hủy lịch cũ
          await Notifications.cancelAllScheduledNotificationsAsync();

          // B. Đặt lịch mới
          // Sửa lỗi: Thêm 'type: Notifications.SchedulableTriggerInputTypes.CALENDAR'
          const trigger = {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              hour: Number(hour),
              minute: Number(minute),
              repeats: true, // Lặp lại hàng ngày
          };

          // Nếu là Android, có thể cần channelId trong content (tùy version Expo)
          const notificationContent = {
              title: "📖 Đã đến giờ đọc sách!",
              body: "Hãy dành 5 phút để phát triển bản thân nhé.",
              sound: true,
              data: { url: 'myapp://read' },
          };

          // Gán channelId cho Android nếu cần thiết (cho chắc chắn)
          if (Platform.OS === 'android') {
              // notificationContent.channelId = 'reading-reminder'; // (Tuỳ chọn: Nếu setNotificationChannelAsync đã set default thì không cần dòng này)
          }

          const identifier = await Notifications.scheduleNotificationAsync({
              content: notificationContent,
              trigger: trigger,
          });
          
          console.log(`✅ Đã đặt lịch ID: ${identifier} lúc ${hour}:${minute}`);
          
          // Test thử: Báo cho người dùng biết là đã đặt thành công
          // (Sau này chạy ổn thì xóa dòng alert này đi cũng được)
          // Alert.alert("Thành công", `Đã đặt lịch nhắc lúc ${hour}:${minute}`);

      } catch (error) {
          console.log("❌ Lỗi đặt lịch chi tiết:", error);
          Alert.alert("Lỗi hệ thống", "Không thể đặt lịch trên phiên bản Android này: " + error.message);
      }
  };

  const cancelNotification = async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("Đã hủy thông báo");
  };

  // --- XỬ LÝ SỰ KIỆN ---

  const toggleSwitch = async (value) => {
      const dateToSave = tempDate;
      setReminder(value, { hour: dateToSave.getHours(), minute: dateToSave.getMinutes() });

      if (value) {
          await scheduleDailyNotification(dateToSave.getHours(), dateToSave.getMinutes());
          if (Platform.OS === 'android') Alert.alert("Đã bật", `Sẽ nhắc lúc ${displayTime()}`);
      } else {
          await cancelNotification();
      }
  };

  const onTimeChange = async (event, selectedDate) => {
      if (Platform.OS === 'android') {
          setShowPicker(false);
          if (selectedDate) {
              setTempDate(selectedDate);
              setReminder(true, { hour: selectedDate.getHours(), minute: selectedDate.getMinutes() });
              await scheduleDailyNotification(selectedDate.getHours(), selectedDate.getMinutes());
          }
      } else {
          if (selectedDate) setTempDate(selectedDate);
      }
  };

  const confirmIOSDate = async () => {
      setShowPicker(false);
      setReminder(true, { hour: tempDate.getHours(), minute: tempDate.getMinutes() });
      await scheduleDailyNotification(tempDate.getHours(), tempDate.getMinutes());
  };

  const displayTime = () => {
      const h = tempDate.getHours();
      const m = tempDate.getMinutes();
      return `${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}`;
  };

  // --- CÁC HÀM THỐNG KÊ (GIỮ NGUYÊN) ---
  const formatTime = (t) => { if (!t) return "0p"; const h = Math.floor(t / 60); const m = t % 60; return h > 0 ? `${h}h ${m}p` : `${m}p`; };
  const { currentRank, progress, nextGoalText } = (() => {
      const currentRank = RANKS.slice().reverse().find(r => totalMinutesRead >= r.minMinutes) || RANKS[0];
      const nextRankIndex = RANKS.findIndex(r => r.id === currentRank.id) + 1; const nextRank = RANKS[nextRankIndex];
      let p = 100; let n = "Max Level!";
      if (nextRank) { const r = nextRank.minMinutes - currentRank.minMinutes; const c = totalMinutesRead - currentRank.minMinutes; p = Math.min(100, Math.max(0, (c / r) * 100)); n = `Đọc thêm ${nextRank.minMinutes - totalMinutesRead} phút để đạt "${nextRank.title}"`; }
      return { currentRank, progress: p, nextGoalText: n };
  })();
  const badges = (() => {
      const cb = books.length; const cm = totalMinutesRead;
      return [
          { id: 1, icon: '🌱', name: 'Khởi đầu', current: cb, target: 1, type: 'book' },
          { id: 2, icon: '📚', name: 'Mọt sách', current: cb, target: 5, type: 'book' },
          { id: 3, icon: '🏛️', name: 'Thư viện', current: cb, target: 10, type: 'book' },
          { id: 4, icon: '🔥', name: 'Chăm chỉ', current: cm, target: 60, type: 'time' },
          { id: 5, icon: '💎', name: 'Đại gia', current: cm, target: 500, type: 'time' },
      ].map(b => ({ ...b, isUnlocked: b.current >= b.target, progressPercent: Math.min(100, (b.current / b.target) * 100) }));
  })();
  const stats = (() => {
      const t = new Date().toISOString().split('T')[0]; const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let s = 0; if (dailyReadingStats[t] || dailyReadingStats[y]) { let d = new Date(); while (true) { const k = d.toISOString().split('T')[0]; if (dailyReadingStats[k] > 0) { s++; d.setDate(d.getDate() - 1); } else { if (k === t && s === 0) { d.setDate(d.getDate() - 1); continue; } break; } } }
      let tw = 0; const cd = []; const l = []; const n = new Date();
      for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(n.getDate() - i); const k = d.toISOString().split('T')[0]; const v = dailyReadingStats[k] || 0; tw += v; cd.push(v); l.push(`${d.getDate()}/${d.getMonth()+1}`); }
      return { streak: s, avgDaily: Math.round(totalMinutesRead / (Object.keys(dailyReadingStats).length || 1)), totalWeek: tw, chartData: cd, labels: l };
  })();
  const handleBackup = async () => { try { const s = useBookStore.getState(); const p = FileSystem.documentDirectory + 'bk_back.json'; await FileSystem.writeAsStringAsync(p, JSON.stringify({ ...s, createdAt: new Date().toISOString() })); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(p); } catch (e) { Alert.alert("Lỗi", e.message); } };
  const handleRestore = async () => { try { const r = await DocumentPicker.getDocumentAsync({ type: 'application/json' }); if (!r.canceled) { const c = await FileSystem.readAsStringAsync(r.assets[0].uri); const d = JSON.parse(c); if (d.books && restoreData) { restoreData(d); Alert.alert("Thành công!"); } } } catch (e) { Alert.alert("Lỗi", e.message); } };
  const handleResetDefault = () => { Alert.alert("Reset", "Xóa hết?", [{ text: "Hủy" }, { text: "Đồng ý", onPress: () => resetToDefault && resetToDefault() }]); };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#f5f5f7'}}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* RANK CARD */}
        <View style={styles.rankCard}>
            <View style={styles.rankHeader}>
                <View><Text style={styles.rankLabel}>DANH HIỆU</Text><Text style={styles.rankTitle}>{currentRank.title}</Text><Text style={styles.rankTotal}>EXP: {totalMinutesRead} phút</Text></View>
                <Text style={styles.rankIcon}>{currentRank.icon}</Text>
            </View>
            <View style={styles.progressBarContainer}><View style={[styles.progressBarFill, { width: `${progress}%` }]} /></View>
            <Text style={styles.rankNextGoal}>{nextGoalText}</Text>
        </View>

        {/* STATS */}
        <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={styles.statVal}>{books.length}</Text><Text style={styles.statLabel}>Sách</Text></View>
            <View style={styles.statItem}><Text style={styles.statVal}>{stats.streak} 🔥</Text><Text style={styles.statLabel}>Chuỗi</Text></View>
            <View style={styles.statItem}><Text style={styles.statVal}>{formatTime(stats.totalWeek)}</Text><Text style={styles.statLabel}>Tuần này</Text></View>
            <View style={styles.statItem}><Text style={styles.statVal}>{stats.avgDaily}p</Text><Text style={styles.statLabel}>TB/Ngày</Text></View>
        </View>

        {/* BADGES */}
        <Text style={styles.sectionHeader}>Thành Tích</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
           {badges.map(b => (
               <View key={b.id} style={[styles.badgeCard, !b.isUnlocked && styles.badgeLocked]}>
                   <View style={styles.badgeIconContainer}><Text style={{fontSize: 28}}>{b.isUnlocked ? b.icon : '🔒'}</Text></View>
                   <Text style={styles.badgeName}>{b.name}</Text>
                   <Text style={styles.badgeProgress}>{b.type==='book'?`${b.current}/${b.target}`:`${b.current}/${b.target}p`}</Text>
                   <View style={styles.miniProgressBg}><View style={[styles.miniProgressFill, { width: `${b.progressPercent}%`, backgroundColor: b.isUnlocked ? '#34C759' : '#FF9500' }]} /></View>
               </View>
           ))}
        </ScrollView>

        {/* CHART */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartHeader}>Biểu đồ tuần</Text>
          <BarChart
              data={{ labels: stats.labels, datasets: [{ data: stats.chartData }] }}
              width={CHART_WIDTH + 10} height={200} yAxisLabel="" yAxisSuffix="" fromZero={true}
              chartConfig={{ backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff", decimalPlaces: 0, color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, labelColor: () => `#555`, barPercentage: 0.7 }}
              style={{ borderRadius: 16, paddingRight: 0, marginLeft: -10 }} showValuesOnTopOfBars={true} withInnerLines={true} withVerticalLines={false}
          />
        </View>

        {/* SETTINGS */}
        <Text style={styles.sectionHeader}>Cài đặt</Text>
        <View style={styles.settingCard}>
            <View style={styles.settingRow}>
                <View><Text style={styles.settingTitle}>Nhắc nhở đọc sách</Text><Text style={styles.settingSub}>Nhận thông báo hằng ngày</Text></View>
                <Switch onValueChange={toggleSwitch} value={isReminderEnabled} trackColor={{true: "#34C759", false: "#ddd"}} />
            </View>
            {isReminderEnabled && (
                <>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.settingRow} onPress={() => setShowPicker(true)}>
                        <Text style={styles.settingTitle}>Thời gian nhắc</Text>
                        <View style={styles.timeBadge}><Text style={styles.timeText}>{displayTime()}</Text></View>
                    </TouchableOpacity>
                </>
            )}
        </View>

        {/* SYSTEM ACTIONS */}
        <View style={styles.backupRow}>
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#e8f5e9'}]} onPress={handleBackup}><Text style={{fontSize:20}}>☁️</Text><Text style={[styles.actionText, {color:'green'}]}>Sao Lưu</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#fff3e0'}]} onPress={handleRestore}><Text style={{fontSize:20}}>⚡</Text><Text style={[styles.actionText, {color:'orange'}]}>Khôi Phục</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#ffebee', width: '100%', marginBottom: 15}]} onPress={handleResetDefault}><Text style={{fontSize: 20}}>🔄</Text><Text style={[styles.actionText, {color: '#d32f2f'}]}>Nạp lại dữ liệu mẫu</Text></TouchableOpacity>
        <View style={{height: 80}}/>
      </ScrollView>

      {/* MODAL PICKER IOS */}
      {Platform.OS === 'ios' && (
          <Modal transparent visible={showPicker} animationType="slide">
              <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
                  <View style={styles.modalOverlay}>
                      <TouchableWithoutFeedback>
                          <View style={styles.iosPickerContainer}>
                              <View style={styles.iosPickerHeader}>
                                  <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={{color: '#666', fontSize: 16}}>Hủy</Text></TouchableOpacity>
                                  <Text style={{fontWeight: 'bold', fontSize: 16}}>Chọn giờ</Text>
                                  <TouchableOpacity onPress={confirmIOSDate}><Text style={{color: '#007AFF', fontWeight: 'bold', fontSize: 16}}>Xong</Text></TouchableOpacity>
                              </View>
                              <DateTimePicker value={tempDate} mode="time" display="spinner" onChange={(e, d) => d && setTempDate(d)} style={{height: 200}} textColor="#000" />
                          </View>
                      </TouchableWithoutFeedback>
                  </View>
              </TouchableWithoutFeedback>
          </Modal>
      )}

      {/* PICKER ANDROID */}
      {Platform.OS === 'android' && showPicker && (
          <DateTimePicker value={tempDate} mode="time" is24Hour={true} display="default" onChange={onTimeChange} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  rankCard: { backgroundColor: '#222', borderRadius: 20, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.3, elevation: 8 },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankLabel: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  rankTitle: { color: '#FFD700', fontSize: 26, fontWeight: 'bold' },
  rankTotal: { color: '#ccc', fontSize: 13 },
  rankIcon: { fontSize: 45 },
  progressBarContainer: { height: 6, backgroundColor: '#444', borderRadius: 3, marginTop: 15 },
  progressBarFill: { height: '100%', backgroundColor: '#4CD964' },
  rankNextGoal: { color: '#888', fontSize: 11, marginTop: 8, fontStyle: 'italic', textAlign: 'right' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statItem: { backgroundColor: '#fff', width: '23%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#888' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, marginLeft: 5 },
  badgeScroll: { marginBottom: 25 },
  badgeCard: { backgroundColor: '#fff', padding: 10, borderRadius: 12, marginRight: 10, alignItems: 'center', width: 110, height: 130, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
  badgeLocked: { opacity: 0.6, backgroundColor: '#ececec' },
  badgeIconContainer: { marginBottom: 5 },
  badgeName: { fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: 2 },
  badgeProgress: { fontSize: 10, color: '#666', marginBottom: 5 }, 
  miniProgressBg: { width: '80%', height: 4, backgroundColor: '#eee', borderRadius: 2 },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  chartContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 25, overflow: 'hidden' },
  chartHeader: { fontSize: 16, fontWeight: '600', color: '#333' },
  backupRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  actionBtn: { width: '48%', padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  actionText: { fontWeight: 'bold', marginLeft: 8 },
  settingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 5, marginBottom: 25 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  settingTitle: { fontSize: 16, color: '#333', fontWeight: '500' },
  settingSub: { fontSize: 12, color: '#888', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 15 },
  timeBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  timeText: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  iosPickerContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  iosPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#f9f9f9', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
});

export default DashboardScreen;