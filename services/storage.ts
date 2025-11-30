
import { Service, Product, Employee, ShopSettings, Appointment, SalonMetadata, Client, Transaction, Coupon, Tenant, SaasPlan } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

// --- NAMESPACE MANAGEMENT ---
let currentNamespace = 'demo_salon';

export const setCurrentNamespace = (slug: string) => {
  currentNamespace = slug;
};

export const getCurrentNamespace = () => currentNamespace;

const getKey = (key: string) => `${currentNamespace}_${key}`;

const KEYS = {
  SERVICES: 'services',
  PRODUCTS: 'products',
  EMPLOYEES: 'employees',
  SETTINGS: 'settings',
  APPOINTMENTS: 'appointments',
  CLIENTS: 'clients',
  TRANSACTIONS: 'transactions',
  COUPONS: 'coupons',
};

const SAAS_KEYS = {
  TENANTS: 'saas_tenants',
  PLANS: 'saas_plans'
};

// --- HELPER ---
const safeParse = <T>(data: string | null, fallback: T): T => {
  if (!data) return fallback;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.warn('Error parsing storage data:', error);
    return fallback;
  }
};

// --- PLATFORM MOCK DATA (MARKETPLACE) ---
// Note: In a real scenario, we would fetch from 'tenants' table and map to metadata
export const MOCK_PLATFORM_SALONS: SalonMetadata[] = [
  {
    id: '1',
    slug: 'barbearia-vintage',
    name: 'Barbearia Vintage',
    category: 'Barbearia',
    coverUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800',
    rating: 4.8,
    location: 'Centro'
  },
  {
    id: '2',
    slug: 'studio-divas',
    name: 'Studio Divas',
    category: 'Salão de Beleza',
    coverUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800',
    rating: 4.9,
    location: 'Jardins'
  },
  {
    id: '3',
    slug: 'esmalteria-colors',
    name: 'Esmalteria Colors',
    category: 'Manicure',
    coverUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=800',
    rating: 4.7,
    location: 'Vila Madalena'
  }
];

// --- MOCK DATA GENERATORS ---
const getMockServices = (type: string): Service[] => {
  if (type.includes('barbearia')) {
    return [
      { id: '1', name: 'Corte Clássico', price: 50, duration: 40, description: 'Corte tradicional com tesoura e máquina.' },
      { id: '2', name: 'Barba Terapia', price: 35, duration: 30, description: 'Modelagem de barba com toalha quente.' }
    ];
  } else {
    return [
      { id: '1', name: 'Corte Feminino', price: 120, duration: 60, description: 'Corte, lavagem e finalização.' },
      { id: '2', name: 'Manicure', price: 40, duration: 45, description: 'Cuticulagem e esmaltação completa.' }
    ];
  }
};

