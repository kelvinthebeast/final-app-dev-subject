import { useState, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import useBookStore from '../src/store/useBookStore';

export const useReadingLogic = (book, navigation) => {
    const { addReadingSession } = useBookStore();
    
    // State cho Modal chúc mừng
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newRankData, setNewRankData] = useState(null);

    // Refs để tính giờ
    const startTimeRef = useRef(new Date());
    const pdfStartTime = useRef(new Date());
    const appState = useRef(AppState.currentState);

    // Reset giờ khi vào lại màn hình này
    useEffect(() => {
        startTimeRef.current = new Date();
        pdfStartTime.current = new Date();
    }, []);

    // Logic tính giờ cho PDF khi App chạy ngầm (Background)
    useEffect(() => {
        if (!book?.content && book?.fileUri) {
            const subscription = AppState.addEventListener('change', nextAppState => {
                if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                    // Người dùng quay lại App -> Reset mốc tính giờ PDF
                    pdfStartTime.current = new Date();
                }
                appState.current = nextAppState;
            });
            return () => subscription.remove();
        }
    }, [book]);

    // HÀM XỬ LÝ KHI BẤM BACK
    const handleGoBack = () => {
        Speech.stop(); 
        let durationMinutes = 0;

        if (book.content) {
            // Sách Text: Tính từ lúc mở màn hình đến giờ
            const endTime = new Date();
            const durationSeconds = (endTime - startTimeRef.current) / 1000;
            durationMinutes = Math.ceil(durationSeconds / 60);
        } else {
            // Sách PDF: Tính tương đối từ lúc mở
            const now = new Date();
            const diff = (now - pdfStartTime.current) / 1000;
            if (diff > 60) durationMinutes = Math.ceil(diff / 60);
        }

        // Nếu có thời gian đọc -> Lưu vào Store -> Check Rank
        if (durationMinutes > 0) {
            const achievedRank = addReadingSession(book.id, durationMinutes);
            
            if (achievedRank) {
                // Nếu lên cấp -> Hiện Modal, chưa thoát vội
                setNewRankData(achievedRank);
                setShowLevelUp(true);
                return; 
            }
        }
        
        // Không lên cấp thì thoát luôn
        navigation.goBack();
    };

    // Hàm đóng Modal chúc mừng rồi thoát
    const closeLevelUp = () => {
        setShowLevelUp(false);
        navigation.goBack();
    };

    return {
        handleGoBack,
        showLevelUp,
        newRankData,
        closeLevelUp
    };
};