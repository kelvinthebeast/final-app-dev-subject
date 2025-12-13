import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. IMPORT FILE JSON
import initialBooks from '../data/initialBooks.json'; 

const useBookStore = create(
  persist(
    (set, get) => ({
      books: [],
      readingGoal: 10,

      // --- ACTIONS CŨ (GIỮ NGUYÊN) ---
      setReadingGoal: (number) => set({ readingGoal: number }),
      
      addBook: (newBook) => set((state) => ({
        books: [{ ...newBook, minutesRead: 0, sessions: 0 }, ...state.books] 
      })),

      removeBook: (id) => set((state) => ({
        books: state.books.filter((book) => book.id !== id)
      })),

      updateBook: (id, updatedInfo) => set((state) => ({
        books: state.books.map((book) => 
          book.id === id ? { ...book, ...updatedInfo } : book
        )
      })),

      addReadingSession: (bookId, minutes) => set((state) => ({
        books: state.books.map((book) => {
          if (book.id === bookId) {
            return {
              ...book,
              minutesRead: (book.minutesRead || 0) + minutes,
              sessions: (book.sessions || 0) + 1,
              lastRead: new Date().toISOString()
            };
          }
          return book;
        })
      })),

      // --- ACTION MỚI: INIT DATA ---
      // Hàm này sẽ được gọi ở màn hình Home
      initData: () => {
        const currentBooks = get().books;
        // Chỉ nạp nếu danh sách đang trống (tránh ghi đè dữ liệu user đang dùng)
        if (currentBooks.length === 0) {
          set({ books: initialBooks });
          console.log("Đã nạp dữ liệu mẫu từ JSON!");
        }
      },
      
      // Hàm reset để test lại từ đầu (nếu cần)
      resetStore: () => set({ books: [] }),
    }),
    {
      name: 'book-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useBookStore;