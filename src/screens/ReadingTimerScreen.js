import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake'; // Giữ màn hình luôn sáng
import useBookStore from '../store/useBookStore';

const ReadingTimerScreen = ({ route, navigation }) => {
  useKeepAwake(); // Kích hoạt chế độ không tắt màn hình
  
  const { bookId } = route.params;
  const { addReadingSession, books } = useBookStore();
  const book = books.find(b => b.id === bookId);

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Logic đồng hồ đếm
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (!isRunning && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, seconds]);

  // Format thời gian (Giây -> MM:SS)
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleStop = () => {
    setIsRunning(false);
    // Tính số phút (làm tròn lên)
    const minutes = Math.ceil(seconds / 60);
    
    Alert.alert(
      "Hoàn thành phiên đọc",
      `Bạn đã đọc được ${minutes} phút. Ghi lại nhé?`,
      [
        { text: "Huỷ", style: "cancel" },
        { 
          text: "Ghi lại", 
          onPress: () => {
            addReadingSession(bookId, minutes);
            navigation.goBack();
          } 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.bookTitle}>Đang đọc: {book?.title}</Text>
      
      {/* Đồng hồ */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(seconds)}</Text>
      </View>

      <Text style={styles.subText}>Hãy tập trung đọc sách...</Text>

      {/* Các nút điều khiển */}
      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity style={[styles.btn, styles.startBtn]} onPress={() => setIsRunning(true)}>
            <Text style={styles.btnText}>{seconds === 0 ? "BẮT ĐẦU" : "TIẾP TỤC"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.pauseBtn]} onPress={() => setIsRunning(false)}>
            <Text style={styles.btnText}>TẠM DỪNG</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.btn, styles.stopBtn]} onPress={handleStop}>
          <Text style={[styles.btnText, styles.stopText]}>KẾT THÚC</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  bookTitle: { color: '#aaa', fontSize: 18, marginBottom: 40, marginTop: -50 },
  timerContainer: { 
    borderWidth: 4, borderColor: '#007AFF', width: 250, height: 250, borderRadius: 125,
    justifyContent: 'center', alignItems: 'center', marginBottom: 40
  },
  timerText: { color: '#fff', fontSize: 60, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  subText: { color: '#666', marginBottom: 40, fontStyle: 'italic' },
  
  controls: { width: '100%', paddingHorizontal: 40 },
  btn: { padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  startBtn: { backgroundColor: '#007AFF' },
  pauseBtn: { backgroundColor: '#FF9500' },
  stopBtn: { backgroundColor: '#333' },
  
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  stopText: { color: '#FF3B30' }
});

export default ReadingTimerScreen;