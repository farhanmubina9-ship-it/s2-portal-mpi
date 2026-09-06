import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jkduklbnaspnsuluzkkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZHVrbGJuYXNwbnN1bHV6a2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2Njc1OTEsImV4cCI6MjEwNDI0MzU5MX0.9y8KoG62wst56kND1y0ikpF2HHs3Z4-ZdbbMfnhZIYw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
