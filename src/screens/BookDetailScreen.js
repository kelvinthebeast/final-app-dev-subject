import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import useBookStore from '../store/useBookStore';

const BookDetailScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const { books, updateBook, removeBook } = useBookStore();
  
  // Tìm sách trong store
  const book = books.find(b => b.id === bookId);

  // Nếu không tìm thấy (ví dụ vừa xoá xong), return null
  if (!book) return null;

  const [note, setNote] = useState(book.notes || '');

  // Cập nhật trạng thái Đang đọc / Xong
  const toggleStatus = () => {
    const newStatus = book.status === 'reading' ? 'finished' : 'reading';
    updateBook(book.id, { status: newStatus });
  };

  const handleDelete = () => {
    Alert.alert("Xác nhận xoá", "Bạn muốn xoá sách này?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => { removeBook(book.id); navigation.goBack(); } }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 1. HEADER: ẢNH & THÔNG TIN CƠ BẢN */}
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
            {book.status === 'finished' ? '✅ Đã đọc xong' : '📖 Đang đọc'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. KHU VỰC CHỨC NĂNG CHÍNH (QUAN TRỌNG) */}
      <View style={styles.actionContainer}>
        {/* Nút ĐỌC SÁCH - To và Nổi bật nhất */}
        <TouchableOpacity 
            style={styles.readBtn}
            onPress={() => navigation.navigate('ReadBook', { bookId: book.id })}
        >
            <Text style={styles.readBtnText}>📖 ĐỌC NGAY</Text>
            <Text style={styles.readBtnSub}>Xem nội dung text</Text>
        </TouchableOpacity>

        {/* Nút BẤM GIỜ & THỐNG KÊ */}
        <View style={styles.statsRow}>
             <TouchableOpacity 
                style={styles.timerBtn}
                onPress={() => navigation.navigate('ReadingTimer', { bookId: book.id })}
             >
                <Text style={styles.timerText}>⏱️ Bấm giờ</Text>
             </TouchableOpacity>

             <View style={styles.statInfo}>
                <Text style={styles.statVal}>{book.minutesRead || 0}p</Text>
                <Text style={styles.statLabel}>Đã đọc</Text>
             </View>
        </View>
      </View>

      {/* 3. ĐÁNH GIÁ & GHI CHÚ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Đánh giá</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => updateBook(book.id, { rating: star })}>
              <Text style={[styles.star, star <= book.rating ? styles.starGold : styles.starGray]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ghi chú cá nhân</Text>
        <TextInput
          style={styles.noteInput}
          multiline
          placeholder="Viết cảm nhận..."
          value={note}
          onChangeText={setNote}
          onBlur={() => updateBook(book.id, { notes: note })}
        />
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteText}>Xoá sách khỏi thư viện</Text>
      </TouchableOpacity>
      
      <View style={{height: 50}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', padding: 20, paddingBottom: 10 },
  cover: { width: 100, height: 150, borderRadius: 8, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5 },
  placeholder: { backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  author: { fontSize: 16, color: '#666', marginBottom: 5 },
  
  statusBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 5 },
  statusReading: { backgroundColor: '#e3f2fd' },
  statusDone: { backgroundColor: '#e8f5e9' },
  statusText: { fontWeight: '600', color: '#333', fontSize: 12 },

  // STYLE MỚI CHO NÚT BẤM
  actionContainer: { padding: 20 },
  readBtn: { 
    backgroundColor: '#007AFF', padding: 15, borderRadius: 12, 
    alignItems: 'center', marginBottom: 15,
    shadowColor: '#007AFF', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, elevation: 5
  },
  readBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  readBtnSub: { color: '#badaff', fontSize: 12 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 10, borderRadius: 10 },
  timerBtn: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  timerText: { fontWeight: 'bold', color: '#333' },
  statInfo: { flexDirection: 'row', alignItems: 'baseline', paddingRight: 10 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 5 },
  statLabel: { color: '#666', fontSize: 12 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  stars: { flexDirection: 'row' },
  star: { fontSize: 35, marginRight: 5 },
  starGold: { color: '#FFD700' },
  starGray: { color: '#eee' },
  noteInput: { backgroundColor: '#f9f9f9', height: 100, borderRadius: 10, padding: 15, textAlignVertical: 'top', fontSize: 15 },
  deleteBtn: { margin: 20, backgroundColor: '#ffebee', padding: 15, borderRadius: 10, alignItems: 'center' },
  deleteText: { color: 'red', fontWeight: 'bold' }
});

export default BookDetailScreen;