const getMockProducts = (type: string): Product[] => {
  if (type.includes('barbearia')) {
    return [
      { id: '1', name: 'Pomada Matte', price: 45, stock: 20, description: 'Alta fixação com efeito seco.', photoUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300' },
      { id: '2', name: 'Óleo para Barba', price: 35, stock: 15, description: 'Hidratação e brilho para barbas longas.', photoUrl: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=300' }
    ];
  } else {
    return [
      { id: '1', name: 'Kit Shampoo + Cond.', price: 85, stock: 10, description: 'Linha profissional para uso diário.', photoUrl: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&q=80&w=300' },
      { id: '2', name: 'Máscara Capilar', price: 60, stock: 8, description: 'Reconstrução intensiva em 5 minutos.', photoUrl: 'https://images.unsplash.com/photo-1556228720-19173eb878f4?auto=format&fit=crop&q=80&w=300' }
    ];
  }
};

const getMockEmployees = (type: string): Employee[] => {
  if (type.includes('barbearia')) {
    return [{ id: '1', name: 'Carlos Navalha', role: 'Barbeiro', bio: 'Especialista em cortes clássicos.', photoUrl: 'https://images.unsplash.com/photo-1580974511632-6019a5605d8f?auto=format&fit=crop&q=80&w=300' }];
  } else {
    return [{ id: '1', name: 'Ana Beauty', role: 'Cabeleireira', bio: 'Especialista em coloração.', photoUrl: 'https://images.unsplash.com/photo-1595152452543-e5cca283f588?auto=format&fit=crop&q=80&w=300' }];
  }
};

const getMockTenants = (): Tenant[] => {
  return [
    { id: '1', slug: 'barbearia-vintage', ownerName: 'João Silva', email: 'joao@vintage.com', plan: 'Pro', status: 'active', mrr: 99.00, city: 'São Paulo', state: 'SP', createdAt: Date.now(), actionCount: 0 },
    { id: '2', slug: 'studio-divas', ownerName: 'Ana Souza', email: 'ana@divas.com', plan: 'Enterprise', status: 'active', mrr: 199.00, city: 'Rio de Janeiro', state: 'RJ', createdAt: Date.now(), actionCount: 0 },
    { id: '3', slug: 'esmalteria-colors', ownerName: 'Maria Oliveira', email: 'maria@colors.com', plan: 'Start', status: 'active', mrr: 0, city: 'Belo Horizonte', state: 'MG', createdAt: Date.now(), actionCount: 29 } // Mock with 29 actions for testing
  ];
};

const getMockPlans = (): SaasPlan[] => {
  return [
    { 
      id: '1', 
      name: 'Start', 
      price: 0, // Legacy support
      basePrice: 0,
      pricePerUser: 0,
      minUsers: 0,
      features: ['Agenda Simples', 'Link Personalizado', 'Até 50 agendamentos/mês'], 
      isRecommended: false,
      actionLimit: 30 // Dynamic limit for 'Start' plan
    },
    { 
      id: '2', 
      name: 'Profissional', 
      price: 29.90, 
      basePrice: 29.90,
      pricePerUser: 10.00,
      minUsers: 1, // Changed from 0 to 1: Includes first employee
      features: ['Agenda Ilimitada', 'Controle Financeiro', 'Gestão de Estoque', 'Site Próprio'], 
      isRecommended: true 
    },
    { 
      id: '3', 
      name: 'Redes', 
      price: 169.90, 
      basePrice: 19.90, // Mais barato na base
      pricePerUser: 10.00,
      minUsers: 11, // Gatilho para cobrar de 11 em diante
      features: ['Múltiplos Profissionais (+10)', 'Dashboard Avançado', 'Campanhas de Marketing', 'Suporte Prioritário'], 
      isRecommended: false 
    }
  ];
};

// --- DATA FETCHING (ASYNC WITH SUPABASE FALLBACK) ---

export const getPlatformSalons = async (): Promise<SalonMetadata[]> => {
  if (isSupabaseConfigured() && supabase) {
    // In a real scenario, we would fetch from 'tenants' table and map to metadata
    const { data, error } = await supabase.from('tenants').select('*');
    if (!error && data && data.length > 0) {
      return data.map((t: any) => ({
        id: t.id,
        slug: t.slug,
        name: t.slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), // Simple formatter
        category: 'Salão Parceiro',
        coverUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800',
        rating: 5.0,
        location: `${t.city || 'Centro'}`
      }));
    }
  }
  return MOCK_PLATFORM_SALONS;
};

export const fetchServices = async (): Promise<Service[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.from('services').select('*').eq('salon_slug', currentNamespace);
    if (data && data.length > 0) return data;
  }
  
  // Fallback LocalStorage
  const key = getKey(KEYS.SERVICES);
  const data = localStorage.getItem(key);
  const parsed = safeParse<Service[] | null>(data, null);
  
  if (parsed) return parsed;
  
  // Mock Initialization
  const mock = getMockServices(currentNamespace);
  persistServices(mock);
  return mock;
};

export const persistServices = async (services: Service[]) => {
  localStorage.setItem(getKey(KEYS.SERVICES), JSON.stringify(services));
  
  if (isSupabaseConfigured() && supabase) {
    // Upsert to Supabase
    // Note: This requires proper ID handling. For now, we assume simple push logic or replace
    // In production, we'd handle upserts carefully. Here we just try to insert new ones or update.
    for (const s of services) {
       await supabase.from('services').upsert({ 
         id: s.id.length < 10 ? undefined : s.id, // Generate UUID if simple ID
         salon_slug: currentNamespace,
         name: s.name,
         price: s.price,
         duration: s.duration,
         description: s.description
       });
    }
  }
};

export const fetchProducts = async (): Promise<Product[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.from('products').select('*').eq('salon_slug', currentNamespace);
    if (data && data.length > 0) return data;
  }

  const key = getKey(KEYS.PRODUCTS);
  const data = localStorage.getItem(key);
  const parsed = safeParse<Product[] | null>(data, null);
  
  if (parsed) return parsed;

  const mock = getMockProducts(currentNamespace);
  persistProducts(mock);
  return mock;
};

