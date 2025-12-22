import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import initialBooks from '../data/initialBooks.json'; 

// 1. ĐỊNH NGHĨA DANH SÁCH CẤP BẬC (Export ra để Dashboard dùng)
export const RANKS = [
    { id: 1, minMinutes: 0, title: "Người Mới", icon: "🌱", message: "Hành trình vạn dặm bắt đầu từ trang sách đầu tiên." },
    { id: 2, minMinutes: 30, title: "Tập Sự", icon: "🐛", message: "Bạn đã bắt đầu hình thành thói quen đọc sách!" },
    { id: 3, minMinutes: 120, title: "Mọt Sách", icon: "📚", message: "Kiến thức của bạn đang dày lên từng ngày." },
    { id: 4, minMinutes: 300, title: "Học Giả", icon: "🎓", message: "Sự uyên bác toát ra từ con người bạn." },
    { id: 5, minMinutes: 600, title: "Đại Sư", icon: "🧙‍♂️", message: "Bạn là kho tàng tri thức sống!" },
    { id: 6, minMinutes: 1000, title: "Huyền Thoại", icon: "👑", message: "Đỉnh cao trí tuệ! Không ai sánh kịp." },
];

const useBookStore = create(
  persist(
    (set, get) => ({
      books: [],
      readingGoal: 10,
      
      // --- DỮ LIỆU THỐNG KÊ ---
      dailyReadingStats: {}, // { "2023-12-01": 30 }
      totalMinutesRead: 0,   // 👇 MỚI: Tổng thời gian đọc tích lũy toàn bộ (để tính Rank)
      
      // --- CÀI ĐẶT NHẮC NHỞ ---
      reminderTime: null, 
      isReminderEnabled: false,

      // --- INIT DATA ---
      initData: () => {
        const currentBooks = get().books;
        if (currentBooks.length === 0) set({ books: initialBooks });
      },

      setReadingGoal: (number) => set({ readingGoal: number }),
      
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

      // --- 🔥 QUAN TRỌNG: CẬP NHẬT LỊCH SỬ ĐỌC & TÍNH RANK ---
      // Hàm này đã được viết lại để trả về 'newRank' nếu người dùng lên cấp
      addReadingSession: (bookId, minutes) => {
        const state = get(); // Lấy state hiện tại để tính toán trước
        
        // 1. Tính tổng thời gian mới
        const currentTotal = state.totalMinutesRead || 0;
        const newTotal = currentTotal + minutes;

        // 2. Kiểm tra Rank cũ và Rank mới
        // slice().reverse() để tìm từ rank cao nhất xuống thấp nhất
        const oldRank = RANKS.slice().reverse().find(r => currentTotal >= r.minMinutes) || RANKS[0];
        const newRank = RANKS.slice().reverse().find(r => newTotal >= r.minMinutes) || RANKS[0];

        // 3. Cập nhật sách
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

        // 4. Cập nhật thống kê ngày
        const todayKey = new Date().toISOString().split('T')[0];
        const updatedDailyStats = { ...state.dailyReadingStats };
        updatedDailyStats[todayKey] = (updatedDailyStats[todayKey] || 0) + minutes;

        // 5. Lưu tất cả vào Store
        set({
            books: updatedBooks,
            dailyReadingStats: updatedDailyStats,
            totalMinutesRead: newTotal, // Lưu tổng thời gian mới
        });

        // 6. Trả về Rank mới nếu có sự thăng cấp (để UI hiện Modal chúc mừng)
        if (newRank.id > oldRank.id) {
            return newRank; 
        }
        return null; // Không lên cấp
      },

      // ... (Các hàm Review/Quote/Note giữ nguyên) ...
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

      // --- RESTORE DATA (Đã cập nhật để nạp đủ dữ liệu) ---
      restoreData: (newData) => {
        set((state) => ({
            ...state,
            books: newData.books || [],
            dailyReadingStats: newData.dailyReadingStats || {}, // Fix đúng key
            totalMinutesRead: newData.totalMinutesRead || 0,    // Nạp lại tổng thời gian
            readingGoal: newData.readingGoal || 10,
            isReminderEnabled: newData.isReminderEnabled || false,
            reminderTime: newData.reminderTime || null
        }));
      },
    }),
    {
      name: 'book-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useBookStore;