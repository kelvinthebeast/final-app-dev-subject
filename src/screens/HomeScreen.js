import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput } from 'react-native';
import useBookStore from '../store/useBookStore';

const HomeScreen = ({ navigation }) => {
  // 1. Lấy dữ liệu và hàm từ Store
  const { books, readingGoal, initData, resetStore } = useBookStore();
  const [searchText, setSearchText] = useState('');

  // 2. Kích hoạt nạp dữ liệu JSON khi mở màn hình
  useEffect(() => {
    // Mẹo nhỏ: Reset trước để xóa dữ liệu rác cũ, sau đó mới nạp JSON mới
    // Sau khi chạy thành công lần đầu, bạn có thể comment dòng resetStore() lại
    // resetStore(); 
    
    setTimeout(() => {
        initData();
    }, 100);
  }, []);

  // 3. Tính toán thống kê
  const finishedBooks = books.filter(b => b.status === 'finished').length;
  // Tránh chia cho 0 hoặc null
  const safeGoal = readingGoal || 1; 
  const progressPercent = Math.min((finishedBooks / safeGoal) * 100, 100);

  // 4. Logic tìm kiếm
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchText.toLowerCase()) || 
    book.author.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <View style={styles.coverPlaceholder}>
        {item.coverUri && item.coverUri.includes('http') ? (
          <Image source={{ uri: item.coverUri }} style={{ width: 60, height: 90, borderRadius: 5 }} />
        ) : (
          <Text style={styles.coverText}>{item.title.charAt(0)}</Text>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
        <View style={styles.row}>
            <Text style={styles.bookCategory}>{item.category}</Text>
            {item.status === 'finished' && <Text style={styles.doneTag}>✅ Đã xong</Text>}
        </View>
        {item.minutesRead > 0 && (
            <Text style={styles.readTime}>⏱️ {item.minutesRead} phút</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* SECTION MỤC TIÊU */}
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>🎯 Mục tiêu năm nay</Text>
            <Text style={styles.goalCount}>{finishedBooks}/{safeGoal} cuốn</Text>
        </View>
        <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.goalSub}>
            {progressPercent === 100 ? '🎉 Xuất sắc! Hoàn thành mục tiêu.' : 'Cố lên! Hãy đọc thêm sách nhé.'}
        </Text>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TextInput 
            style={styles.searchInput}
            placeholder="🔍 Tìm sách..."
            value={searchText}
            onChangeText={setSearchText}
        />
      </View>

      {/* LIST */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Đang tải dữ liệu...</Text>
            <Text style={styles.emptySubText}>Nếu không thấy sách, hãy thử reload lại app.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddBook')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  goalCard: { backgroundColor: '#fff', margin: 15, padding: 15, borderRadius: 12, elevation: 2 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  goalTitle: { fontWeight: 'bold', fontSize: 16 },
  goalCount: { fontWeight: 'bold', color: '#007AFF' },
  progressBarBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 4 },
  goalSub: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  searchContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  listContent: { paddingHorizontal: 15, paddingBottom: 80 },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 15, borderRadius: 10, padding: 10, elevation: 2 },
  coverPlaceholder: { width: 60, height: 90, backgroundColor: '#ddd', borderRadius: 5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  coverText: { fontSize: 24, fontWeight: 'bold', color: '#888' },
  info: { flex: 1, justifyContent: 'center' },
  bookTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  bookAuthor: { fontSize: 14, color: '#666' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  bookCategory: { fontSize: 12, color: '#007AFF' },
  doneTag: { fontSize: 10, color: 'green', backgroundColor: '#e8f5e9', padding: 3, borderRadius: 4 },
  readTime: { fontSize: 11, color: '#FF9500', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#888', fontWeight: 'bold' },
  emptySubText: { color: '#aaa', fontSize: 12, marginTop: 5 },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { fontSize: 30, color: '#fff', marginTop: -2 }
});

export default HomeScreen;