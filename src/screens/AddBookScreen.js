// File: src/screens/AddBookScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import useBookStore from '../store/useBookStore';

const AddBookScreen = ({ navigation }) => {
  const addBook = useBookStore((state) => state.addBook);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [coverUri, setCoverUri] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !author.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Tên sách và Tác giả');
      return;
    }

    const newBook = {
      id: Date.now().toString(),
      title,
      author,
      category: category || 'Khác',
      coverUri,
      status: 'reading',
      rating: 0,
      notes: '',
      createdAt: new Date().toISOString(),
    };

    addBook(newBook);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>+ Chọn ảnh bìa</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Tên sách *</Text>
        <TextInput style={styles.input} placeholder="Ví dụ: Nhà Giả Kim" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Tác giả *</Text>
        <TextInput style={styles.input} placeholder="Ví dụ: Paulo Coelho" value={author} onChangeText={setAuthor} />

        <Text style={styles.label}>Thể loại</Text>
        <TextInput style={styles.input} placeholder="Ví dụ: Tiểu thuyết..." value={category} onChangeText={setCategory} />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>LƯU SÁCH</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imageContainer: { alignItems: 'center', marginVertical: 20 },
  imagePicker: { width: 120, height: 180, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  coverImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#888', marginTop: 5 },
  form: { padding: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 5, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20, backgroundColor: '#f9f9f9' },
  saveBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AddBookScreen;