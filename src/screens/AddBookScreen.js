import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer'; // Import decode
import { supabase } from '../utils/supabase'; // Import client Supabase
import useBookStore from '../store/useBookStore';

const AddBookScreen = ({ navigation, route }) => {
  const bookToEdit = route.params?.bookToEdit;
  const isEditing = !!bookToEdit;
  const { addBook, updateBook } = useBookStore();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [coverUri, setCoverUri] = useState(null); 
  
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); 
  const [inputMode, setInputMode] = useState('manual'); 
  const [isUploading, setIsUploading] = useState(false); 

  useEffect(() => {
    if (isEditing) {
      setTitle(bookToEdit.title);
      setAuthor(bookToEdit.author);
      setCategory(bookToEdit.category);
      setContent(bookToEdit.content || '');
      setCoverUri(bookToEdit.cover_url || bookToEdit.coverUri); 
      
      // Kiểm tra xem sách cũ dùng link online (Supabase) hay link local
      if (bookToEdit.file_url) {
          setInputMode('file');
          setSelectedFile({ 
              name: 'File Online', 
              uri: bookToEdit.file_url, 
              type: bookToEdit.file_type 
          });
      }
      navigation.setOptions({ title: 'Cập nhật sách' });
    }
  }, [bookToEdit]);

  // --- 1. CHỌN ẢNH ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [2, 3], quality: 0.5,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  // --- 2. CHỌN FILE ---
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', 
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (ext === 'txt') {
         // Nếu là txt thì đọc thử để hiện preview
         const text = await FileSystem.readAsStringAsync(file.uri);
         setContent(text);
      }

      setSelectedFile({
          uri: file.uri, 
          name: file.name,
          type: ext,
          mimeType: file.mimeType
      });

      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));

    } catch (err) {
      Alert.alert("Lỗi", "Không chọn được file");
    }
  };

  // --- 3. HÀM UPLOAD LÊN SUPABASE (ĐÃ SỬA LỖI BASE64) ---
  const uploadToSupabase = async (uri, bucketName, folderName) => {
      if (!uri) return null;
      if (uri.startsWith('http')) return uri; // Nếu là link online thì bỏ qua

      // FIX LỖI Ở ĐÂY: Dùng chuỗi 'base64' thay vì Enum
      const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64', // <--- ĐÃ SỬA: Dùng string thường
      });

      const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const filePath = `${folderName}/${fileName}`;

      const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, decode(base64), {
              contentType: 'application/octet-stream',
              upsert: false
          });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

      return publicUrl;
  };

  // --- 4. LƯU DỮ LIỆU ---
  const handleSave = async () => {
    if (!title.trim()) return Alert.alert('Thiếu thông tin', 'Nhập tên sách!');

    setIsUploading(true);
    try {
        // A. Upload Ảnh
        let finalCoverUrl = coverUri;
        if (coverUri && !coverUri.startsWith('http')) {
             // Chỉ upload nếu là file local (chưa có http)
             finalCoverUrl = await uploadToSupabase(coverUri, 'book-covers', 'covers');
        }

        // B. Upload File Sách
        let finalFileUrl = null;
        // Nếu đang ở mode File và có chọn file mới (hoặc file cũ là link online)
        if (inputMode === 'file' && selectedFile) {
             if (selectedFile.uri.startsWith('http')) {
                 finalFileUrl = selectedFile.uri; // Giữ nguyên link cũ
             } else {
                 finalFileUrl = await uploadToSupabase(selectedFile.uri, 'book-files', 'docs');
             }
        }

        // C. Tạo object dữ liệu
        const bookPayload = {
            title,
            author,
            category: category || 'Khác',
            content: (inputMode === 'manual' || selectedFile?.type === 'txt') ? content : null,
            cover_url: finalCoverUrl,
            file_url: finalFileUrl,
            file_type: selectedFile ? selectedFile.type : 'text',
        };

        // D. Gửi lên Supabase Database
        let error;
        if (isEditing) {
            const { error: err } = await supabase
                .from('books')
                .update(bookPayload)
                .eq('id', bookToEdit.id);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('books')
                .insert([bookPayload]);
            error = err;
        }

        if (error) throw error;

        Alert.alert('Thành công', 'Đã lưu sách lên Cloud!');
        navigation.goBack();

    } catch (err) {
        console.log("Save Error:", err);
        Alert.alert("Lỗi Lưu", err.message || "Có lỗi xảy ra khi upload.");
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
      <ScrollView style={styles.container}>
        {isUploading && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{color: '#fff', marginTop: 10, fontWeight: 'bold'}}>Đang tải lên mây...</Text>
            </View>
        )}

        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.placeholder}><Text style={{fontSize: 30}}>📷</Text><Text style={styles.sub}>Ảnh bìa</Text></View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Tên sách *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Tên sách..." />
          <Text style={styles.label}>Tác giả</Text>
          <TextInput style={styles.input} value={author} onChangeText={setAuthor} placeholder="Tác giả..." />
          <Text style={styles.label}>Thể loại</Text>
          <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Thể loại..." />

          <View style={styles.toggleContainer}>
             <TouchableOpacity style={[styles.toggleBtn, inputMode === 'manual' && styles.toggleBtnActive]} onPress={() => setInputMode('manual')}>
                 <Text style={[styles.toggleText, inputMode === 'manual' && styles.toggleTextActive]}>✍️ Nhập Text</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.toggleBtn, inputMode === 'file' && styles.toggleBtnActive]} onPress={() => setInputMode('file')}>
                 <Text style={[styles.toggleText, inputMode === 'file' && styles.toggleTextActive]}>📂 PDF / EPUB</Text>
             </TouchableOpacity>
          </View>

          {inputMode === 'manual' ? (
              <View>
                 <Text style={styles.label}>Nội dung:</Text>
                 <TextInput style={[styles.input, styles.contentInput]} placeholder="Paste nội dung vào đây..." value={content} onChangeText={setContent} multiline />
              </View>
          ) : (
              <View style={styles.importBox}>
                  {selectedFile ? (
                      <View style={styles.fileInfo}>
                          <Text style={{fontSize: 30}}>📄</Text>
                          <View style={{marginLeft: 10, flex: 1}}>
                              <Text style={styles.fileName}>{selectedFile.name}</Text>
                              <Text style={{color: 'green', fontSize: 12}}>Sẵn sàng tải lên</Text>
                          </View>
                          <TouchableOpacity onPress={() => setSelectedFile(null)}><Text style={{color:'red'}}>Xóa</Text></TouchableOpacity>
                      </View>
                  ) : (
                      <TouchableOpacity onPress={handlePickFile} style={styles.bigImportBtn}>
                          <Text style={{fontSize: 30}}>☁️</Text>
                          <Text style={{color: '#007AFF', fontWeight: 'bold'}}>Chọn file từ máy</Text>
                      </TouchableOpacity>
                  )}
              </View>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isUploading}>
            <Text style={styles.saveBtnText}>{isUploading ? 'ĐANG LƯU...' : 'LƯU LÊN CLOUD 🚀'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{height: 50}}/>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { alignItems: 'center', marginVertical: 20, backgroundColor: '#f8f9fa', padding: 20 },
  imagePicker: { width: 100, height: 150, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  coverImage: { width: '100%', height: '100%', borderRadius: 8 },
  placeholder: { alignItems: 'center' }, sub: { fontSize: 10, color: '#888' },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#555' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa' },
  contentInput: { height: 150, textAlignVertical: 'top' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 10, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#fff', elevation: 2 },
  toggleText: { color: '#888', fontWeight: '600' },
  toggleTextActive: { color: '#007AFF', fontWeight: 'bold' },
  importBox: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 20, alignItems: 'center', borderStyle: 'dashed', backgroundColor: '#f9f9f9', marginBottom: 20 },
  fileInfo: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', width: '100%', elevation: 2 },
  fileName: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  bigImportBtn: { alignItems: 'center', padding: 20, width: '100%' },
  saveBtn: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10, backgroundColor: '#007AFF' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AddBookScreen;