import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, AppState } from 'react-native';
import PagerView from 'react-native-pager-view';
import * as Speech from 'expo-speech'; 
import * as Sharing from 'expo-sharing'; // <--- Thư viện mở file
import { useKeepAwake } from 'expo-keep-awake'; 
import useBookStore from '../store/useBookStore';

const ReadBookScreen = ({ route, navigation }) => {
  useKeepAwake();

  const { bookId, targetPage } = route.params;
  const { books, addReadingSession, savePageProgress, savePageNote } = useBookStore();
  const book = books.find(b => b.id === bookId);

  // --- STATE CHUNG ---
  const [fontSize, setFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Timer cho Text Book
  const [secondsRead, setSecondsRead] = useState(0);
  const startTimeRef = useRef(new Date());

  // Logic trang (chỉ dùng cho Text)
  const initialPageIndex = (targetPage !== undefined) ? targetPage : (book?.lastPageRead || 0);
  const [currentPage, setCurrentPage] = useState(initialPageIndex);

  // State Ghi Chú
  const [modalVisible, setModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState('');

  // Ref cho AppState (Dùng để tính giờ khi đọc PDF)
  const appState = useRef(AppState.currentState);
  const pdfStartTime = useRef(new Date());

  if (!book) return null;

  const bgStyle = isDarkMode ? '#1a1a1a' : '#fff';
  const textStyle = isDarkMode ? '#ddd' : '#222';
  
  // Lấy ghi chú của trang hiện tại (chỉ text)
  const pageNote = book.pageNotes ? book.pageNotes[currentPage] : '';

  // =================================================================
  // PHẦN 1: LOGIC CHO SÁCH TEXT (TIMER & PAGINATION)
  // =================================================================
  
  useEffect(() => {
    // Chỉ chạy timer đếm giây trên màn hình nếu là sách Text
    let timer;
    if (book.content) {
        timer = setInterval(() => setSecondsRead(p => p + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [book.content]);

  // Handle Back: Tính giờ cho sách Text khi thoát
  const handleGoBack = () => {
    Speech.stop();
    
    // Nếu là sách Text thì tính giờ dựa trên thời gian ở màn hình
    if (book.content) {
        const endTime = new Date();
        const durationInSeconds = (endTime - startTimeRef.current) / 1000;
        const minutes = Math.ceil(durationInSeconds / 60);
        if (minutes > 0) addReadingSession(book.id, minutes);
    }
    
    navigation.goBack();
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Phân trang (Pagination)
  const pages = useMemo(() => {
    if (!book.content) return [];
    const paragraphs = book.content.split('\n');
    let generatedPages = [];
    let currentPageContent = '';
    const CHAR_LIMIT = fontSize > 20 ? 600 : 900; 

    paragraphs.forEach((para) => {
      if ((currentPageContent.length + para.length) < CHAR_LIMIT) {
        currentPageContent += para + '\n';
      } else {
        if (currentPageContent.trim().length > 0) generatedPages.push(currentPageContent);
        currentPageContent = para + '\n';
      }
    });
    if (currentPageContent.trim().length > 0) generatedPages.push(currentPageContent);
    return generatedPages.length > 0 ? generatedPages : ["Nội dung quá ngắn."];
  }, [book.content, fontSize]); 

  const handlePageChange = (e) => {
      const newIndex = e.nativeEvent.position;
      setCurrentPage(newIndex);
      savePageProgress(book.id, newIndex);
  };

  // Speech Text
  const toggleSpeech = () => {
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); }
    else {
      Speech.speak(pages[currentPage], {
        language: 'vi-VN', pitch: 1.0, rate: 0.9,
        onDone: () => setIsSpeaking(false), onStopped: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };
  useEffect(() => { if(isSpeaking) { Speech.stop(); setIsSpeaking(false); } }, [currentPage]);

  // Note Handling
  const openNoteModal = () => {
      setCurrentNote(pageNote || ''); 
      setModalVisible(true);
  };
  const saveNote = () => {
      savePageNote(book.id, currentPage, currentNote);
      setModalVisible(false);
  };

  // =================================================================
  // PHẦN 2: LOGIC CHO SÁCH FILE (PDF/EPUB)
  // =================================================================

  // Tính giờ khi đọc PDF (Dựa vào việc chuyển đổi AppState)
  useEffect(() => {
    if (!book.content && book.fileUri) {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
              appState.current.match(/inactive|background/) && 
              nextAppState === 'active'
            ) {
              // Người dùng vừa quay lại App (sau khi đọc PDF xong)
              const now = new Date();
              const durationInSeconds = (now - pdfStartTime.current) / 1000;
              
              // Nếu đọc trên 10 giây mới tính
              if (durationInSeconds > 10) {
                  const mins = Math.ceil(durationInSeconds / 60);
                  addReadingSession(book.id, mins);
                  Alert.alert("Ghi nhận", `Bạn vừa đọc được ${mins} phút.`);
              }
              // Reset mốc thời gian cho lần mở tiếp theo
              pdfStartTime.current = new Date();
            }
            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }
  }, [book.content, book.fileUri]);

  const handleOpenFile = async () => {
      if (!book.fileUri) return;
      
      // Reset mốc thời gian bắt đầu khi bấm mở file
      pdfStartTime.current = new Date();

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
          await Sharing.shareAsync(book.fileUri, {
              mimeType: book.fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip',
              dialogTitle: 'Mở sách với...'
          });
      } else {
          Alert.alert("Lỗi", "Thiết bị không hỗ trợ mở file này.");
      }
  };


  // =================================================================
  // RENDER GIAO DIỆN
  // =================================================================

  // TRƯỜNG HỢP 1: SÁCH FILE (PDF/EPUB) - HIỆN NÚT MỞ FILE
  if (!book.content && book.fileUri) {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f5f5f5' }]}>
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Quay lại</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.fileContainer}>
                <Text style={styles.fileIcon}>
                    {book.fileType === 'pdf' ? '📕' : '📘'}
                </Text>
                <Text style={styles.fileTitle}>{book.title}</Text>
                <Text style={styles.fileSub}>Định dạng: {book.fileType?.toUpperCase()}</Text>
                
                <TouchableOpacity style={styles.openBtn} onPress={handleOpenFile}>
                    <Text style={styles.openBtnText}>📖 Mở bằng trình đọc ngoài</Text>
                </TouchableOpacity>
                
                <Text style={styles.noteText}>
                    * Mẹo: Thời gian sẽ được tính khi bạn quay lại App này sau khi đọc xong.
                </Text>
            </View>
        </SafeAreaView>
      );
  }

  // TRƯỜNG HỢP 2: SÁCH TEXT - HIỆN TRÌNH ĐỌC CŨ
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgStyle }]}>
      {/* TOOLBAR */}
      <View style={[styles.toolbar, { borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text>
        </TouchableOpacity>

        <View style={styles.settings}>
            <TouchableOpacity onPress={openNoteModal} style={styles.btn}>
                <Text style={styles.btnIcon}>{pageNote ? '📝' : '✍️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleSpeech} style={[styles.btn, isSpeaking && styles.speakingBtn]}>
                <Text style={styles.btnIcon}>{isSpeaking ? '⏹️' : '🔊'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setFontSize(Math.max(14, fontSize - 2))} style={styles.btn}>
                <Text style={[styles.btnText, { color: textStyle }]}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFontSize(Math.min(30, fontSize + 2))} style={styles.btn}>
                <Text style={[styles.btnText, { color: textStyle }]}>A+</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={[styles.btn, styles.themeBtn]}>
                <Text style={styles.themeText}>{isDarkMode ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* PAGER VIEW */}
      <PagerView 
        style={styles.pagerView} 
        initialPage={initialPageIndex} 
        onPageSelected={handlePageChange}
      >
        {pages.map((pageContent, index) => {
            const noteForThisPage = book.pageNotes ? book.pageNotes[index] : null;
            return (
                <View key={index} style={styles.pageContainer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        
                        <Text style={[styles.content, { fontSize: fontSize, color: textStyle, lineHeight: fontSize * 1.6 }]}>
                        {pageContent}
                        </Text>
                        
                        {noteForThisPage ? (
                            <TouchableOpacity onPress={openNoteModal} style={styles.stickyNote}>
                                <Text style={styles.stickyNoteTitle}>📝 Ghi chú trang này:</Text>
                                <Text style={styles.stickyNoteContent}>{noteForThisPage}</Text>
                            </TouchableOpacity>
                        ) : null}

                        <View style={{height: 50}}/> 
                    </ScrollView>
                </View>
            )
        })}
      </PagerView>

      {/* FOOTER */}
      <View style={[styles.footer, { backgroundColor: bgStyle, borderTopColor: isDarkMode ? '#333' : '#eee' }]}>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontSize: 12, color: isDarkMode ? '#888' : '#666'}}>
                ⏱️ {formatTime(secondsRead)} • Trang {currentPage + 1} / {pages.length}
            </Text>
         </View>
         <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${((currentPage + 1) / pages.length) * 100}%` }]} />
         </View>
      </View>

      {/* MODAL NHẬP GHI CHÚ */}
      <Modal
        animationType="slide" transparent={true} visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Ghi chú cho Trang {currentPage + 1} ✍️</Text>
                <TextInput 
                    style={styles.noteInput} multiline
                    placeholder="Ghi lại suy nghĩ của bạn về trang này..."
                    value={currentNote} onChangeText={setCurrentNote} autoFocus
                />
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                        <Text style={styles.btnTextSmall}>Đóng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveNote}>
                        <Text style={[styles.btnTextSmall, {color: '#fff'}]}>Dán Ghi Chú</Text>
                    </TouchableOpacity>
                </View>
            </View>
         </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, paddingTop: 40 },
  backBtn: { padding: 5, width: 80 },
  settings: { flexDirection: 'row', alignItems: 'center' },
  btn: { marginHorizontal: 2, padding: 5 },
  speakingBtn: { backgroundColor: '#ffebee', borderRadius: 5 },
  btnIcon: { fontSize: 18 },
  btnText: { fontSize: 18, fontWeight: 'bold' },
  themeBtn: { backgroundColor: '#eee', borderRadius: 15, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  themeText: { fontSize: 14 },
  
  pagerView: { flex: 1 },
  pageContainer: { padding: 20, flex: 1 },
  bookTitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase' },
  content: { textAlign: 'justify' },
  
  stickyNote: {
      backgroundColor: '#fff9c4', padding: 15, borderRadius: 10, marginTop: 20,
      borderLeftWidth: 5, borderLeftColor: '#fbc02d',
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, elevation: 3
  },
  stickyNoteTitle: { fontWeight: 'bold', color: '#f57f17', marginBottom: 5, fontSize: 12 },
  stickyNoteContent: { color: '#333', fontStyle: 'italic', lineHeight: 20 },

  footer: { height: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderTopWidth: 1 },
  progressBarBg: { width: 100, height: 4, backgroundColor: '#eee', borderRadius: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 },

  // STYLES CHO FILE VIEW (PDF/EPUB)
  fileContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  fileIcon: { fontSize: 80, marginBottom: 20 },
  fileTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#333' },
  fileSub: { fontSize: 16, color: '#666', marginBottom: 40 },
  openBtn: { backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, elevation: 5, shadowColor: '#007AFF', shadowOffset: {width:0, height:4}, shadowOpacity:0.3 },
  openBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  noteText: { marginTop: 30, textAlign: 'center', color: '#888', fontSize: 13, fontStyle: 'italic', maxWidth: '80%' },

  // MODAL STYLE
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '50%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  noteInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 15, textAlignVertical: 'top', fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  cancelBtn: { backgroundColor: '#eee' },
  saveBtn: { backgroundColor: '#007AFF' },
  btnTextSmall: { fontWeight: 'bold' }
});

export default ReadBookScreen;