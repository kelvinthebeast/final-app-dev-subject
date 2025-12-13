// File: src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput, Modal, Alert } from 'react-native';
import useBookStore from '../store/useBookStore';

const HomeScreen = ({ navigation }) => {
  // 1. Lấy dữ liệu và hàm từ Store
  const { books, readingGoal, setReadingGoal, initData } = useBookStore();
  
  const [searchText, setSearchText] = useState('');
  
  // --- STATE CHO MODAL SỬA MỤC TIÊU ---
  const [modalVisible, setModalVisible] = useState(false);
  const [tempGoal, setTempGoal] = useState(''); // Lưu số tạm thời khi nhập

  // 2. Kích hoạt nạp dữ liệu (Chạy 1 lần)
  useEffect(() => {
    setTimeout(() => {
        initData();
    }, 100);
  }, []);

  // 3. Tính toán thống kê
  const finishedBooks = books.filter(b => b.status === 'finished').length;
  const safeGoal = readingGoal || 1; 
  const progressPercent = Math.min((finishedBooks / safeGoal) * 100, 100);

  // 4. Filter tìm kiếm
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchText.toLowerCase()) || 
    book.author.toLowerCase().includes(searchText.toLowerCase())
  );

  // --- HÀM XỬ LÝ SỬA MỤC TIÊU ---
  const openGoalModal = () => {
    setTempGoal(readingGoal.toString()); // Điền sẵn số cũ
    setModalVisible(true);
  };

  const handleSaveGoal = () => {
    const newGoal = parseInt(tempGoal);
    if (isNaN(newGoal) || newGoal <= 0) {
        Alert.alert("Lỗi", "Vui lòng nhập số lớn hơn 0");
        return;
    }
    setReadingGoal(newGoal); // Lưu vào store
    setModalVisible(false);  // Tắt modal
  };

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
      
      {/* 1. SECTION MỤC TIÊU (Bấm vào để sửa) */}
      <TouchableOpacity activeOpacity={0.8} onPress={openGoalModal}>
        <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>🎯 Mục tiêu năm nay <Text style={{fontSize: 12, color: '#007AFF'}}>(Sửa)</Text></Text>
                <Text style={styles.goalCount}>{finishedBooks}/{safeGoal} cuốn</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.goalSub}>
                {progressPercent === 100 ? '🎉 Xuất sắc! Hoàn thành mục tiêu.' : 'Bấm vào đây để thay đổi mục tiêu đọc sách.'}
            </Text>
        </View>
      </TouchableOpacity>

      {/* 2. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TextInput 
            style={styles.searchInput}
            placeholder="🔍 Tìm sách..."
            value={searchText}
            onChangeText={setSearchText}
        />
      </View>

      {/* 3. LIST */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có sách nào.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddBook')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* --- MODAL NHẬP MỤC TIÊU (Ẩn/Hiện) --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Đặt mục tiêu đọc sách 📚</Text>
                <Text style={styles.modalSub}>Bạn muốn đọc bao nhiêu cuốn năm nay?</Text>
                
                <TextInput 
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={tempGoal}
                    onChangeText={setTempGoal}
                    autoFocus={true}
                />

                <View style={styles.modalButtons}>
                    <TouchableOpacity 
                        style={[styles.modalBtn, styles.cancelBtn]} 
                        onPress={() => setModalVisible(false)}
                    >
                        <Text style={styles.cancelText}>Huỷ</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.modalBtn, styles.saveBtn]} 
                        onPress={handleSaveGoal}
                    >
                        <Text style={styles.saveText}>Lưu Mục Tiêu</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  
  // Goal Card
  goalCard: { backgroundColor: '#fff', margin: 15, padding: 15, borderRadius: 12, elevation: 2 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  goalTitle: { fontWeight: 'bold', fontSize: 16 },
  goalCount: { fontWeight: 'bold', color: '#007AFF' },
  progressBarBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 4 },
  goalSub: { fontSize: 12, color: '#666', fontStyle: 'italic' },

  // Search
  searchContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  
  // List
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
  
  // FAB
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { fontSize: 30, color: '#fff', marginTop: -2 },

  // --- STYLES CHO MODAL ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 15, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalSub: { color: '#666', marginBottom: 15, textAlign: 'center' },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 18, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelBtn: { backgroundColor: '#f5f5f5' },
  saveBtn: { backgroundColor: '#007AFF' },
  cancelText: { color: '#333', fontWeight: 'bold' },
  saveText: { color: '#fff', fontWeight: 'bold' }
});

export default HomeScreen;