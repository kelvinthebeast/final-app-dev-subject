// File: src/screens/BookDetailScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import useBookStore from '../store/useBookStore';

const BookDetailScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const { books, updateBook, removeBook } = useBookStore();
  const book = books.find(b => b.id === bookId);

  if (!book) return null;

  const [note, setNote] = useState(book.notes || '');

  const toggleStatus = () => {
    updateBook(book.id, { status: book.status === 'reading' ? 'finished' : 'reading' });
  };

  const handleDelete = () => {
    Alert.alert("Xác nhận xoá", "Bạn muốn xoá sách này?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => { removeBook(book.id); navigation.goBack(); } }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {book.coverUri ? (
            <Image source={{ uri: book.coverUri }} style={styles.cover} />
        ) : (
            <View style={[styles.cover, styles.placeholder]}><Text style={{fontSize: 40}}>{book.title[0]}</Text></View>
        )}
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
        
        <TouchableOpacity style={[styles.statusBadge, book.status === 'finished' ? styles.statusDone : styles.statusReading]} onPress={toggleStatus}>
          <Text style={styles.statusText}>{book.status === 'finished' ? '✅ Đã đọc xong' : '📖 Đang đọc'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Đánh giá</Text>
        <View style={{ flexDirection: 'row' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => updateBook(book.id, { rating: star })}>
              <Text style={{ fontSize: 35, color: star <= book.rating ? '#FFD700' : '#eee', marginRight: 5 }}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ghi chú</Text>
        <TextInput 
            style={styles.noteInput} multiline placeholder="Viết cảm nhận..." 
            value={note} onChangeText={setNote} onBlur={() => updateBook(book.id, { notes: note })} 
        />
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteText}>Xoá sách</Text>
      </TouchableOpacity>
      <View style={{height: 50}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cover: { width: 120, height: 180, borderRadius: 8, marginBottom: 15 },
  placeholder: { backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  author: { fontSize: 16, color: '#666', marginBottom: 5 },
  statusBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 10 },
  statusReading: { backgroundColor: '#e3f2fd' },
  statusDone: { backgroundColor: '#e8f5e9' },
  statusText: { fontWeight: '600', color: '#333' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  noteInput: { backgroundColor: '#f9f9f9', height: 100, borderRadius: 10, padding: 15, textAlignVertical: 'top' },
  deleteBtn: { margin: 20, backgroundColor: '#ffebee', padding: 15, borderRadius: 10, alignItems: 'center' },
  deleteText: { color: 'red', fontWeight: 'bold' }
});

export default BookDetailScreen;