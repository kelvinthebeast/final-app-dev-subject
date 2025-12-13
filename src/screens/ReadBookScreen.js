import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import PagerView from 'react-native-pager-view'; // Thư viện lật trang
import useBookStore from '../store/useBookStore';

const ReadBookScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const { books } = useBookStore();
  const book = books.find(b => b.id === bookId);

  // --- STATE ---
  const [fontSize, setFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // Trang hiện tại (Bắt đầu từ 0)

  if (!book) return null;

  const bgStyle = isDarkMode ? '#1a1a1a' : '#fff';
  const textStyle = isDarkMode ? '#ddd' : '#222';

  // --- THUẬT TOÁN TỰ ĐỘNG CẮT TRANG ---
  // Sử dụng useMemo để chỉ tính toán lại khi nội dung hoặc cỡ chữ thay đổi
  const pages = useMemo(() => {
    if (!book.content) return ["Không có nội dung."];
    
    // Logic: Cắt theo đoạn văn (xuống dòng) để tránh đứt chữ
    const paragraphs = book.content.split('\n');
    let generatedPages = [];
    let currentPageContent = '';
    
    // Ước lượng giới hạn ký tự mỗi trang (Tùy cỡ chữ mà chứa được nhiều hay ít)
    // Cỡ chữ càng to -> Chứa càng ít ký tự
    const CHAR_LIMIT = fontSize > 20 ? 600 : 900; 

    paragraphs.forEach((para) => {
      // Nếu cộng thêm đoạn này mà vẫn nhỏ hơn giới hạn -> Gộp vào trang hiện tại
      if ((currentPageContent.length + para.length) < CHAR_LIMIT) {
        currentPageContent += para + '\n';
      } else {
        // Nếu dài quá -> Đẩy trang cũ vào mảng -> Tạo trang mới
        if (currentPageContent.trim().length > 0) {
            generatedPages.push(currentPageContent);
        }
        currentPageContent = para + '\n';
      }
    });

    // Đẩy trang cuối cùng vào
    if (currentPageContent.trim().length > 0) {
      generatedPages.push(currentPageContent);
    }

    return generatedPages.length > 0 ? generatedPages : ["Nội dung quá ngắn."];
  }, [book.content, fontSize]); 
  // Chú ý: Khi đổi fontSize, số lượng trang sẽ thay đổi

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgStyle }}>
      
      {/* 1. HEADER CÔNG CỤ */}
      <View style={[styles.toolbar, { borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Thoát</Text>
        </TouchableOpacity>

        <View style={styles.settings}>
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

      {/* 2. PAGER VIEW (KHUNG LẬT TRANG) */}
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
                {/* Khoảng trống dưới cùng để không bị che bởi số trang */}
                <View style={{height: 50}}/> 
            </ScrollView>
          </View>
        ))}
      </PagerView>

      {/* 3. FOOTER (SỐ TRANG) */}
      <View style={[styles.footer, { backgroundColor: bgStyle, borderTopColor: isDarkMode ? '#333' : '#eee' }]}>
         <Text style={{ color: '#888', fontSize: 12 }}>
            Trang {currentPage + 1} / {pages.length}
         </Text>
         {/* Thanh tiến độ đọc */}
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
    padding: 15, borderBottomWidth: 1, paddingTop: 40 
  },
  settings: { flexDirection: 'row', alignItems: 'center' },
  btn: { marginHorizontal: 8, padding: 5 },
  btnText: { fontSize: 20, fontWeight: 'bold' },
  themeBtn: { backgroundColor: '#eee', borderRadius: 15, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  
  pagerView: { flex: 1 },
  pageContainer: { padding: 20, flex: 1 }, // flex: 1 để chiếm hết khung
  
  bookTitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase' },
  content: { textAlign: 'justify' },

  footer: { 
    height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, borderTopWidth: 1
  },
  progressBarBg: { width: 100, height: 4, backgroundColor: '#eee', borderRadius: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 }
});

export default ReadBookScreen;