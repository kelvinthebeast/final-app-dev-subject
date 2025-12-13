import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import initialBooks from '../data/initialBooks.json'; 

const useBookStore = create(
  persist(
    (set, get) => ({
      books: [],
      readingGoal: 10,

      // Init Data
      initData: () => {
        const currentBooks = get().books;
        if (currentBooks.length === 0) {
          set({ books: initialBooks });
        }
      },

      setReadingGoal: (number) => set({ readingGoal: number }),
      
      addBook: (newBook) => set((state) => ({
        // Thêm trường lastPageRead: 0 mặc định
        books: [{ ...newBook, minutesRead: 0, sessions: 0, lastPageRead: 0, quotes: [] }, ...state.books] 
      })),

      removeBook: (id) => set((state) => ({
        books: state.books.filter((book) => book.id !== id)
      })),

      updateBook: (id, updatedInfo) => set((state) => ({
        books: state.books.map((book) => 
          book.id === id ? { ...book, ...updatedInfo } : book
        )
      })),

    //   / --- MỚI: LƯU GHI CHÚ THEO TRANG ---
      savePageNote: (bookId, pageIndex, noteContent) => set((state) => ({
        books: state.books.map((book) => {
          if (book.id === bookId) {
            // Lấy danh sách note cũ
            const currentNotes = book.pageNotes || {};
            // Cập nhật note cho trang này (pageIndex chuyển thành string làm key)
            const updatedNotes = { ...currentNotes, [pageIndex]: noteContent };
            
            return { ...book, pageNotes: updatedNotes };
          }
          return book;
        })
      })),
      // --- MỚI: LƯU TRANG ĐANG ĐỌC ---
      savePageProgress: (bookId, pageIndex) => set((state) => ({
        books: state.books.map((book) => 
          book.id === bookId ? { ...book, lastPageRead: pageIndex, lastRead: new Date().toISOString() } : book
        )
      })),
      // -------------------------------

      addReadingSession: (bookId, minutes) => set((state) => ({
        books: state.books.map((book) => {
          if (book.id === bookId) {
            return {
              ...book,
              minutesRead: (book.minutesRead || 0) + minutes,
              sessions: (book.sessions || 0) + 1,
            };
          }
          return book;
        })
      })),

      addQuote: (bookId, content) => set((state) => ({
        books: state.books.map((book) => {
          if (book.id === bookId) {
            const newQuote = { id: Date.now().toString(), content, date: new Date().toISOString() };
            const currentQuotes = book.quotes || [];
            return { ...book, quotes: [newQuote, ...currentQuotes] };
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

      resetStore: () => set({ books: [] }),
    }),
    {
      name: 'book-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useBookStore;