import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, 
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, StatusBar, 
  ActivityIndicator, Dimensions 
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { WebView } from 'react-native-webview'; 
import * as Speech from 'expo-speech'; 
import * as Sharing from 'expo-sharing'; 
import * as FileSystem from 'expo-file-system/legacy'; 
import { useKeepAwake } from 'expo-keep-awake'; 
import useBookStore from '../store/useBookStore';
import LevelUpModal from '../components/LevelUpModal'; 
import { useReadingLogic } from '../../hooks/useReadingLogic'; 

// ❌ BỎ DÒNG IMPORT NÀY ĐI (Không cần nữa)
// import { JSZIP_SOURCE, EPUBJS_SOURCE } from '../utils/EpubReaderScripts';

const { width, height } = Dimensions.get('window');

const ReadBookScreen = ({ route, navigation }) => {
  useKeepAwake();
  const { bookId, targetPage } = route.params;
  const { books, savePageProgress, savePageNote } = useBookStore();
  const book = books.find(b => b.id === bookId);
  const webViewRef = useRef(null);

  const { handleGoBack, showLevelUp, newRankData, closeLevelUp } = useReadingLogic(book, navigation);

  const [fontSize, setFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [secondsRead, setSecondsRead] = useState(0);
  const [viewMode, setViewMode] = useState('paginated'); 

  const initialPageIndex = (targetPage !== undefined) ? targetPage : (book?.lastPageRead || 0);
  const [currentPage, setCurrentPage] = useState(initialPageIndex);
  
  const [fileBase64, setFileBase64] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Đang chuẩn bị...");

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState('');

  if (!book) return null;
  const bgStyle = isDarkMode ? '#1a1a1a' : '#fff';
  const textStyle = isDarkMode ? '#ddd' : '#222';
  const pageNote = book.pageNotes ? book.pageNotes[currentPage] : '';

  // 1. LOAD FILE
  useEffect(() => {
    const loadFile = async () => {
        if (book.fileUri && (book.fileType === 'pdf' || book.fileType === 'epub')) {
            setIsLoadingFile(true);
            setLoadingStatus("Đang đọc file từ máy...");
            try {
                const base64 = await FileSystem.readAsStringAsync(book.fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                setFileBase64(base64);
                setLoadingStatus("Đang xử lý dữ liệu...");
            } catch (error) {
                console.log("Error:", error);
                Alert.alert("Lỗi", "Không đọc được file này.");
            } finally {
                setIsLoadingFile(false);
            }
        }
    };
    if (book.fileType === 'pdf' || book.fileType === 'epub') loadFile();
  }, [book.fileUri]);

  // Timer
  useEffect(() => {
    let timer = setInterval(() => setSecondsRead(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- 🔥 HTML TEMPLATE ONLINE (Dùng Link CDN) ---
  // Thay vì nhúng code dài dòng, ta dùng thẻ <script src="...">
  const epubHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; padding: 0; background-color: ${isDarkMode ? '#121212' : '#ffffff'}; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        #viewer { flex: 1; width: 100%; height: 100%; }
        #loader { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: ${isDarkMode ? '#121212' : '#ffffff'}; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 999; }
        .spinner { border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #007AFF; animation: spin 1s linear infinite; margin-bottom: 10px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { font-family: sans-serif; color: #888; }
      </style>
      
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js"></script>

    </head>
    <body>
      <div id="loader">
        <div class="spinner"></div>
        <p id="status">Đang tải thư viện đọc sách...</p>
      </div>
      <div id="viewer"></div>
      
      <script>
        var book, rendition;

        function loadBook(base64Data, mode) {
            try {
                document.getElementById('status').innerText = "Đang dàn trang...";
                
                setTimeout(function() {
                    if (!base64Data) return;
                    
                    book = ePub("data:application/epub+zip;base64," + base64Data);
                    
                    var options = { width: "100%", height: "100%" };
                    if (mode === 'scrolled') {
                        options.flow = "scrolled"; 
                        options.manager = "continuous";
                    } else {
                        options.flow = "paginated"; 
                        options.manager = "default";
                    }

                    rendition = book.renderTo("viewer", options);
                    
                    var themes = rendition.themes;
                    themes.fontSize("${fontSize}px");
                    if("${isDarkMode}" === "true") {
                        themes.register("dark", { body: { color: "#ddd", background: "#121212" } });
                        themes.select("dark");
                    }

                    rendition.display();
                    
                    rendition.on("rendered", function() {
                        document.getElementById('loader').style.display = 'none';
                        window.ReactNativeWebView.postMessage("READY");
                    });

                }, 100);

            } catch (e) {
                window.ReactNativeWebView.postMessage("ERROR: " + e.message);
            }
        }

        window.prevPage = function() { rendition && rendition.prev(); }
        window.nextPage = function() { rendition && rendition.next(); }
        
        window.changeMode = function(newMode) {
             window.ReactNativeWebView.postMessage("RELOAD");
        }
      </script>
    </body>
    </html>
  `;

  // --- RENDER VIEW PDF & EPUB ---
  if (book.fileType === 'pdf' || book.fileType === 'epub') {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f5f5f5' }]}>
            <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }} />
            
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
                  <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text>
                </TouchableOpacity>

                {book.fileType === 'epub' && !isLoadingFile && (
                    <>
                        <View style={{flexDirection: 'row', gap: 20}}>
                            {viewMode === 'paginated' && (
                                <>
                                    <TouchableOpacity onPress={() => webViewRef.current?.injectJavaScript('window.prevPage(); true;')} style={styles.navBtn}>
                                        <Text style={{fontSize: 24}}>⬅️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => webViewRef.current?.injectJavaScript('window.nextPage(); true;')} style={styles.navBtn}>
                                        <Text style={{fontSize: 24}}>➡️</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                        <TouchableOpacity 
                            onPress={() => setViewMode(prev => prev === 'paginated' ? 'scrolled' : 'paginated')} 
                            style={[styles.btn, {backgroundColor: '#e3f2fd', borderRadius: 8, paddingHorizontal: 8}]}
                        >
                            <Text style={{fontSize: 12, fontWeight: 'bold', color: '#007AFF'}}>
                                {viewMode === 'paginated' ? '📖 Lật trang' : '📜 Cuộn dọc'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {book.fileType === 'pdf' && <Text style={{fontSize: 12, color: '#666'}}>PDF Reader</Text>}
            </View>

            <View style={{flex: 1}}>
                {isLoadingFile ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={{marginTop: 10, color: '#666'}}>{loadingStatus}</Text>
                    </View>
                ) : (
                    <WebView 
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={
                            book.fileType === 'pdf' 
                            ? { data: fileBase64, mimeType: 'application/pdf', baseUrl: '' }
                            : { html: epubHTML, baseUrl: '' } 
                        }
                        style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        onLoadEnd={() => {
                            if (book.fileType === 'epub' && fileBase64) {
                                setTimeout(() => {
                                    webViewRef.current?.injectJavaScript(`loadBook("${fileBase64}", "${viewMode}"); true;`);
                                }, 500); 
                            }
                        }}
                    />
                )}
            </View>
            <LevelUpModal visible={showLevelUp} rank={newRankData} onClose={closeLevelUp} />
        </SafeAreaView>
      );
  }

  // --- RENDER TEXT READER (GIỮ NGUYÊN) ---
  const pages = useMemo(() => {
    if (!book.content) return [];
    const paragraphs = book.content.split('\n');
    let generatedPages = []; let currentPageContent = '';
    const CHAR_LIMIT = (height > 800 ? 1000 : 700) - (fontSize * 10); 
    paragraphs.forEach((para) => {
      if ((currentPageContent.length + para.length) < CHAR_LIMIT) { currentPageContent += para + '\n'; } 
      else { if (currentPageContent.trim().length > 0) generatedPages.push(currentPageContent); currentPageContent = para + '\n'; }
    });
    if (currentPageContent.trim().length > 0) generatedPages.push(currentPageContent);
    return generatedPages.length > 0 ? generatedPages : ["Nội dung quá ngắn."];
  }, [book.content, fontSize]); 

  const handlePageChange = (e) => { setCurrentPage(e.nativeEvent.position); savePageProgress(book.id, e.nativeEvent.position); };
  const toggleSpeech = () => { isSpeaking ? (Speech.stop(), setIsSpeaking(false)) : (Speech.speak(pages[currentPage], { language: 'vi-VN', onDone: ()=>setIsSpeaking(false) }), setIsSpeaking(true)); };
  const openNoteModal = () => { setCurrentNote(pageNote || ''); setModalVisible(true); };
  const saveNote = () => { savePageNote(book.id, currentPage, currentNote); setModalVisible(false); };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgStyle }]}>
       <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }} />
       <View style={[styles.toolbar, { borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
         <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}><Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold' }}>‹ Xong</Text></TouchableOpacity>
         <View style={styles.settings}>
            <TouchableOpacity onPress={openNoteModal} style={styles.btn}><Text style={{fontSize:20}}>{pageNote?'📝':'✍️'}</Text></TouchableOpacity>
            <TouchableOpacity onPress={toggleSpeech} style={[styles.btn, isSpeaking && styles.speakingBtn]}><Text style={{fontSize:20}}>{isSpeaking?'⏹️':'🔊'}</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setFontSize(Math.max(14,fontSize-2))} style={styles.btn}><Text style={[styles.btnText,{color:textStyle}]}>A-</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setFontSize(Math.min(30,fontSize+2))} style={styles.btn}><Text style={[styles.btnText,{color:textStyle}]}>A+</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setIsDarkMode(!isDarkMode)} style={[styles.btn, styles.themeBtn]}><Text>{isDarkMode?'☀️':'🌙'}</Text></TouchableOpacity>
         </View>
       </View>
       <PagerView style={{flex:1}} initialPage={initialPageIndex} onPageSelected={handlePageChange}>
         {pages.map((txt, idx)=>(
           <View key={idx} style={styles.pageContainer}>
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:50}}>
               <Text style={styles.bookTitle}>{book.title}</Text>
               <Text style={[styles.content, {fontSize, color:textStyle, lineHeight:fontSize*1.6}]}>{txt}</Text>
               {book.pageNotes?.[idx] && <View style={styles.stickyNote}><Text style={styles.stickyNoteContent}>📝 {book.pageNotes[idx]}</Text></View>}
             </ScrollView>
           </View>
         ))}
       </PagerView>
       <View style={[styles.footer, {backgroundColor:bgStyle, borderTopColor: isDarkMode?'#333':'#eee'}]}>
          <Text style={{fontSize:12, color:'#888'}}>⏱️ {formatTime(secondsRead)} • {currentPage+1}/{pages.length}</Text>
       </View>
       <Modal transparent visible={modalVisible} animationType="slide"><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Ghi chú</Text><TextInput style={styles.noteInput} multiline value={currentNote} onChangeText={setCurrentNote} autoFocus/><View style={styles.modalButtons}><TouchableOpacity onPress={()=>setModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}><Text>Đóng</Text></TouchableOpacity><TouchableOpacity onPress={saveNote} style={[styles.modalBtn, styles.saveBtn]}><Text style={{color:'#fff'}}>Lưu</Text></TouchableOpacity></View></View></KeyboardAvoidingView></Modal>
       <LevelUpModal visible={showLevelUp} rank={newRankData} onClose={closeLevelUp} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  backBtn: { padding: 5 },
  settings: { flexDirection: 'row' },
  btn: { padding: 5, marginHorizontal: 2 },
  speakingBtn: { backgroundColor: '#ffebee', borderRadius: 5 },
  btnText: { fontSize: 18, fontWeight: 'bold' },
  themeBtn: { backgroundColor: '#eee', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navBtn: { padding: 5 },
  pagerView: { flex: 1 },
  pageContainer: { padding: 20, flex: 1 },
  bookTitle: { textAlign:'center', color:'#888', marginBottom:10, fontSize:12 },
  content: { textAlign: 'justify' },
  stickyNote: { backgroundColor: '#fff9c4', padding: 10, marginTop: 10, borderRadius: 5 },
  stickyNoteContent: { fontStyle: 'italic' },
  footer: { padding: 10, borderTopWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: 300 },
  modalTitle: { fontWeight: 'bold', marginBottom: 10, textAlign:'center' },
  noteInput: { backgroundColor: '#f5f5f5', flex: 1, borderRadius: 10, padding: 10, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', marginTop: 10 },
  modalBtn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 10, margin: 5 },
  cancelBtn: { backgroundColor: '#eee' },
  saveBtn: { backgroundColor: '#007AFF' }
});

export default ReadBookScreen;