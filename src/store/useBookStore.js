import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import initialBooks from '../data/initialBooks.json'; 

const useBookStore = create(
  persist(
    (set, get) => ({
      books: [],
      readingGoal: 10,
      
      // --- DỮ LIỆU MỚI CHO BIỂU ĐỒ ---
      // Lưu dạng: { "2023-12-01": 30, "2023-12-02": 15 } (Ngày: Số phút)
      dailyReadingStats: {},
      
      // --- CÀI ĐẶT NHẮC NHỞ ---
      reminderTime: null, // Giờ nhắc (ví dụ: { hour: 20, minute: 0 })
      isReminderEnabled: false,

      // --- INIT DATA ---
      initData: () => {
        const currentBooks = get().books;
        if (currentBooks.length === 0) set({ books: initialBooks });
      },

      setReadingGoal: (number) => set({ readingGoal: number }),
      
      // Cập nhật trạng thái nhắc nhở
      setReminder: (enabled, time) => set({ isReminderEnabled: enabled, reminderTime: time }),

      addBook: (newBook) => set((state) => ({
        books: [{ ...newBook, minutesRead: 0, sessions: 0, lastPageRead: 0, quotes: [], pageNotes: {} }, ...state.books] 
      })),

      removeBook: (id) => set((state) => ({
        books: state.books.filter((book) => book.id !== id)
      })),

      updateBook: (id, updatedInfo) => set((state) => ({
        books: state.books.map((book) => book.id === id ? { ...book, ...updatedInfo } : book)
      })),

      savePageProgress: (bookId, pageIndex) => set((state) => ({
        books: state.books.map((book) => book.id === bookId ? { ...book, lastPageRead: pageIndex, lastRead: new Date().toISOString() } : book)
      })),

      // --- QUAN TRỌNG: CẬP NHẬT LỊCH SỬ ĐỌC CHO BIỂU ĐỒ ---
      addReadingSession: (bookId, minutes) => set((state) => {
        // 1. Cập nhật sách
        const updatedBooks = state.books.map((book) => {
          if (book.id === bookId) {
            return {
              ...book,
              minutesRead: (book.minutesRead || 0) + minutes,
              sessions: (book.sessions || 0) + 1,
            };
          }
          return book;
        });

        // 2. Cập nhật thống kê ngày (YYYY-MM-DD)
        const todayKey = new Date().toISOString().split('T')[0];
        const currentDailyStats = { ...state.dailyReadingStats };
        
        // Cộng dồn phút vào ngày hôm nay
        currentDailyStats[todayKey] = (currentDailyStats[todayKey] || 0) + minutes;

        return { 
          books: updatedBooks,
          dailyReadingStats: currentDailyStats
        };
      }),

      // ... (Các hàm quote, log cũ giữ nguyên)
      addReview: (bookId, content, rating) => set((state) => ({
        books: state.books.map((book) => {
          if (book.id === bookId) {
            const newReview = { id: Date.now().toString(), content, date: new Date().toISOString().split('T')[0] };
            return { ...book, reviews: [newReview, ...(book.reviews || [])] };
          }
          return book;
        })
      })),

      addQuote: (bookId, content) => set((state) => ({
        books: state.books.map((book) => {
          if (book.id === bookId) {
            const newQuote = { id: Date.now().toString(), content, date: new Date().toISOString() };
            return { ...book, quotes: [newQuote, ...(book.quotes || [])] };
          }
          return book;
        })
      })),

      deleteQuote: (bookId, quoteId) => set((state) => ({
        books: state.books.map((book) => {
          if (book.id === bookId && book.quotes) {
            return { ...book, quotes: book.quotes.filter(q => q.id !== quoteId) };
          }
          return book;
        })
      })),

      savePageNote: (bookId, pageIndex, noteContent) => set((state) => ({
        books: state.books.map((book) => {
          if (book.id === bookId) {
            const updatedNotes = { ...(book.pageNotes || {}), [pageIndex]: noteContent };
            return { ...book, pageNotes: updatedNotes };
          }
          return book;
        })
      })),

      resetStore: () => set({ books: [], dailyReadingStats: {} }),
    }),
    {
      name: 'book-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useBookStore;