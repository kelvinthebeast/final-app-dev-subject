import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import useBookStore from '../store/useBookStore';

const AddBookScreen = ({ navigation, route }) => {
  // Lấy params gửi sang (nếu có sách cần sửa)
  const bookToEdit = route.params?.bookToEdit;
  const isEditing = !!bookToEdit; // Biến kiểm tra đang Sửa hay Thêm

  // Lấy actions từ store
  const { addBook, updateBook } = useBookStore();

  // State form
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [coverUri, setCoverUri] = useState(null);

  // Nếu là chế độ Sửa, tự động điền dữ liệu cũ vào form
  useEffect(() => {
    if (isEditing) {
      setTitle(bookToEdit.title);
      setAuthor(bookToEdit.author);
      setCategory(bookToEdit.category);
      setContent(bookToEdit.content || '');
      setCoverUri(bookToEdit.coverUri);
      
      // Đặt lại tiêu đề màn hình
      navigation.setOptions({ title: 'Cập nhật sách' });
    }
  }, [bookToEdit]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.5,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const handleSave = () => {
    // Validate cơ bản
    if (!title.trim() || !author.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Tên sách và Tác giả');
      return;
    }

    if (isEditing) {
      // --- LOGIC SỬA ---
      updateBook(bookToEdit.id, {
        title, author, category, content, coverUri
      });
      Alert.alert('Thành công', 'Đã cập nhật thông tin sách!');
    } else {
      // --- LOGIC THÊM MỚI ---
      const newBook = {
        id: Date.now().toString(),
        title, author, 
        category: category || 'Khác',
        content: content || '',
        coverUri,
        status: 'reading', rating: 0, minutesRead: 0, sessions: 0, notes: '',
        createdAt: new Date().toISOString(),
      };
      addBook(newBook);
      Alert.alert('Thành công', 'Đã thêm sách mới!');
    }

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
      <ScrollView style={styles.container}>
        {/* Ảnh bìa */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={{fontSize: 30, marginBottom: 5}}>📷</Text>
                <Text style={styles.placeholderText}>+ Chọn ảnh bìa</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Tên sách <Text style={{color: 'red'}}>*</Text></Text>
          <TextInput style={styles.input} placeholder="Nhập tên sách..." value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Tác giả <Text style={{color: 'red'}}>*</Text></Text>
          <TextInput style={styles.input} placeholder="Nhập tên tác giả..." value={author} onChangeText={setAuthor} />

          <Text style={styles.label}>Thể loại</Text>
          <TextInput style={styles.input} placeholder="Ví dụ: Tiểu thuyết, Kinh tế..." value={category} onChangeText={setCategory} />

          <Text style={styles.label}>Nội dung / Tóm tắt</Text>
          <TextInput 
            style={[styles.input, styles.contentInput]} 
            placeholder="Paste nội dung truyện vào đây để đọc..." 
            value={content} onChangeText={setContent}
            multiline textAlignVertical="top"
          />

          {/* Nút Lưu (Đổi màu và chữ tùy theo chế độ) */}
          <TouchableOpacity 
            style={[styles.saveBtn, isEditing ? styles.updateBtnColor : styles.addBtnColor]} 
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>
                {isEditing ? 'CẬP NHẬT THÔNG TIN' : 'LƯU SÁCH MỚI'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{height: 50}}/>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imageContainer: { alignItems: 'center', marginVertical: 20, backgroundColor: '#f8f9fa', paddingVertical: 20 },
  imagePicker: { width: 120, height: 180, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  coverImage: { width: '100%', height: '100%', borderRadius: 8 },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#888', fontSize: 12 },
  
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#555' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa' },
  contentInput: { height: 120 },
  
  saveBtn: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, elevation: 3 },
  addBtnColor: { backgroundColor: '#007AFF' },
  updateBtnColor: { backgroundColor: '#FF9500' }, // Màu cam cho nút sửa
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});

export default AddBookScreen;