export const persistProducts = async (products: Product[]) => {
  localStorage.setItem(getKey(KEYS.PRODUCTS), JSON.stringify(products));
  if (isSupabaseConfigured() && supabase) {
    for (const p of products) {
        await supabase.from('products').upsert({
            id: p.id.length < 10 ? undefined : p.id,
            salon_slug: currentNamespace,
            name: p.name,
            price: p.price,
            stock: p.stock,
            description: p.description,
            photo_url: p.photoUrl
        });
    }
  }
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.from('employees').select('*').eq('salon_slug', currentNamespace);
    if (data && data.length > 0) return data;
  }

  const key = getKey(KEYS.EMPLOYEES);
  const data = localStorage.getItem(key);
  const parsed = safeParse<Employee[] | null>(data, null);
  
  if (parsed) return parsed;

  const mock = getMockEmployees(currentNamespace);
  persistEmployees(mock);
  return mock;
};

export const persistEmployees = async (employees: Employee[]) => {
  localStorage.setItem(getKey(KEYS.EMPLOYEES), JSON.stringify(employees));
  if (isSupabaseConfigured() && supabase) {
     for (const e of employees) {
        await supabase.from('employees').upsert({
            id: e.id.length < 10 ? undefined : e.id,
            salon_slug: currentNamespace,
            name: e.name,
            role: e.role,
            bio: e.bio,
            photo_url: e.photoUrl
        });
     }
  }
};

export const fetchAppointments = async (): Promise<Appointment[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.from('appointments').select('*').eq('salon_slug', currentNamespace);
    if (data) return data.map(d => ({
        ...d,
        serviceId: d.service_id,
        serviceName: d.service_name,
        employeeId: d.employee_id,
        employeeName: d.employee_name,
        clientName: d.client_name,
        clientId: d.client_id,
        totalPrice: d.total_price,
    }));
  }

  const key = getKey(KEYS.APPOINTMENTS);
  const data = localStorage.getItem(key);
  return safeParse<Appointment[]>(data, []);
};

export const persistAppointments = async (appointments: Appointment[]): Promise<boolean> => {
  const allowAction = await _checkAndIncrementTenantActionCount('appointment');
  if (!allowAction) return false;

  localStorage.setItem(getKey(KEYS.APPOINTMENTS), JSON.stringify(appointments));
  if (isSupabaseConfigured() && supabase) {
      // Save last appointment
      const last = appointments[appointments.length - 1];
      if (last) {
          await supabase.from('appointments').upsert({
              id: last.id.length < 10 ? undefined : last.id,
              salon_slug: currentNamespace,
              service_id: last.serviceId,
              service_name: last.serviceName,
              employee_id: last.employeeId,
              employee_name: last.employeeName,
              client_name: last.clientName,
              client_id: last.clientId,
              date: last.date,
              time: last.time,
              price: last.price,
              total_price: last.totalPrice,
              status: last.status,
              products: last.products
          });
      }
  }
  return true;
};

