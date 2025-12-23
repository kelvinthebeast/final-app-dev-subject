import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, 
  Image, Alert, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker'; 
import useBookStore from '../store/useBookStore';

const AddBookScreen = ({ navigation, route }) => {
  const bookToEdit = route.params?.bookToEdit;
  const isEditing = !!bookToEdit;
  const { addBook, updateBook } = useBookStore();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [coverUri, setCoverUri] = useState(null);
  const [fileUri, setFileUri] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');

  useEffect(() => {
    if (isEditing) {
      setTitle(bookToEdit.title);
      setAuthor(bookToEdit.author);
      setCategory(bookToEdit.category);
      setContent(bookToEdit.content || '');
      setCoverUri(bookToEdit.coverUri);
      if (bookToEdit.fileUri) {
          setFileUri(bookToEdit.fileUri);
          setFileName(bookToEdit.fileName || 'File sách cũ');
          setFileType(bookToEdit.fileType);
      }
      navigation.setOptions({ title: 'Cập nhật sách' });
    }
  }, [bookToEdit]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [2, 3], quality: 0.5,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  // --- 🔥 LOGIC CHỌN FILE LOCAL ---
  const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'application/epub+zip'],
            copyToCacheDirectory: true // Quan trọng: Copy file vào bộ nhớ App để đọc ổn định
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const file = result.assets[0];
            setFileUri(file.uri);
            setFileName(file.name);
            const type = file.name.toLowerCase().endsWith('pdf') ? 'pdf' : 'epub';
            setFileType(type);
            // Tự điền tên sách nếu chưa có
            if (!title) setTitle(file.name.replace(/\.(pdf|epub)$/i, ''));
        }
    } catch (err) {
        Alert.alert("Lỗi", "Không thể chọn file này.");
    }
  };

  const clearFile = () => {
      setFileUri(null); setFileName(''); setFileType('');
  };

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập Tên sách'); return; }

    const bookData = {
        title, author: author || 'Không rõ', category: category || 'Khác',
        content, coverUri, fileUri, fileName, fileType
    };

    if (isEditing) {
      updateBook(bookToEdit.id, bookData);
      Alert.alert('Thành công', 'Đã cập nhật thông tin sách!');
    } else {
      const newBook = {
        id: Date.now().toString(),
        ...bookData,
        status: 'reading', rating: 0, minutesRead: 0, sessions: 0, 
        createdAt: new Date().toISOString(),
      };
      addBook(newBook);
      Alert.alert('Thành công', 'Đã thêm sách mới!');
    }
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1, backgroundColor: '#fff'}}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        
        {/* SECTION 1: ẢNH BÌA */}
        <View style={styles.coverSection}>
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
            {coverUri ? <Image source={{ uri: coverUri }} style={styles.coverImage} /> : <Text style={{fontSize: 32}}>📷</Text>}
          </TouchableOpacity>
          <Text style={styles.hintText}>Chọn ảnh bìa</Text>
        </View>

        {/* SECTION 2: FILE SÁCH (QUAN TRỌNG) */}
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>File Sách (PDF/EPUB)</Text>
            {!fileUri ? (
                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                    <Text style={{fontSize: 24, marginRight: 10}}>📂</Text>
                    <View>
                        <Text style={styles.uploadTitle}>Chọn file từ máy</Text>
                        <Text style={styles.uploadSub}>Hỗ trợ .pdf và .epub</Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <View style={styles.fileCard}>
                    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                        <Text style={{fontSize: 30, marginRight: 10}}>{fileType === 'pdf' ? '📕' : '📘'}</Text>
                        <View style={{flex: 1}}>
                            <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
                            <Text style={styles.fileTypeBadge}>{fileType.toUpperCase()}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={clearFile}><Text style={{color: 'red', fontWeight:'bold'}}>Xóa</Text></TouchableOpacity>
                </View>
            )}
        </View>

        {/* SECTION 3: THÔNG TIN */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Tên sách *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Nhập tên sách" />
          
          <View style={{flexDirection:'row', gap: 10}}>
             <View style={{flex:1}}><Text style={styles.label}>Tác giả</Text><TextInput style={styles.input} value={author} onChangeText={setAuthor} /></View>
             <View style={{flex:1}}><Text style={styles.label}>Thể loại</Text><TextInput style={styles.input} value={category} onChangeText={setCategory} /></View>
          </View>

          <Text style={styles.label}>Hoặc dán nội dung Text</Text>
          <TextInput style={[styles.input, {height: 100}]} value={content} onChangeText={setContent} multiline placeholder="Dán văn bản vào đây nếu không có file..." />
        </View>

        <View style={{padding: 20}}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{isEditing ? 'LƯU THAY ĐỔI' : 'LƯU SÁCH'}</Text>
            </TouchableOpacity>
        </View>
        <View style={{height: 50}}/>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  coverSection: { alignItems: 'center', padding: 20, backgroundColor: '#fff', marginBottom: 15 },
  imagePicker: { width: 100, height: 150, borderRadius: 8, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  coverImage: { width: '100%', height: '100%', borderRadius: 8 },
  hintText: { fontSize: 12, color: '#aaa', marginTop: 5 },
  formSection: { backgroundColor: '#fff', padding: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#555', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#90caf9', borderStyle: 'dashed' },
  uploadTitle: { fontSize: 15, fontWeight: 'bold', color: '#1976d2' },
  uploadSub: { fontSize: 12, color: '#555' },
  fileCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  fileName: { fontWeight: 'bold', color: '#333' },
  fileTypeBadge: { fontSize: 10, backgroundColor: '#ddd', paddingHorizontal: 6, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 },
  saveBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AddBookScreen;