// File: src/store/useBookStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useBookStore = create(
  persist(
    (set) => ({
      books: [],
      addBook: (newBook) => set((state) => ({ books: [newBook, ...state.books] })),
      removeBook: (id) => set((state) => ({ books: state.books.filter((book) => book.id !== id) })),
      updateBook: (id, updatedInfo) => set((state) => ({
        books: state.books.map((book) => book.id === id ? { ...book, ...updatedInfo } : book)
      })),
    }),
    {
      name: 'book-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useBookStore;