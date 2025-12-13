// File: src/screens/HomeScreen.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import useBookStore from '../store/useBookStore';

const HomeScreen = ({ navigation }) => {
  const { books, removeBook } = useBookStore();

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <View style={styles.coverPlaceholder}>
        {item.coverUri ? (
          <Image source={{ uri: item.coverUri }} style={{ width: 60, height: 90, borderRadius: 5 }} />
        ) : (
          <Text style={styles.coverText}>{item.title.charAt(0)}</Text>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
        <Text style={styles.bookCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thư viện ({books.length})</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddBook')}>
            <Text style={styles.addText}>+ Thêm Mới</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có sách nào.</Text>
            <Text style={styles.emptySubText}>Bấm nút '+ Thêm Mới' ở góc phải để bắt đầu.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  addText: { color: '#007AFF', fontWeight: '600', fontSize: 16 },
  listContent: { padding: 15 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', marginBottom: 15,
    borderRadius: 10, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3
  },
  coverPlaceholder: {
    width: 60, height: 90, backgroundColor: '#ddd', borderRadius: 5,
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  coverText: { fontSize: 24, fontWeight: 'bold', color: '#888' },
  info: { flex: 1, justifyContent: 'center' },
  bookTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  bookAuthor: { fontSize: 14, color: '#666' },
  bookCategory: { fontSize: 12, color: '#007AFF', marginTop: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptySubText: { color: '#666', marginTop: 10 }
});

export default HomeScreen;