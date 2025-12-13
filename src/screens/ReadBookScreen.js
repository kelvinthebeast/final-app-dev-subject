import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import PagerView from 'react-native-pager-view';
import * as Speech from 'expo-speech'; 
import { useKeepAwake } from 'expo-keep-awake'; // Giữ màn hình sáng khi đọc
import useBookStore from '../store/useBookStore';

const ReadBookScreen = ({ route, navigation }) => {
  useKeepAwake(); // Kích hoạt chế độ không tắt màn hình

  const { bookId } = route.params;
  const { books, addReadingSession } = useBookStore(); // Lấy hàm lưu thời gian
  const book = books.find(b => b.id === bookId);

  // --- STATE ---
  const [fontSize, setFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // --- STATE TIMER ---
  const [secondsRead, setSecondsRead] = useState(0);
  const startTimeRef = useRef(new Date()); // Lưu mốc thời gian bắt đầu vào đọc

  if (!book) return null;

  const bgStyle = isDarkMode ? '#1a1a1a' : '#fff';
  const textStyle = isDarkMode ? '#ddd' : '#222';

  // --- 1. LOGIC TỰ ĐỘNG ĐẾM GIỜ ---
  useEffect(() => {
    // Tạo bộ đếm mỗi giây tăng 1 lần để hiển thị cho vui mắt
    const timer = setInterval(() => {
      setSecondsRead(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // --- 2. LOGIC LƯU KHI THOÁT ---
  const handleGoBack = () => {
    Speech.stop(); // Tắt giọng đọc nếu có

    // Tính tổng thời gian thực tế (Lấy giờ hiện tại - giờ bắt đầu)
    // Cách này chính xác hơn là đếm giây bằng interval
    const endTime = new Date();
    const durationInSeconds = (endTime - startTimeRef.current) / 1000;
    const minutes = Math.ceil(durationInSeconds / 60); // Làm tròn lên phút

    if (minutes > 0) {
      // Lưu vào Store
      addReadingSession(book.id, minutes);
      
      // Thông báo nhẹ (hoặc có thể bỏ đi cho mượt)
      // Alert.alert("Lưu tiến độ", `Bạn đã đọc được ${minutes} phút.`);
    }

    navigation.goBack();
  };

  // Format giây thành MM:SS để hiển thị
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- THUẬT TOÁN CẮT TRANG (GIỮ NGUYÊN) ---
  const pages = useMemo(() => {
    if (!book.content) return ["Không có nội dung."];
    const paragraphs = book.content.split('\n');
    let generatedPages = [];
    let currentPageContent = '';
    const CHAR_LIMIT = fontSize > 20 ? 600 : 900; 

    paragraphs.forEach((para) => {
      if ((currentPageContent.length + para.length) < CHAR_LIMIT) {
        currentPageContent += para + '\n';
      } else {
        if (currentPageContent.trim().length > 0) generatedPages.push(currentPageContent);
        currentPageContent = para + '\n';
      }
    });
    if (currentPageContent.trim().length > 0) generatedPages.push(currentPageContent);
    return generatedPages.length > 0 ? generatedPages : ["Nội dung quá ngắn."];
  }, [book.content, fontSize]); 

  // --- LOGIC GIỌNG ĐỌC ---
  const toggleSpeech = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Speech.speak(pages[currentPage], {
        language: 'vi-VN', pitch: 1.0, rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };

  useEffect(() => {
      if(isSpeaking) { Speech.stop(); setIsSpeaking(false); }
  }, [currentPage]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgStyle }}>
      
      {/* TOOLBAR */}
      <View style={[styles.toolbar, { borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
        {/* Nút thoát thay bằng handleGoBack để lưu giờ */}
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text>
        </TouchableOpacity>

        {/* HIỂN THỊ ĐỒNG HỒ NHỎ Ở GIỮA */}
        <View style={styles.timerTag}>
            <Text style={[styles.timerText, {color: isDarkMode ? '#888' : '#666'}]}>
                ⏱️ {formatTime(secondsRead)}
            </Text>
        </View>

        <View style={styles.settings}>
            <TouchableOpacity onPress={toggleSpeech} style={[styles.btn, isSpeaking && styles.speakingBtn]}>
                <Text style={styles.btnIcon}>{isSpeaking ? '⏹️' : '🔊'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setFontSize(Math.max(14, fontSize - 2))} style={styles.btn}>
                <Text style={[styles.btnText, { color: textStyle }]}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFontSize(Math.min(30, fontSize + 2))} style={styles.btn}>
                <Text style={[styles.btnText, { color: textStyle }]}>A+</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={[styles.btn, styles.themeBtn]}>
                <Text style={styles.themeText}>{isDarkMode ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* PAGER VIEW */}
      <PagerView 
        style={styles.pagerView} 
        initialPage={0} 
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {pages.map((pageContent, index) => (
          <View key={index} style={styles.pageContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={[styles.content, { fontSize: fontSize, color: textStyle, lineHeight: fontSize * 1.6 }]}>
                  {pageContent}
                </Text>
                <View style={{height: 50}}/> 
            </ScrollView>
          </View>
        ))}
      </PagerView>

      {/* FOOTER */}
      <View style={[styles.footer, { backgroundColor: bgStyle, borderTopColor: isDarkMode ? '#333' : '#eee' }]}>
         <Text style={{ color: '#888', fontSize: 12 }}>
            Trang {currentPage + 1} / {pages.length}
         </Text>
         <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${((currentPage + 1) / pages.length) * 100}%` }]} />
         </View>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  toolbar: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 10, borderBottomWidth: 1, paddingTop: 40 
  },
  backBtn: { padding: 5, width: 60 },
  
  // Style cho đồng hồ nhỏ
  timerTag: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timerText: { fontSize: 12, fontWeight: 'bold', fontVariant: ['tabular-nums'] },

  settings: { flexDirection: 'row', alignItems: 'center' },
  btn: { marginHorizontal: 2, padding: 5 },
  speakingBtn: { backgroundColor: '#ffebee', borderRadius: 5 },
  btnIcon: { fontSize: 18 },
  btnText: { fontSize: 18, fontWeight: 'bold' },
  themeBtn: { backgroundColor: '#eee', borderRadius: 15, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  themeText: { fontSize: 14 },
  
  pagerView: { flex: 1 },
  pageContainer: { padding: 20, flex: 1 },
  
  bookTitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase' },
  content: { textAlign: 'justify' },

  footer: { 
    height: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, borderTopWidth: 1
  },
  progressBarBg: { width: 100, height: 4, backgroundColor: '#eee', borderRadius: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 }
});

export default ReadBookScreen;