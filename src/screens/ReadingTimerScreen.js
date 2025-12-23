import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, 
  Dimensions, Animated, StatusBar 
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake'; 
import useBookStore from '../store/useBookStore';
import LevelUpModal from '../components/LevelUpModal'; // 👇 Import Modal Thăng hạng

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.7;

const ReadingTimerScreen = ({ route, navigation }) => {
  useKeepAwake(); // Giữ màn hình sáng
  
  const { bookId } = route.params;
  const { addReadingSession, books } = useBookStore();
  const book = books.find(b => b.id === bookId);

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // State cho Modal Level Up
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newRankData, setNewRankData] = useState(null);

  // Animation cho vòng tròn thở
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // --- 1. LOGIC ĐỒNG HỒ ---
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);

      // Chạy Animation nhịp thở
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();

    } else {
      clearInterval(interval);
      pulseAnim.setValue(1); // Reset animation khi pause
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // --- 2. FORMAT THỜI GIAN (HH:MM:SS) ---
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- 3. XỬ LÝ KẾT THÚC ---
  const handleStop = () => {
    setIsRunning(false);
    
    // Logic: Nếu đọc dưới 1 phút thì không tính
    if (seconds < 60) {
        Alert.alert("Chưa đủ thời gian", "Bạn cần đọc ít nhất 1 phút để ghi nhận thành tích nhé!", [
            { text: "Đọc tiếp", onPress: () => setIsRunning(true) },
            { text: "Thoát (Không lưu)", style: 'destructive', onPress: () => navigation.goBack() }
        ]);
        return;
    }

    const minutes = Math.ceil(seconds / 60);
    
    Alert.alert(
      "Hoàn thành phiên đọc",
      `Bạn đã đọc được ${minutes} phút. Ghi lại kết quả này nhé?`,
      [
        { text: "Huỷ", style: "cancel" },
        { 
          text: "Ghi lại & Kết thúc", 
          onPress: () => {
            // 👇 Gọi hàm addReadingSession và nhận về Rank (nếu có)
            const achievedRank = addReadingSession(bookId, minutes);
            
            if (achievedRank) {
                // Nếu lên cấp -> Hiện Modal chúc mừng
                setNewRankData(achievedRank);
                setShowLevelUp(true);
            } else {
                // Không lên cấp -> Thoát luôn
                navigation.goBack();
            }
          } 
        }
      ]
    );
  };

  const closeLevelUp = () => {
      setShowLevelUp(false);
      navigation.goBack();
  };

  if (!book) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>ĐANG ĐỌC</Text>
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>
      </View>

      {/* TIMER CIRCLE (CÓ ANIMATION) */}
      <View style={styles.timerWrapper}>
          <Animated.View style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.timerText}>{formatTime(seconds)}</Text>
            <Text style={styles.timerLabel}>thời gian</Text>
          </Animated.View>
      </View>

      {/* CONTROLS */}
      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity 
            style={[styles.btn, styles.startBtn, seconds > 0 && {backgroundColor: '#34C759'}]} 
            onPress={() => setIsRunning(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnIcon}>▶</Text>
            <Text style={styles.btnText}>{seconds === 0 ? "BẮT ĐẦU ĐỌC" : "TIẾP TỤC"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.pauseBtn]} onPress={() => setIsRunning(false)} activeOpacity={0.8}>
             <Text style={styles.btnIcon}>⏸</Text>
             <Text style={styles.btnText}>TẠM DỪNG</Text>
          </TouchableOpacity>
        )}

        {/* Nút Kết thúc chỉ hiện khi đã pause hoặc chưa bắt đầu */}
        {!isRunning && seconds > 0 && (
            <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                <Text style={styles.stopText}>KẾT THÚC PHIÊN ĐỌC</Text>
            </TouchableOpacity>
        )}
        
        {/* Nút Thoát nếu chưa đọc gì */}
        {seconds === 0 && (
             <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>Quay lại</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* 👇 MODAL CHÚC MỪNG LEVEL UP */}
      <LevelUpModal visible={showLevelUp} rank={newRankData} onClose={closeLevelUp} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  
  // Header
  header: { alignItems: 'center', marginTop: 20, paddingHorizontal: 30 },
  headerLabel: { color: '#007AFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  bookTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  bookAuthor: { color: '#666', fontSize: 16 },

  // Timer
  timerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timerCircle: { 
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 5, borderColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1a1a1a',
    shadowColor: "#007AFF", shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10
  },
  timerText: { color: '#fff', fontSize: 50, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  timerLabel: { color: '#666', fontSize: 12, textTransform: 'uppercase', marginTop: 5, letterSpacing: 2 },

  // Controls
  controls: { width: '100%', paddingHorizontal: 30, marginBottom: 30 },
  btn: { 
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      paddingVertical: 18, borderRadius: 16, marginBottom: 15,
      shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, elevation: 5
  },
  startBtn: { backgroundColor: '#007AFF' },
  pauseBtn: { backgroundColor: '#FF9500' },
  
  btnIcon: { color: '#fff', fontSize: 20, marginRight: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  stopBtn: { padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  stopText: { color: '#FF453A', fontWeight: 'bold', fontSize: 14 },

  cancelBtn: { padding: 15, alignItems: 'center', marginTop: 10 },
  cancelText: { color: '#666', fontSize: 16 }
});

export default ReadingTimerScreen;