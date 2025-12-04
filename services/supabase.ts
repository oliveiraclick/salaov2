
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com as credenciais do projeto 'hieynfhbgzwfldbckgpk'
const SUPABASE_URL = 'https://hieynfhbgzwfldbckgpk.supabase.co';
// Chave Service Role fornecida (Acesso Admin ao Banco de Dados)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZXluZmhiZ3p3ZmxkYmNrZ3BrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQ0MTcwMCwiZXhwIjoyMDgwMDE3NzAwfQ.fQyhRsbM_GdIp42PJjACehzPQL2xygbDka_99SOcL6A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const isSupabaseConfigured = () => {
    return true;
};