export const fetchSettings = async (): Promise<ShopSettings> => {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.from('settings').select('*').eq('salon_slug', currentNamespace).single();
    if (data) return data;
  }

  const key = getKey(KEYS.SETTINGS);
  const data = localStorage.getItem(key);
  const parsed = safeParse<ShopSettings | null>(data, null);
  
  if (parsed) return parsed;

  const salonName = MOCK_PLATFORM_SALONS.find(s => s.slug === currentNamespace)?.name || 'Meu Salão';
  
  return {
    shopName: salonName,
    address: 'Endereço não configurado',
    phone: '',
    slotDuration: 40,
    openTime: '09:00',
    closeTime: '19:00',
    currency: 'R$',
    views: 0
  };
};

export const persistSettings = async (settings: ShopSettings) => {
  localStorage.setItem(getKey(KEYS.SETTINGS), JSON.stringify(settings));
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('settings').upsert({
      salon_slug: currentNamespace,
      shopName: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      slotDuration: settings.slotDuration,
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      currency: settings.currency,
      views: settings.views
    });
  }
};

export const incrementViews = async (): Promise<number> => {
  const settings = await fetchSettings();
  settings.views = (settings.views || 0) + 1;
  persistSettings(settings); // This will also update Supabase
  return settings.views;
};

// --- CLIENT & FINANCIAL ASYNC ---

export const fetchClients = async (): Promise<Client[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.from('clients').select('*').eq('salon_slug', currentNamespace);
    if (data && data.length > 0) {
      return data.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        birthDate: c.birth_date,
        createdAt: new Date(c.created_at).getTime()
      }));
    }
  }

  const key = getKey(KEYS.CLIENTS);
  const data = localStorage.getItem(key);
  return safeParse<Client[]>(data, []);
};

export const persistClient = async (client: Client) => {
  // Local cache
  const clients = await fetchClients();
  const index = clients.findIndex(c => c.phone === client.phone);
  if (index >= 0) {
    clients[index] = client;
  } else {
    clients.push(client);
  }
  localStorage.setItem(getKey(KEYS.CLIENTS), JSON.stringify(clients));

  // Supabase Sync
  if (isSupabaseConfigured() && supabase) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('salon_slug', currentNamespace)
      .eq('phone', client.phone)
      .maybeSingle();

    const dbClient = {
      id: existing ? existing.id : undefined,
      salon_slug: currentNamespace,
      name: client.name,
      phone: client.phone,
      birth_date: client.birthDate
    };

    await supabase.from('clients').upsert(dbClient);
  }
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase.from('transactions').select('*').eq('salon_slug', currentNamespace);
      if (data) return data;
  }
  const key = getKey(KEYS.TRANSACTIONS);
  const data = localStorage.getItem(key);
  return safeParse<Transaction[]>(data, []);
};

export const persistTransactions = async (transactions: Transaction[]) => {
  localStorage.setItem(getKey(KEYS.TRANSACTIONS), JSON.stringify(transactions));
};

export const addTransaction = async (transaction: Transaction): Promise<boolean> => {
  const allowAction = await _checkAndIncrementTenantActionCount('transaction');
  if (!allowAction) return false;

  const list = await fetchTransactions();
  list.push(transaction);
  persistTransactions(list);
  
  if (isSupabaseConfigured() && supabase) {
      await supabase.from('transactions').insert({
          salon_slug: currentNamespace,
          title: transaction.title,
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category,
          date: transaction.date,
          status: transaction.status
      });
  }
  return true;
};

// --- SAAS ASYNC ---

export const fetchTenants = async (): Promise<Tenant[]> => {
  if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase.from('tenants').select('*');
      if (data) return data.map(d => ({
          ...d,
          ownerName: d.owner_name,
          createdAt: new Date(d.created_at).getTime(),
          actionCount: d.action_count || 0 // Initialize actionCount from DB
      }));
  }
  const data = localStorage.getItem(SAAS_KEYS.TENANTS);
  const parsed = safeParse<Tenant[] | null>(data, null);
  if (parsed) return parsed;
  
  const mock = getMockTenants();
  localStorage.setItem(SAAS_KEYS.TENANTS, JSON.stringify(mock));
  return mock;
};

