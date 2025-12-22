import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import PagerView from 'react-native-pager-view';
import * as Speech from 'expo-speech'; 
import * as Sharing from 'expo-sharing'; 
import { useKeepAwake } from 'expo-keep-awake'; 
import useBookStore from '../store/useBookStore';

// IMPORT FILE RỜI
import LevelUpModal from '../components/LevelUpModal'; // UI Modal
import { useReadingLogic } from '../../hooks/useReadingLogic'; // Logic Hook

const ReadBookScreen = ({ route, navigation }) => {
  useKeepAwake();
  const { bookId, targetPage } = route.params;
  const { books, savePageProgress, savePageNote } = useBookStore();
  const book = books.find(b => b.id === bookId);

  // --- GỌI HOOK LOGIC (Cực gọn) ---
  // Toàn bộ việc tính giờ, check rank nằm ở đây
  const { handleGoBack, showLevelUp, newRankData, closeLevelUp } = useReadingLogic(book, navigation);

  // --- STATE GIAO DIỆN ---
  const [fontSize, setFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [secondsRead, setSecondsRead] = useState(0);

  const initialPageIndex = (targetPage !== undefined) ? targetPage : (book?.lastPageRead || 0);
  const [currentPage, setCurrentPage] = useState(initialPageIndex);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState('');

  if (!book) return null;

  const bgStyle = isDarkMode ? '#1a1a1a' : '#fff';
  const textStyle = isDarkMode ? '#ddd' : '#222';
  const pageNote = book.pageNotes ? book.pageNotes[currentPage] : '';

  // Timer hiển thị trên màn hình (chỉ để user nhìn cho vui)
  useEffect(() => {
    let timer;
    if (book.content) {
        timer = setInterval(() => setSecondsRead(p => p + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [book.content]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- LOGIC PHÂN TRANG & TTS (Giữ nguyên) ---
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

  const openNoteModal = () => { setCurrentNote(pageNote || ''); setModalVisible(true); };
  const saveNote = () => { savePageNote(book.id, currentPage, currentNote); setModalVisible(false); };

  const handleOpenFile = async () => {
      if (!book.fileUri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
          await Sharing.shareAsync(book.fileUri, {
              mimeType: book.fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip',
              dialogTitle: 'Mở sách với...'
          });
      } else { Alert.alert("Lỗi", "Thiết bị không hỗ trợ mở file này."); }
  };

  // --- RENDER ---
  // View cho PDF
  if (!book.content && book.fileUri) {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f5f5f5' }]}>
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
                  <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.fileContainer}>
                <Text style={styles.fileIcon}>{book.fileType === 'pdf' ? '📕' : '📘'}</Text>
                <Text style={styles.fileTitle}>{book.title}</Text>
                <Text style={styles.fileSub}>Định dạng: {book.fileType?.toUpperCase()}</Text>
                <TouchableOpacity style={styles.openBtn} onPress={handleOpenFile}>
                    <Text style={styles.openBtnText}>📖 Mở bằng trình đọc ngoài</Text>
                </TouchableOpacity>
                <Text style={styles.noteText}>* Thời gian đọc sẽ được tính khi bạn bấm "Xong".</Text>
            </View>
            
            <LevelUpModal visible={showLevelUp} rank={newRankData} onClose={closeLevelUp} />
        </SafeAreaView>
      );
  }

  // View cho Text Reader
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgStyle }]}>
      <View style={[styles.toolbar, { borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text>
        </TouchableOpacity>
        <View style={styles.settings}>
            <TouchableOpacity onPress={openNoteModal} style={styles.btn}><Text style={styles.btnIcon}>{pageNote ? '📝' : '✍️'}</Text></TouchableOpacity>
            <TouchableOpacity onPress={toggleSpeech} style={[styles.btn, isSpeaking && styles.speakingBtn]}><Text style={styles.btnIcon}>{isSpeaking ? '⏹️' : '🔊'}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setFontSize(Math.max(14, fontSize - 2))} style={styles.btn}><Text style={[styles.btnText, { color: textStyle }]}>A-</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setFontSize(Math.min(30, fontSize + 2))} style={styles.btn}><Text style={[styles.btnText, { color: textStyle }]}>A+</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={[styles.btn, styles.themeBtn]}><Text style={styles.themeText}>{isDarkMode ? '☀️' : '🌙'}</Text></TouchableOpacity>
        </View>
      </View>

      <PagerView style={styles.pagerView} initialPage={initialPageIndex} onPageSelected={handlePageChange}>
        {pages.map((pageContent, index) => {
            const noteForThisPage = book.pageNotes ? book.pageNotes[index] : null;
            return (
                <View key={index} style={styles.pageContainer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        <Text style={[styles.content, { fontSize: fontSize, color: textStyle, lineHeight: fontSize * 1.6 }]}>{pageContent}</Text>
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

      <View style={[styles.footer, { backgroundColor: bgStyle, borderTopColor: isDarkMode ? '#333' : '#eee' }]}>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontSize: 12, color: isDarkMode ? '#888' : '#666'}}>⏱️ {formatTime(secondsRead)} • Trang {currentPage + 1} / {pages.length}</Text>
         </View>
         <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${((currentPage + 1) / pages.length) * 100}%` }]} /></View>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Ghi chú cho Trang {currentPage + 1} ✍️</Text>
                <TextInput style={styles.noteInput} multiline placeholder="Ghi lại suy nghĩ..." value={currentNote} onChangeText={setCurrentNote} autoFocus />
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}><Text style={styles.btnTextSmall}>Đóng</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveNote}><Text style={[styles.btnTextSmall, {color: '#fff'}]}>Lưu</Text></TouchableOpacity>
                </View>
            </View>
         </KeyboardAvoidingView>
      </Modal>

      <LevelUpModal visible={showLevelUp} rank={newRankData} onClose={closeLevelUp} />
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
  stickyNote: { backgroundColor: '#fff9c4', padding: 15, borderRadius: 10, marginTop: 20, borderLeftWidth: 5, borderLeftColor: '#fbc02d', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, elevation: 3 },
  stickyNoteTitle: { fontWeight: 'bold', color: '#f57f17', marginBottom: 5, fontSize: 12 },
  stickyNoteContent: { color: '#333', fontStyle: 'italic', lineHeight: 20 },
  footer: { height: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderTopWidth: 1 },
  progressBarBg: { width: 100, height: 4, backgroundColor: '#eee', borderRadius: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 },
  fileContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  fileIcon: { fontSize: 80, marginBottom: 20 },
  fileTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#333' },
  fileSub: { fontSize: 16, color: '#666', marginBottom: 40 },
  openBtn: { backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, elevation: 5, shadowColor: '#007AFF', shadowOffset: {width:0, height:4}, shadowOpacity:0.3 },
  openBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  noteText: { marginTop: 30, textAlign: 'center', color: '#888', fontSize: 13, fontStyle: 'italic', maxWidth: '80%' },
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