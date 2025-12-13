// File: src/screens/BookDetailScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import useBookStore from '../store/useBookStore';

const BookDetailScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const { books, updateBook, removeBook } = useBookStore();
  
  const book = books.find(b => b.id === bookId);

  // --- LOGIC: Thêm nút Sửa lên góc phải Header ---
  useEffect(() => {
    if (book) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('AddBook', { bookToEdit: book })}>
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Sửa</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, book]);

  if (!book) return null;

  const [note, setNote] = useState(book.notes || '');

  const toggleStatus = () => {
    const newStatus = book.status === 'reading' ? 'finished' : 'reading';
    updateBook(book.id, { status: newStatus });
  };

  const handleDelete = () => {
    Alert.alert("Xác nhận xoá", "Hành động này không thể hoàn tác!", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá Vĩnh Viễn", style: "destructive", onPress: () => { removeBook(book.id); navigation.goBack(); } }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 1. HEADER */}
      <View style={styles.header}>
        {book.coverUri ? (
            <Image source={{ uri: book.coverUri }} style={styles.cover} />
        ) : (
            <View style={[styles.cover, styles.placeholder]}><Text style={{fontSize: 40}}>{book.title[0]}</Text></View>
        )}
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
        
        <TouchableOpacity 
          style={[styles.statusBadge, book.status === 'finished' ? styles.statusDone : styles.statusReading]}
          onPress={toggleStatus}
        >
          <Text style={styles.statusText}>
            {book.status === 'finished' ? '✅ Đã hoàn thành' : '📖 Đang đọc'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. ACTIONS & THỐNG KÊ */}
      <View style={styles.actionContainer}>
        {/* Nút Đọc Lớn */}
        <TouchableOpacity 
            style={styles.readBtn}
            onPress={() => navigation.navigate('ReadBook', { bookId: book.id })}
        >
            <Text style={styles.readBtnText}>📖 ĐỌC NGAY</Text>
            <Text style={styles.readBtnSub}>
               {book.lastPageRead !== undefined && book.lastPageRead > 0
                  ? `👉 Tiếp tục tại Trang ${book.lastPageRead + 1}`
                  : `Bắt đầu đọc từ đầu`}
            </Text>
            <Text style={styles.readBtnSub}>Đọc & Tự động ghi giờ</Text>
        </TouchableOpacity>

        {/* Thẻ Thống Kê 2 Cột (MỚI) */}
        <View style={styles.statsGrid}>
            {/* Cột 1: Thời gian */}
            <View style={styles.statItem}>
                <View style={[styles.iconBox, { backgroundColor: '#e3f2fd' }]}>
                    <Text style={{fontSize: 22}}>⏳</Text>
                </View>
                <View>
                    <Text style={styles.statValue}>{book.minutesRead || 0} phút</Text>
                    <Text style={styles.statLabel}>Đã nghiền ngẫm</Text>
                </View>
            </View>

            {/* Đường kẻ dọc */}
            <View style={styles.verticalLine} />

            {/* Cột 2: Số lần mở sách */}
            <View style={styles.statItem}>
                 <View style={[styles.iconBox, { backgroundColor: '#fff3e0' }]}>
                    <Text style={{fontSize: 22}}>🔥</Text>
                </View>
                <View>
                    <Text style={styles.statValue}>{book.sessions || 0} lần</Text>
                    <Text style={styles.statLabel}>Số lần mở sách</Text>
                </View>
            </View>
        </View>
      </View>

      {/* 3. RATINGS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => updateBook(book.id, { rating: star })}>
              <Text style={[styles.star, star <= book.rating ? styles.starGold : styles.starGray]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 4. NOTES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ghi chú / Review</Text>
        <TextInput
          style={styles.noteInput}
          multiline
          placeholder="Viết cảm nhận của bạn về cuốn sách này..."
          value={note}
          onChangeText={setNote}
          onBlur={() => updateBook(book.id, { notes: note })}
        />
      </View>

      {/* 5. DELETE BUTTON */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteText}>Xoá sách khỏi thư viện</Text>
      </TouchableOpacity>
      
      <View style={{height: 50}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  cover: { width: 110, height: 165, borderRadius: 8, marginBottom: 15, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.2, shadowRadius: 5 },
  placeholder: { backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 5, color: '#333' },
  author: { fontSize: 16, color: '#666', marginBottom: 10, fontWeight: '500' },
  
  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 5 },
  statusReading: { backgroundColor: '#e3f2fd' },
  statusDone: { backgroundColor: '#e8f5e9' },
  statusText: { fontWeight: '700', color: '#444', fontSize: 12 },

  actionContainer: { padding: 20 },
  readBtn: { 
    backgroundColor: '#007AFF', padding: 16, borderRadius: 14, 
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#007AFF', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, elevation: 4
  },
  readBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  readBtnSub: { color: '#d0e3ff', fontSize: 12, marginTop: 2 },

  // --- STYLE MỚI CHO GRID THỐNG KÊ ---
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    // Tạo hiệu ứng thẻ nổi (Card)
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    borderWidth: 1, borderColor: '#f0f0f0'
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10
  },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  verticalLine: { width: 1, height: '80%', backgroundColor: '#eee', alignSelf: 'center', marginHorizontal: 5 },
  // ------------------------------------

  section: { paddingHorizontal: 20, marginTop: 25 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, color: '#333', textTransform: 'uppercase', letterSpacing: 0.5 },
  stars: { flexDirection: 'row' },
  star: { fontSize: 36, marginRight: 8 },
  starGold: { color: '#FFD700' },
  starGray: { color: '#e0e0e0' },
  noteInput: { backgroundColor: '#f9f9f9', height: 120, borderRadius: 12, padding: 15, textAlignVertical: 'top', fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  
  deleteBtn: { margin: 20, marginTop: 40, backgroundColor: '#fff0f0', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ffcccc' },
  deleteText: { color: '#d32f2f', fontWeight: 'bold' }
});

export default BookDetailScreen;