import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, 
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, StatusBar, 
  Dimensions, ActivityIndicator 
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { WebView } from 'react-native-webview'; // 👇 1. Import WebView
import * as Speech from 'expo-speech'; 
import * as Sharing from 'expo-sharing'; 
import * as FileSystem from 'expo-file-system/legacy'; // 👇 2. Import để đọc file
import { useKeepAwake } from 'expo-keep-awake'; 
import useBookStore from '../store/useBookStore';

import LevelUpModal from '../components/LevelUpModal'; 
import { useReadingLogic } from '../../hooks/useReadingLogic'; 

const { width, height } = Dimensions.get('window');

const ReadBookScreen = ({ route, navigation }) => {
  useKeepAwake();
  const { bookId, targetPage } = route.params;
  const { books, savePageProgress, savePageNote } = useBookStore();
  const book = books.find(b => b.id === bookId);

  // Hook Logic
  const { handleGoBack, showLevelUp, newRankData, closeLevelUp } = useReadingLogic(book, navigation);

  // State
  const [fontSize, setFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [secondsRead, setSecondsRead] = useState(0);

  const initialPageIndex = (targetPage !== undefined) ? targetPage : (book?.lastPageRead || 0);
  const [currentPage, setCurrentPage] = useState(initialPageIndex);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState('');

  // 👇 State mới cho PDF Reader
  const [pdfBase64, setPdfBase64] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);

  if (!book) return null;

  const bgStyle = isDarkMode ? '#1a1a1a' : '#fff';
  const textStyle = isDarkMode ? '#ddd' : '#222';
  const pageNote = book.pageNotes ? book.pageNotes[currentPage] : '';

  // --- LOGIC ĐỌC FILE PDF (MỚI) ---
  useEffect(() => {
    const loadPdf = async () => {
        if (book.fileType === 'pdf' && book.fileUri) {
            setIsLoadingPdf(true);
            try {
                // Đọc file thành chuỗi Base64 để hiển thị trong WebView
                const base64 = await FileSystem.readAsStringAsync(book.fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                setPdfBase64(base64);
            } catch (error) {
                console.log("Lỗi đọc PDF:", error);
                Alert.alert("Lỗi", "Không thể tải nội dung PDF.");
            } finally {
                setIsLoadingPdf(false);
            }
        }
    };
    
    // Nếu là PDF thì load, còn EPUB hoặc Text thì thôi
    if (book.fileType === 'pdf') {
        loadPdf();
    }
  }, [book.fileUri]);

  // Timer
  useEffect(() => {
    let timer;
    // Timer chạy cho cả Text và PDF/EPUB
    if (book.content || book.fileUri) {
        timer = setInterval(() => setSecondsRead(p => p + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [book]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- LOGIC TEXT READER (Cũ) ---
  const pages = useMemo(() => {
    if (!book.content) return [];
    const paragraphs = book.content.split('\n');
    let generatedPages = [];
    let currentPageContent = '';
    const CHAR_LIMIT = (height > 800 ? 1000 : 700) - (fontSize * 10); 
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

  const handleOpenFileExternal = async () => {
      if (!book.fileUri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
          await Sharing.shareAsync(book.fileUri, {
              mimeType: book.fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip',
              dialogTitle: 'Mở sách với...'
          });
      }
  };

  // ============================================================
  // 🔥 RENDER: TRƯỜNG HỢP LÀ PDF (ĐỌC IN-APP)
  // ============================================================
  if (book.fileType === 'pdf') {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f5f5f5' }]}>
            <View style={styles.headerSpacer} />
            
            {/* Toolbar PDF */}
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
                  <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text>
                </TouchableOpacity>
                <Text style={{fontSize: 12, color: '#666', fontWeight:'600'}}>
                    ⏱️ {formatTime(secondsRead)}
                </Text>
                <TouchableOpacity onPress={handleOpenFileExternal} style={styles.btn}>
                    <Text style={{fontSize: 20}}>↗️</Text>
                </TouchableOpacity>
            </View>

            <View style={{flex: 1}}>
                {isLoadingPdf ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={{marginTop: 10, color: '#666'}}>Đang tải tài liệu...</Text>
                    </View>
                ) : (
                    <WebView 
                        originWhitelist={['*']}
                        source={{ 
                            // Android cần đọc data base64
                            // iOS có thể đọc trực tiếp uri, nhưng dùng base64 cho đồng bộ
                            data: pdfBase64, 
                            mimeType: 'application/pdf',
                            baseUrl: '' // Quan trọng cho Android
                        }}
                        style={{ flex: 1 }}
                        scalesPageToFit={true}
                    />
                )}
            </View>

            <LevelUpModal visible={showLevelUp} rank={newRankData} onClose={closeLevelUp} />
        </SafeAreaView>
      );
  }

  // ============================================================
  // 📘 RENDER: TRƯỜNG HỢP EPUB (VẪN DÙNG GIAO DIỆN CŨ MỞ NGOÀI)
  // ============================================================
  if (book.fileType === 'epub') {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f5f5f5' }]}>
            <View style={styles.headerSpacer} />
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
                  <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.fileContainer}>
                <Text style={styles.fileIcon}>📘</Text>
                <Text style={styles.fileTitle}>{book.title}</Text>
                <Text style={styles.fileSub}>Định dạng: EPUB</Text>
                <TouchableOpacity style={styles.openBtn} onPress={handleOpenFileExternal}>
                    <Text style={styles.openBtnText}>📖 Mở bằng trình đọc ngoài</Text>
                </TouchableOpacity>
                <Text style={styles.noteText}>* EPUB cần ứng dụng chuyên biệt để hiển thị đẹp nhất.</Text>
                <Text style={{marginTop: 20, fontSize: 16, fontWeight: 'bold', color: '#007AFF'}}>⏱️ {formatTime(secondsRead)}</Text>
            </View>
            
            <LevelUpModal visible={showLevelUp} rank={newRankData} onClose={closeLevelUp} />
        </SafeAreaView>
      );
  }

  // ============================================================
  // 📝 RENDER: TRƯỜNG HỢP TEXT (COPY/PASTE) - GIỮ NGUYÊN
  // ============================================================
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgStyle }]}>
      <View style={styles.headerSpacer} />
      <View style={[styles.toolbar, { borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text>
        </TouchableOpacity>
        <View style={styles.settings}>
            <TouchableOpacity onPress={openNoteModal} style={styles.btn} hitSlop={5}>
                <Text style={styles.btnIcon}>{pageNote ? '📝' : '✍️'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleSpeech} style={[styles.btn, isSpeaking && styles.speakingBtn]} hitSlop={5}>
                <Text style={styles.btnIcon}>{isSpeaking ? '⏹️' : '🔊'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFontSize(Math.max(14, fontSize - 2))} style={styles.btn} hitSlop={5}>
                <Text style={[styles.btnText, { color: textStyle }]}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFontSize(Math.min(30, fontSize + 2))} style={styles.btn} hitSlop={5}>
                <Text style={[styles.btnText, { color: textStyle }]}>A+</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={[styles.btn, styles.themeBtn]} hitSlop={5}>
                <Text style={styles.themeText}>{isDarkMode ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
        </View>
      </View>

      <PagerView style={styles.pagerView} initialPage={initialPageIndex} onPageSelected={handlePageChange}>
        {pages.map((pageContent, index) => {
            const noteForThisPage = book.pageNotes ? book.pageNotes[index] : null;
            return (
                <View key={index} style={styles.pageContainer}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 50}}>
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        <Text style={[styles.content, { fontSize: fontSize, color: textStyle, lineHeight: fontSize * 1.6 }]}>
                            {pageContent}
                        </Text>
                        {noteForThisPage && (
                            <TouchableOpacity onPress={openNoteModal} style={styles.stickyNote}>
                                <Text style={styles.stickyNoteTitle}>📝 Ghi chú trang này:</Text>
                                <Text style={styles.stickyNoteContent}>{noteForThisPage}</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            )
        })}
      </PagerView>

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
  headerSpacer: { height: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { padding: 5, paddingRight: 15 },
  settings: { flexDirection: 'row', alignItems: 'center' },
  btn: { marginHorizontal: 3, padding: 4 },
  speakingBtn: { backgroundColor: '#ffebee', borderRadius: 5 },
  btnIcon: { fontSize: 20 },
  btnText: { fontSize: 18, fontWeight: 'bold' },
  themeBtn: { backgroundColor: '#eee', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  themeText: { fontSize: 16 },
  
  // PDF LOADING
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // FILE VIEW
  fileContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  fileIcon: { fontSize: 80, marginBottom: 20 },
  fileTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#333' },
  fileSub: { fontSize: 16, color: '#666', marginBottom: 40 },
  openBtn: { backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  openBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  noteText: { marginTop: 30, textAlign: 'center', color: '#888', fontSize: 13, fontStyle: 'italic', maxWidth: '80%' },

  // TEXT READER STYLES
  pagerView: { flex: 1 },
  pageContainer: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  bookTitle: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  content: { textAlign: 'justify' },
  stickyNote: { backgroundColor: '#fff9c4', padding: 15, borderRadius: 10, marginTop: 20, borderLeftWidth: 5, borderLeftColor: '#fbc02d', marginBottom: 20 },
  stickyNoteTitle: { fontWeight: 'bold', color: '#f57f17', marginBottom: 5, fontSize: 12 },
  stickyNoteContent: { color: '#333', fontStyle: 'italic', lineHeight: 20 },
  footer: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 0 : 0 },
  progressBarBg: { width: 100, height: 4, backgroundColor: '#eee', borderRadius: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%', minHeight: '40%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  noteInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 15, textAlignVertical: 'top', fontSize: 16, marginBottom: 20, minHeight: 100 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  cancelBtn: { backgroundColor: '#eee' },
  saveBtn: { backgroundColor: '#007AFF' },
  btnTextSmall: { fontWeight: 'bold' }
});

export default ReadBookScreen;