export const persistTenants = async (tenants: Tenant[]) => {
    localStorage.setItem(SAAS_KEYS.TENANTS, JSON.stringify(tenants));
    
    if (isSupabaseConfigured() && supabase) {
        for (const t of tenants) {
            await supabase.from('tenants').upsert({
                id: t.id.length < 10 ? undefined : t.id,
                slug: t.slug,
                owner_name: t.ownerName,
                email: t.email,
                plan: t.plan,
                status: t.status,
                mrr: t.mrr,
                city: t.city,
                state: t.state,
                action_count: t.actionCount // Persist actionCount to DB
            });
        }
    }
};

export const fetchSaasPlans = async (): Promise<SaasPlan[]> => {
  if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase.from('saas_plans').select('*');
      if (data && data.length > 0) return data.map((p:any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          basePrice: p.base_price, // Map Supabase snake_case to camelCase
          pricePerUser: p.price_per_user,
          minUsers: p.min_users,
          features: p.features,
          isRecommended: p.is_recommended,
          actionLimit: p.action_limit // Map action_limit from Supabase
      }));
  }

  const data = localStorage.getItem(SAAS_KEYS.PLANS);
  const parsed = safeParse<SaasPlan[] | null>(data, null);
  if (parsed) return parsed;
  
  const mock = getMockPlans();
  localStorage.setItem(SAAS_KEYS.PLANS, JSON.stringify(mock));
  return mock;
};

export const persistSaasPlans = async (plans: SaasPlan[]) => {
  localStorage.setItem(SAAS_KEYS.PLANS, JSON.stringify(plans));
  
  if (isSupabaseConfigured() && supabase) {
      for (const p of plans) {
          await supabase.from('saas_plans').upsert({
              id: p.id.length < 10 ? undefined : p.id,
              name: p.name,
              price: p.price,
              base_price: p.basePrice || 0,
              price_per_user: p.pricePerUser || 0,
              min_users: p.minUsers || 0,
              features: p.features,
              is_recommended: p.isRecommended,
              action_limit: p.actionLimit // Persist actionLimit to Supabase
          });
      }
  }
};

/**
 * Internal helper to check and increment tenant action count for 'Start' plan.
 * Returns true if action is allowed, false if limit reached.
 */
const _checkAndIncrementTenantActionCount = async (actionType: 'appointment' | 'transaction'): Promise<boolean> => {
  const currentTenants = await fetchTenants();
  const currentPlans = await fetchSaasPlans();
  const currentSlug = getCurrentNamespace();

  const tenantIndex = currentTenants.findIndex(t => t.slug === currentSlug);
  if (tenantIndex === -1) {
    console.warn(`Tenant with slug ${currentSlug} not found. Action allowed.`);
    return true; // If tenant not found, allow action (shouldn't happen in normal flow)
  }

  const tenant = currentTenants[tenantIndex];
  const plan = currentPlans.find(p => p.name === tenant.plan);

  // Default to a high limit if plan or actionLimit is not defined (e.g., for paid plans)
  const ACTION_LIMIT = plan?.actionLimit !== undefined ? plan.actionLimit : Infinity; 

  // Check only if it's a free plan or a plan with an explicit actionLimit
  const isLimitedPlan = plan?.basePrice === 0 || (plan?.actionLimit !== undefined && plan.actionLimit > 0);

  if (isLimitedPlan) {
    if ((tenant.actionCount || 0) >= ACTION_LIMIT) {
      console.warn(`Tenant ${tenant.slug} on plan '${tenant.plan}' hit action limit of ${ACTION_LIMIT} for ${actionType}.`);
      return false; // Block action
    } else {
      tenant.actionCount = (tenant.actionCount || 0) + 1;
      await persistTenants(currentTenants); // Persist updated tenants
      console.log(`Tenant ${tenant.slug} action count: ${tenant.actionCount}/${ACTION_LIMIT} for plan '${tenant.plan}'`);
      return true; // Allow action
    }
  }
  
  return true; // Not a limited plan, always allow action
};
