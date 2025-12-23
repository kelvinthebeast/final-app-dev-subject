import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, 
  TextInput, Modal, Alert, SafeAreaView, Platform, KeyboardAvoidingView, StatusBar 
} from 'react-native';
import useBookStore from '../store/useBookStore';

const HomeScreen = ({ navigation }) => {
  const { books, readingGoal, setReadingGoal, initData } = useBookStore();
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [tempGoal, setTempGoal] = useState(''); 

  useEffect(() => {
    setTimeout(() => { initData(); }, 100);
  }, []);

  const finishedBooks = books.filter(b => b.status === 'finished').length;
  const safeGoal = readingGoal || 1; 
  const progressPercent = Math.min((finishedBooks / safeGoal) * 100, 100);

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchText.toLowerCase()) || 
    book.author.toLowerCase().includes(searchText.toLowerCase())
  );

  const openGoalModal = () => {
    setTempGoal(readingGoal.toString());
    setModalVisible(true);
  };

  const handleSaveGoal = () => {
    const newGoal = parseInt(tempGoal);
    if (isNaN(newGoal) || newGoal <= 0) {
        Alert.alert("Lỗi", "Vui lòng nhập số lớn hơn 0");
        return;
    }
    setReadingGoal(newGoal); 
    setModalVisible(false);  
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <View style={styles.coverPlaceholder}>
        {item.coverUri && item.coverUri.includes('http') ? (
          <Image source={{ uri: item.coverUri }} style={styles.coverImage} />
        ) : (
          <Text style={styles.coverText}>{item.title.charAt(0)}</Text>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
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
    // 1. Dùng SafeAreaView để tránh tai thỏ (iPhone 12+) và Status bar
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      
        {/* Header Content */}
        <View style={styles.headerContainer}>
            {/* GOAL SECTION */}
            <TouchableOpacity activeOpacity={0.8} onPress={openGoalModal}>
                <View style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <Text style={styles.goalTitle}>🎯 Mục tiêu <Text style={styles.editLink}>(Sửa)</Text></Text>
                        <Text style={styles.goalCount}>{finishedBooks}/{safeGoal}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                    </View>
                    <Text style={styles.goalSub}>
                        {progressPercent === 100 ? '🎉 Xuất sắc!' : 'Tiếp tục cố gắng nhé!'}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* STATS BUTTON */}
            <TouchableOpacity 
                style={styles.statsButton}
                onPress={() => navigation.navigate('Dashboard')}
            >
                <Text style={styles.statsText}>📊 Xem Thống Kê & Cài Đặt</Text>
            </TouchableOpacity>

            {/* SEARCH BAR */}
            <View style={styles.searchContainer}>
                <TextInput 
                    style={styles.searchInput}
                    placeholder="🔍 Tìm tên sách, tác giả..."
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>
        </View>

        {/* LIST */}
        <FlatList
            data={filteredBooks}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            // 2. Padding bottom lớn để không bị nút FAB che mất sách cuối cùng
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Chưa có sách nào.</Text>
                    <Text style={styles.emptySub}>Bấm dấu + để thêm sách mới</Text>
                </View>
            }
        />

        {/* 3. FAB Button - Vị trí tuyệt đối an toàn */}
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddBook')}>
            <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {/* MODAL */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            {/* 4. KeyboardAvoidingView để bàn phím không che Modal trên iPhone nhỏ */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Đặt mục tiêu 📚</Text>
                    <Text style={styles.modalSub}>Số lượng sách muốn đọc năm nay?</Text>
                    
                    <TextInput 
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={tempGoal}
                        onChangeText={setTempGoal}
                        autoFocus={true}
                        selectTextOnFocus={true}
                    />

                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Huỷ</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveGoal}>
                            <Text style={styles.saveText}>Lưu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Responsive Container
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Xử lý status bar Android
  },
  container: { flex: 1 },

  // Header Group (Để padding thống nhất)
  headerContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
  },

  // Goal Card
  goalCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, // Shadow cho iOS
    marginBottom: 10,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  goalTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  editLink: { fontSize: 12, color: '#007AFF', fontWeight: 'normal' },
  goalCount: { fontWeight: 'bold', color: '#007AFF', fontSize: 16 },
  progressBarBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 4 },
  goalSub: { fontSize: 12, color: '#888', fontStyle: 'italic' },

  // Stats Button
  statsButton: {
      backgroundColor: '#fff',
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e0e0e0',
      marginBottom: 10,
  },
  statsText: { color: '#007AFF', fontWeight: '600', fontSize: 14 },

  // Search
  searchContainer: { marginBottom: 5 },
  searchInput: { 
      backgroundColor: '#fff', 
      padding: 12, 
      borderRadius: 10, 
      borderWidth: 1, 
      borderColor: '#e0e0e0',
      fontSize: 15,
  },
  
  // List
  listContent: { 
      paddingHorizontal: 15, 
      paddingTop: 5,
      paddingBottom: 100, // QUAN TRỌNG: Để khoảng trống cho FAB không che sách cuối
  },
  card: { 
      flexDirection: 'row', 
      backgroundColor: '#fff', 
      marginBottom: 12, 
      borderRadius: 12, 
      padding: 10, 
      elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
  },
  coverPlaceholder: { 
      width: 65, height: 95, 
      backgroundColor: '#eee', 
      borderRadius: 8, 
      justifyContent: 'center', alignItems: 'center', 
      marginRight: 15,
      overflow: 'hidden' // Bo tròn ảnh
  },
  coverImage: { width: '100%', height: '100%' },
  coverText: { fontSize: 28, fontWeight: 'bold', color: '#aaa' },
  info: { flex: 1, justifyContent: 'center' },
  bookTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#333' },
  bookAuthor: { fontSize: 14, color: '#666', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookCategory: { fontSize: 12, color: '#007AFF', backgroundColor: '#eef6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  doneTag: { fontSize: 10, color: 'green', backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', marginLeft: 5 },
  readTime: { fontSize: 11, color: '#FF9500', marginTop: 6 },
  
  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#333', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  emptySub: { color: '#999', fontSize: 14 },
  
  // FAB
  fab: { 
      position: 'absolute', 
      right: 20, 
      bottom: 20, // Khoảng cách từ đáy màn hình an toàn
      width: 56, height: 56, 
      borderRadius: 28, 
      backgroundColor: '#007AFF', 
      justifyContent: 'center', alignItems: 'center', 
      elevation: 6,
      shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
  },
  fabText: { fontSize: 32, color: '#fff', marginTop: -3 },

  // Modal Responsive
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
      width: '85%', // Dùng % thay vì fix cứng width
      maxWidth: 400, // Giới hạn trên iPad
      backgroundColor: '#fff', 
      borderRadius: 16, 
      padding: 24, 
      alignItems: 'center', 
      elevation: 5 
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  modalSub: { color: '#666', marginBottom: 20, textAlign: 'center' },
  modalInput: { 
      width: '100%', 
      borderWidth: 1, borderColor: '#ddd', borderRadius: 10, 
      padding: 12, fontSize: 18, textAlign: 'center', 
      marginBottom: 20, backgroundColor: '#f9f9f9' 
  },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', marginHorizontal: 6 },
  cancelBtn: { backgroundColor: '#f0f0f0' },
  saveBtn: { backgroundColor: '#007AFF' },
  cancelText: { color: '#333', fontWeight: '600' },
  saveText: { color: '#fff', fontWeight: 'bold' }
});

export default HomeScreen;