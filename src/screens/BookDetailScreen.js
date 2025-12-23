import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, 
  TextInput, Alert, Dimensions 
} from 'react-native';
import useBookStore from '../store/useBookStore';

const { width } = Dimensions.get('window');

const BookDetailScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const { books, updateBook, removeBook } = useBookStore();
  const book = books.find(b => b.id === bookId);

  // --- Header Action: Nút Sửa ---
  useEffect(() => {
    if (book) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('AddBook', { bookToEdit: book })} style={{paddingRight: 10}}>
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Sửa</Text>
          </TouchableOpacity>
        ),
        headerTitle: '' // Ẩn tiêu đề mặc định cho gọn
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
    Alert.alert("Xác nhận xoá", "Bạn có chắc muốn xóa cuốn sách này khỏi thư viện?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => { removeBook(book.id); navigation.goBack(); } }
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. HEADER SECTION (Bìa + Thông tin chính) */}
      <View style={styles.header}>
        <View style={styles.coverShadow}>
             {book.coverUri ? (
                <Image source={{ uri: book.coverUri }} style={styles.cover} resizeMode="cover" />
            ) : (
                <View style={[styles.cover, styles.placeholder]}>
                    <Text style={{fontSize: 40}}>{book.title[0]}</Text>
                </View>
            )}
        </View>

        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
        
        <View style={styles.metaRow}>
             <View style={styles.badge}>
                <Text style={styles.badgeText}>{book.category || 'Khác'}</Text>
             </View>
             {/* Hiển thị loại file nếu có */}
             {book.fileType && (
                 <View style={[styles.badge, {backgroundColor: '#fff3e0', marginLeft: 8}]}>
                    <Text style={[styles.badgeText, {color: '#f57c00'}]}>{book.fileType.toUpperCase()}</Text>
                 </View>
             )}
        </View>

        <TouchableOpacity 
          style={[styles.statusButton, book.status === 'finished' ? styles.statusDone : styles.statusReading]}
          onPress={toggleStatus}
        >
          <Text style={[styles.statusText, book.status === 'finished' && {color: 'green'}]}>
            {book.status === 'finished' ? '✅ Đã hoàn thành' : '📖 Đang đọc'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. MAIN ACTION (Nút Đọc) */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
            style={styles.readBtn}
            onPress={() => navigation.navigate('ReadBook', { bookId: book.id })}
            activeOpacity={0.8}
        >
            <Text style={styles.readBtnText}>
                {book.fileType ? 'MỞ FILE ĐỂ ĐỌC' : 'ĐỌC NGAY'}
            </Text>
            <Text style={styles.readBtnSub}>
                {book.lastPageRead && book.lastPageRead > 0
                  ? `Tiếp tục tại Trang ${book.lastPageRead + 1}`
                  : `Bắt đầu hành trình mới`}
            </Text>
        </TouchableOpacity>

        {/* THỐNG KÊ NHANH */}
        <View style={styles.statsCard}>
            <View style={styles.statItem}>
                <Text style={styles.statEmoji}>⏳</Text>
                <View>
                    <Text style={styles.statNum}>{book.minutesRead || 0}p</Text>
                    <Text style={styles.statLabel}>Thời gian</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🔥</Text>
                <View>
                    <Text style={styles.statNum}>{book.sessions || 0}</Text>
                    <Text style={styles.statLabel}>Số lần mở</Text>
                </View>
            </View>
        </View>
      </View>

      {/* 3. CONTENT & RATING */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Đánh giá</Text>
        <View style={styles.ratingBox}>
             <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => updateBook(book.id, { rating: star })}>
                    <Text style={[styles.star, star <= book.rating ? styles.starGold : styles.starGray]}>★</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.ratingText}>{book.rating > 0 ? `${book.rating}/5 sao` : 'Chạm để đánh giá'}</Text>
        </View>
      </View>

      {/* 4. NOTES */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Ghi chú cá nhân</Text>
        <TextInput
          style={styles.noteInput}
          multiline
          placeholder="Viết cảm nhận hoặc trích dẫn hay..."
          value={note}
          onChangeText={setNote}
          onBlur={() => updateBook(book.id, { notes: note })}
        />
      </View>

      {/* 5. DELETE */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteText}>Xoá sách khỏi thư viện</Text>
      </TouchableOpacity>
      
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  // HEADER
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#fdfdfd' },
  coverShadow: { 
      shadowColor: "#000", shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10,
      marginBottom: 20 
  },
  cover: { width: 130, height: 195, borderRadius: 10 },
  placeholder: { backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center' },
  
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginHorizontal: 20, color: '#222' },
  author: { fontSize: 16, color: '#666', marginTop: 5, fontWeight: '500' },
  
  metaRow: { flexDirection: 'row', marginTop: 10 },
  badge: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#555', fontWeight: '600' },
  
  statusButton: { marginTop: 15, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  statusReading: { backgroundColor: '#e3f2fd' },
  statusDone: { backgroundColor: '#e8f5e9' },
  statusText: { fontSize: 13, fontWeight: 'bold', color: '#007AFF' },

  // ACTIONS
  actionSection: { padding: 20, marginTop: -20 },
  readBtn: { 
    backgroundColor: '#007AFF', paddingVertical: 18, borderRadius: 16, 
    alignItems: 'center', 
    shadowColor: '#007AFF', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, elevation: 5,
    marginBottom: 20
  },
  readBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  readBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  statsCard: {
      flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15,
      borderWidth: 1, borderColor: '#f0f0f0',
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.03, elevation: 2
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statEmoji: { fontSize: 24, marginRight: 10 },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#888' },
  divider: { width: 1, height: '80%', backgroundColor: '#eee', alignSelf: 'center' },

  // CONTENT
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  
  ratingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafafa', padding: 15, borderRadius: 12 },
  stars: { flexDirection: 'row' },
  star: { fontSize: 32, marginRight: 5 },
  starGold: { color: '#FFD700' },
  starGray: { color: '#e0e0e0' },
  ratingText: { color: '#888', fontWeight: '600' },

  noteInput: { 
      backgroundColor: '#fdfdfd', height: 120, borderRadius: 12, padding: 15, 
      textAlignVertical: 'top', fontSize: 16, color: '#333',
      borderWidth: 1, borderColor: '#eee' 
  },

  deleteBtn: { 
      marginHorizontal: 20, padding: 16, borderRadius: 12, alignItems: 'center', 
      backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#ffcccc' 
  },
  deleteText: { color: '#d32f2f', fontWeight: 'bold' }
});

export default BookDetailScreen;