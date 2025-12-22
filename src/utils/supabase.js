// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Cần cái này để không bị lỗi trên Android

// ⚠️ THAY BẰNG KEY CỦA BẠN (Lấy ở Supabase Dashboard -> Settings -> API)
const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseAnonKey = process.env.SUPABASE_ANONKEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);