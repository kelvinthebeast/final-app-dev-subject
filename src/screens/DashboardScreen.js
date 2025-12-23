import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit'; 
import * as Notifications from 'expo-notifications'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import useBookStore, { RANKS } from '../store/useBookStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const screenWidth = Dimensions.get('window').width;

const DashboardScreen = ({ navigation }) => {
  // 🔥 LẤY DỮ LIỆU THẬT TỪ STORE
  // books.length: Số sách thật sự bạn đang có
  // totalMinutesRead: Tổng thời gian bạn đã đọc
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

  // --- 1. LOGIC TÍNH RANK (DANH HIỆU) ---
  const getCurrentRankInfo = () => {
      const currentRank = RANKS.slice().reverse().find(r => totalMinutesRead >= r.minMinutes) || RANKS[0];
      const nextRankIndex = RANKS.findIndex(r => r.id === currentRank.id) + 1;
      const nextRank = RANKS[nextRankIndex];

      let progress = 100; 
      let nextGoalText = "Bạn đã đạt cấp độ tối thượng!";
      
      if (nextRank) {
          const range = nextRank.minMinutes - currentRank.minMinutes;
          const current = totalMinutesRead - currentRank.minMinutes;
          progress = Math.min(100, Math.max(0, (current / range) * 100));
          nextGoalText = `Đọc thêm ${nextRank.minMinutes - totalMinutesRead} phút để đạt "${nextRank.title}"`;
      }

      return { currentRank, progress, nextGoalText };
  };
  const { currentRank, progress, nextGoalText } = getCurrentRankInfo();

  // --- 🔥 2. LOGIC TÍNH HUY HIỆU (ĐÃ SỬA ĐỂ HIỂN THỊ TIẾN ĐỘ THẬT) ---
  const calculateBadges = () => {
      // Dữ liệu thật lấy từ Store
      const currentBooksCount = books.length; // Biến động thật khi thêm/xóa sách
      const currentMinutes = totalMinutesRead; // Biến động thật khi đọc sách

      const badges = [
          { 
              id: 1, icon: '🌱', name: 'Khởi đầu', 
              desc: 'Có 1 cuốn sách', 
              current: currentBooksCount, target: 1, type: 'book' 
          },
          { 
              id: 2, icon: '📚', name: 'Mọt sách', 
              desc: 'Tủ sách 5 cuốn', 
              current: currentBooksCount, target: 5, type: 'book' 
          },
          { 
              id: 3, icon: '🏛️', name: 'Thư viện', 
              desc: 'Tủ sách 10 cuốn', 
              current: currentBooksCount, target: 10, type: 'book' 
          },
          { 
              id: 4, icon: '🔥', name: 'Chăm chỉ', 
              desc: 'Đọc đủ 60 phút', 
              current: currentMinutes, target: 60, type: 'time' 
          },
          { 
              id: 5, icon: '💎', name: 'Đại gia', 
              desc: 'Đọc đủ 500 phút', 
              current: currentMinutes, target: 500, type: 'time' 
          },
      ];

      // Map lại để thêm thuộc tính isUnlocked
      return badges.map(b => ({
          ...b,
          isUnlocked: b.current >= b.target,
          progressPercent: Math.min(100, (b.current / b.target) * 100)
      }));
  };
  const badges = calculateBadges();

  // --- 3. THỐNG KÊ CHI TIẾT ---
  const calculateDetailedStats = () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // Tính Streak đơn giản
      let currentStreak = 0;
      if (dailyReadingStats[today] || dailyReadingStats[yesterday]) {
          let checkDate = new Date();
          while (true) {
              const dateStr = checkDate.toISOString().split('T')[0];
              if (dailyReadingStats[dateStr] > 0) {
                  currentStreak++;
                  checkDate.setDate(checkDate.getDate() - 1);
              } else {
                  if (dateStr === today && currentStreak === 0) { checkDate.setDate(checkDate.getDate() - 1); continue; }
                  break;
              }
          }
      }

      let totalWeek = 0;
      const chartData = [];
      const labels = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(now.getDate() - i);
          const k = d.toISOString().split('T')[0];
          const val = dailyReadingStats[k] || 0;
          totalWeek += val;
          chartData.push(val);
          labels.push(`${d.getDate()}/${d.getMonth()+1}`);
      }
      
      return { streak: currentStreak, avgDaily: Math.round(totalMinutesRead / (Object.keys(dailyReadingStats).length || 1)), totalWeek, chartData, labels };
  };
  const stats = calculateDetailedStats();

  // --- ACTIONS ---
  const handleBackup = async () => {
      try {
          const state = useBookStore.getState();
          const path = FileSystem.documentDirectory + 'BookKeeper_Backup.json';
          await FileSystem.writeAsStringAsync(path, JSON.stringify({ ...state, createdAt: new Date().toISOString() }), { encoding: 'utf8' });
          if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
      } catch (e) { Alert.alert("Lỗi", e.message); }
  };

  const handleRestore = async () => {
      try {
          const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
          if (!result.canceled) {
              const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' });
              const data = JSON.parse(content);
              if (data.books && restoreData) { restoreData(data); Alert.alert("Thành công!"); }
          }
      } catch (e) { Alert.alert("Lỗi", e.message); }
  };

  // --- SETTINGS ---
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const toggleSwitch = () => setReminder(!isReminderEnabled, { hour: date.getHours(), minute: date.getMinutes() });
  const onChangeTime = (e, d) => { if(Platform.OS==='android') setShowPicker(false); if(d) { setDate(d); setReminder(isReminderEnabled, { hour: d.getHours(), minute: d.getMinutes() }); } };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* RANK CARD */}
      <View style={styles.rankCard}>
          <View style={styles.rankHeader}>
              <View>
                  <Text style={styles.rankLabel}>DANH HIỆU CỦA BẠN</Text>
                  <Text style={styles.rankTitle}>{currentRank.title}</Text>
                  <Text style={styles.rankTotal}>EXP: {totalMinutesRead} phút</Text>
              </View>
              <Text style={styles.rankIcon}>{currentRank.icon}</Text>
          </View>
          <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.rankNextGoal}>{nextGoalText}</Text>
      </View>

      {/* STATS GRID */}
      <View style={styles.statsGrid}>
          <View style={styles.statItem}><Text style={styles.statVal}>{books.length}</Text><Text style={styles.statLabel}>Sách</Text></View>
          <View style={styles.statItem}><Text style={styles.statVal}>{stats.streak} 🔥</Text><Text style={styles.statLabel}>Chuỗi</Text></View>
          <View style={styles.statItem}><Text style={styles.statVal}>{formatTime(stats.totalWeek)}</Text><Text style={styles.statLabel}>Tuần này</Text></View>
          <View style={styles.statItem}><Text style={styles.statVal}>{stats.avgDaily}p</Text><Text style={styles.statLabel}>TB/Ngày</Text></View>
      </View>

      {/* 🔥 BADGES LIST (HIỂN THỊ TIẾN ĐỘ THẬT) */}
      <Text style={styles.sectionHeader}>Thành Tích & Nhiệm Vụ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
         {badges.map(badge => (
             <View key={badge.id} style={[styles.badgeCard, !badge.isUnlocked && styles.badgeLocked]}>
                 <View style={styles.badgeIconContainer}>
                    <Text style={{fontSize: 28}}>{badge.isUnlocked ? badge.icon : '🔒'}</Text>
                 </View>
                 
                 <Text style={styles.badgeName}>{badge.name}</Text>
                 
                 {/* 👇 DÒNG NÀY SẼ CHỨNG MINH DỮ LIỆU LÀ THẬT */}
                 <Text style={styles.badgeProgress}>
                    {badge.type === 'book' ? `${badge.current}/${badge.target} cuốn` : `${badge.current}/${badge.target} phút`}
                 </Text>

                 {/* Thanh tiến độ nhỏ bên dưới mỗi badge */}
                 <View style={styles.miniProgressBg}>
                    <View style={[styles.miniProgressFill, { width: `${badge.progressPercent}%`, backgroundColor: badge.isUnlocked ? '#34C759' : '#FF9500' }]} />
                 </View>
             </View>
         ))}
      </ScrollView>

      {/* CHART */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartHeader}>Biểu đồ tuần</Text>
        <BarChart
            data={{ labels: stats.labels, datasets: [{ data: stats.chartData }] }}
            width={screenWidth - 40} height={180} yAxisLabel="" yAxisSuffix="" 
            chartConfig={{
                backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
                decimalPlaces: 0, color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: () => `#555`, barPercentage: 0.5,
            }}
            style={{ borderRadius: 16 }} showValuesOnTopOfBars={true}
        />
      </View>

      {/* ACTIONS & SETTINGS */}
      <Text style={styles.sectionHeader}>Hệ Thống</Text>
      <View style={styles.backupRow}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#e8f5e9'}]} onPress={handleBackup}>
              <Text style={{fontSize:20}}>☁️</Text><Text style={[styles.actionText, {color:'green'}]}>Sao Lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#fff3e0'}]} onPress={handleRestore}>
              <Text style={{fontSize:20}}>⚡</Text><Text style={[styles.actionText, {color:'orange'}]}>Khôi Phục</Text>
          </TouchableOpacity>
      </View>
      
      <View style={styles.settingBox}>
        <View style={styles.rowBetween}>
            <Text style={styles.settingTitle}>⏰ Nhắc nhở hằng ngày</Text>
            <Switch onValueChange={toggleSwitch} value={isReminderEnabled} trackColor={{true: "#34C759"}} />
        </View>
        {isReminderEnabled && <TouchableOpacity onPress={()=>setShowPicker(true)}><Text style={{color:'#007AFF', marginTop:5}}>Chỉnh giờ: {date.getHours()}:{date.getMinutes()}</Text></TouchableOpacity>}
        {showPicker && Platform.OS==='android' && <DateTimePicker value={date} mode="time" is24Hour={true} onChange={onChangeTime} />}
      </View>

      <View style={{height: 50}}/>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7', padding: 15 },
  
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

  // 🔥 BADGE CARD STYLES (Đã update để hiện progress)
  badgeScroll: { marginBottom: 25 },
  badgeCard: { backgroundColor: '#fff', padding: 10, borderRadius: 12, marginRight: 10, alignItems: 'center', width: 110, height: 130, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
  badgeLocked: { opacity: 0.6, backgroundColor: '#ececec' },
  badgeIconContainer: { marginBottom: 5 },
  badgeName: { fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: 2 },
  badgeProgress: { fontSize: 10, color: '#666', marginBottom: 5 }, // Hiển thị số 1/5
  miniProgressBg: { width: '80%', height: 4, backgroundColor: '#eee', borderRadius: 2 },
  miniProgressFill: { height: '100%', borderRadius: 2 },

  chartContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 25 },
  chartHeader: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  backupRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  actionBtn: { width: '48%', padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  actionText: { fontWeight: 'bold', marginLeft: 8 },
  settingBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingTitle: { fontSize: 16, fontWeight: '500' },
});

export default DashboardScreen;