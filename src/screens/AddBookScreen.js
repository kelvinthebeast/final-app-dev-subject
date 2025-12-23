import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, 
  Image, Alert, KeyboardAvoidingView, Platform, Dimensions 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker'; // 👇 Thêm thư viện chọn file
import useBookStore from '../store/useBookStore';

const { width } = Dimensions.get('window');

const AddBookScreen = ({ navigation, route }) => {
  const bookToEdit = route.params?.bookToEdit;
  const isEditing = !!bookToEdit;
  const { addBook, updateBook } = useBookStore();

  // State form
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [coverUri, setCoverUri] = useState(null);
  
  // 👇 State mới cho File
  const [fileUri, setFileUri] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState(''); // 'pdf' hoặc 'epub'

  useEffect(() => {
    if (isEditing) {
      setTitle(bookToEdit.title);
      setAuthor(bookToEdit.author);
      setCategory(bookToEdit.category);
      setContent(bookToEdit.content || '');
      setCoverUri(bookToEdit.coverUri);
      
      // Load thông tin file cũ nếu có
      if (bookToEdit.fileUri) {
          setFileUri(bookToEdit.fileUri);
          setFileName(bookToEdit.fileName || 'File sách cũ');
          setFileType(bookToEdit.fileType);
      }
      
      navigation.setOptions({ title: 'Cập nhật sách' });
    }
  }, [bookToEdit]);

  // --- 1. CHỌN ẢNH BÌA ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.5,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  // --- 2. CHỌN FILE PDF/EPUB ---
  const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'application/epub+zip'],
            copyToCacheDirectory: true
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const file = result.assets[0];
            setFileUri(file.uri);
            setFileName(file.name);
            // Xác định loại file dựa trên đuôi
            const type = file.name.toLowerCase().endsWith('pdf') ? 'pdf' : 'epub';
            setFileType(type);
            
            // Nếu chưa có tên sách, tự điền tên file vào
            if (!title) setTitle(file.name.replace(/\.(pdf|epub)$/i, ''));
        }
    } catch (err) {
        Alert.alert("Lỗi", "Không thể chọn file này.");
    }
  };

  const clearFile = () => {
      setFileUri(null);
      setFileName('');
      setFileType('');
  };

  // --- 3. LƯU DỮ LIỆU ---
  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập Tên sách'); return; }

    const bookData = {
        title, 
        author: author || 'Không rõ', // Cho phép để trống tác giả
        category: category || 'Khác',
        content, // Nội dung text
        coverUri,
        // Lưu thông tin file
        fileUri,
        fileName,
        fileType
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
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: ẢNH BÌA */}
        <View style={styles.coverSection}>
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={{fontSize: 32}}>📷</Text>
                <Text style={styles.placeholderText}>Thêm bìa</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.hintText}>Chạm để thay đổi ảnh bìa</Text>
        </View>

        {/* SECTION 2: THÔNG TIN CƠ BẢN */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Thông tin chung</Text>
          
          <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên sách <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput style={styles.input} placeholder="Nhập tên sách..." value={title} onChangeText={setTitle} />
          </View>

          <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
                  <Text style={styles.label}>Tác giả</Text>
                  <TextInput style={styles.input} placeholder="Tên tác giả..." value={author} onChangeText={setAuthor} />
              </View>
              <View style={[styles.inputGroup, {flex: 1}]}>
                  <Text style={styles.label}>Thể loại</Text>
                  <TextInput style={styles.input} placeholder="Vd: Kinh tế..." value={category} onChangeText={setCategory} />
              </View>
          </View>
        </View>

        {/* SECTION 3: NỘI DUNG (CHỌN FILE HOẶC PASTE TEXT) */}
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Nội dung sách</Text>
            <Text style={styles.subHint}>Chọn file PDF/EPUB hoặc dán văn bản để đọc</Text>

            {/* A. NÚT CHỌN FILE */}
            {!fileUri ? (
                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                    <Text style={{fontSize: 24, marginRight: 10}}>📂</Text>
                    <View>
                        <Text style={styles.uploadTitle}>Tải lên PDF hoặc EPUB</Text>
                        <Text style={styles.uploadSub}>Nhập từ bộ nhớ máy</Text>
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
                    <TouchableOpacity onPress={clearFile} style={styles.removeFileBtn}>
                        <Text style={{color: '#d32f2f', fontWeight: 'bold'}}>Xóa</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* B. HOẶC DÁN TEXT */}
            <View style={styles.divider}>
                <View style={styles.line}/><Text style={styles.orText}>HOẶC</Text><View style={styles.line}/>
            </View>

            <TextInput 
                style={[styles.input, styles.contentInput]} 
                placeholder="Dán nội dung truyện/sách vào đây nếu không có file..." 
                value={content} onChangeText={setContent}
                multiline textAlignVertical="top"
            />
        </View>

        {/* NÚT LƯU */}
        <View style={styles.footer}>
            <TouchableOpacity 
                style={[styles.saveBtn, isEditing ? styles.updateBtnColor : styles.addBtnColor]} 
                onPress={handleSave}
            >
                <Text style={styles.saveBtnText}>
                    {isEditing ? 'LƯU THAY ĐỔI' : 'THÊM VÀO THƯ VIỆN'}
                </Text>
            </TouchableOpacity>
        </View>

        <View style={{height: 50}}/>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  // Cover Image
  coverSection: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#fff', marginBottom: 15 },
  imagePicker: { 
      width: 110, height: 165, // Tỉ lệ 2:3 chuẩn sách
      borderRadius: 8, backgroundColor: '#f0f0f0', 
      justifyContent: 'center', alignItems: 'center', 
      borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed',
      shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.1, elevation: 3
  },
  coverImage: { width: '100%', height: '100%', borderRadius: 8 },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#999', fontSize: 12, fontWeight: '600', marginTop: 5 },
  hintText: { fontSize: 12, color: '#aaa', marginTop: 10 },

  // Form Section
  formSection: { backgroundColor: '#fff', padding: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#007AFF', paddingLeft: 10 },
  subHint: { fontSize: 13, color: '#666', marginBottom: 10, marginTop: -10 },
  
  inputGroup: { marginBottom: 15 },
  rowInputs: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#444' },
  input: { 
      borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, 
      padding: 12, fontSize: 16, backgroundColor: '#fff', color: '#333' 
  },
  
  // File Upload Styles
  uploadBtn: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#f0f8ff', padding: 15, borderRadius: 12,
      borderWidth: 1, borderColor: '#d0eaff', borderStyle: 'dashed'
  },
  uploadTitle: { fontSize: 15, fontWeight: 'bold', color: '#007AFF' },
  uploadSub: { fontSize: 12, color: '#666' },

  fileCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12,
      borderWidth: 1, borderColor: '#eee'
  },
  fileName: { fontWeight: 'bold', color: '#333', fontSize: 14, maxWidth: '90%' },
  fileTypeBadge: { fontSize: 10, backgroundColor: '#eee', paddingHorizontal: 6, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2, color: '#666' },
  removeFileBtn: { padding: 5, marginLeft: 10 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  line: { flex: 1, height: 1, backgroundColor: '#eee' },
  orText: { marginHorizontal: 10, fontSize: 12, color: '#aaa', fontWeight: 'bold' },

  contentInput: { height: 120, backgroundColor: '#fafafa' },

  // Footer Button
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, elevation: 2 },
  addBtnColor: { backgroundColor: '#007AFF' },
  updateBtnColor: { backgroundColor: '#FF9500' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AddBookScreen;