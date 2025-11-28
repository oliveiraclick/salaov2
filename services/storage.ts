
import { Service, Product, Employee, ShopSettings, Appointment, SalonMetadata, Client, Transaction, Coupon, Tenant, SaasPlan } from '../types';

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
  },
  {
    id: '4',
    slug: 'corte-kids',
    name: 'Corte Kids',
    category: 'Infantil',
    coverUrl: 'https://images.unsplash.com/photo-1596441701389-13824f128e4e?auto=format&fit=crop&q=80&w=800',
    rating: 5.0,
    location: 'Shopping Plaza'
  }
];

// --- SAAS TENANT MOCK DATA ---
const getMockTenants = (): Tenant[] => {
  return [
    { id: '1', slug: 'barbearia-vintage', ownerName: 'João Silva', email: 'joao@vintage.com', plan: 'Pro', status: 'active', mrr: 99.00, createdAt: Date.now() - 100000000 },
    { id: '2', slug: 'studio-divas', ownerName: 'Ana Souza', email: 'ana@divas.com', plan: 'Enterprise', status: 'active', mrr: 199.00, createdAt: Date.now() - 50000000 },
    { id: '3', slug: 'esmalteria-colors', ownerName: 'Maria Oliveira', email: 'maria@colors.com', plan: 'Start', status: 'active', mrr: 0, createdAt: Date.now() - 20000000 },
    { id: '4', slug: 'corte-kids', ownerName: 'Pedro Santos', email: 'pedro@kids.com', plan: 'Pro', status: 'active', mrr: 99.00, createdAt: Date.now() - 10000000 }
  ];
};

const getMockPlans = (): SaasPlan[] => {
  return [
    { 
      id: '1', 
      name: 'Start', 
      price: 0, 
      features: ['Agenda Simples', 'Link Personalizado', 'Até 50 agendamentos/mês'], 
      isRecommended: false 
    },
    { 
      id: '2', 
      name: 'Pro', 
      price: 99, 
      features: ['Agenda Ilimitada', 'Controle Financeiro', 'Gestão de Estoque', 'Site Próprio'], 
      isRecommended: true 
    },
    { 
      id: '3', 
      name: 'Enterprise', 
      price: 199, 
      features: ['Múltiplos Profissionais', 'Dashboard Avançado', 'Campanhas de Marketing', 'Suporte Prioritário'], 
      isRecommended: false 
    }
  ];
};

// --- TENANT MANAGEMENT ---

export const getTenants = (): Tenant[] => {
  const data = localStorage.getItem(SAAS_KEYS.TENANTS);
  const parsed = safeParse<Tenant[] | null>(data, null);
  if (parsed) return parsed;
  
  const mock = getMockTenants();
  saveTenants(mock);
  return mock;
};

export const saveTenants = (tenants: Tenant[]) => {
  localStorage.setItem(SAAS_KEYS.TENANTS, JSON.stringify(tenants));
};

export const addTenant = (tenant: Tenant) => {
  const tenants = getTenants();
  tenants.push(tenant);
  saveTenants(tenants);
};

// --- SAAS PLANS MANAGEMENT ---

export const getSaasPlans = (): SaasPlan[] => {
  const data = localStorage.getItem(SAAS_KEYS.PLANS);
  const parsed = safeParse<SaasPlan[] | null>(data, null);
  if (parsed) return parsed;
  
  const mock = getMockPlans();
  saveSaasPlans(mock);
  return mock;
};

export const saveSaasPlans = (plans: SaasPlan[]) => {
  localStorage.setItem(SAAS_KEYS.PLANS, JSON.stringify(plans));
};


// --- TENANT MOCK DATA GENERATORS ---

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
      { 
        id: '1', 
        name: 'Pomada Matte', 
        price: 45, 
        stock: 20, 
        description: 'Alta fixação com efeito seco.',
        photoUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300'
      },
      { 
        id: '2', 
        name: 'Óleo para Barba', 
        price: 35, 
        stock: 15, 
        description: 'Hidratação e brilho para barbas longas.',
        photoUrl: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=300' 
      }
    ];
  } else {
    return [
      { 
        id: '1', 
        name: 'Kit Shampoo + Cond.', 
        price: 85, 
        stock: 10, 
        description: 'Linha profissional para uso diário.',
        photoUrl: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&q=80&w=300'
      },
      { 
        id: '2', 
        name: 'Máscara Capilar', 
        price: 60, 
        stock: 8, 
        description: 'Reconstrução intensiva em 5 minutos.',
        photoUrl: 'https://images.unsplash.com/photo-1556228720-19173eb878f4?auto=format&fit=crop&q=80&w=300'
      }
    ];
  }
};

const getMockEmployees = (type: string): Employee[] => {
  if (type.includes('barbearia')) {
    return [
      { id: '1', name: 'Carlos Navalha', role: 'Barbeiro', bio: 'Especialista em cortes clássicos.', photoUrl: 'https://images.unsplash.com/photo-1580974511632-6019a5605d8f?auto=format&fit=crop&q=80&w=300' }
    ];
  } else {
    return [
      { id: '1', name: 'Ana Beauty', role: 'Cabeleireira', bio: 'Especialista em coloração.', photoUrl: 'https://images.unsplash.com/photo-1595152452543-e5cca283f588?auto=format&fit=crop&q=80&w=300' }
    ];
  }
};

// --- STORAGE FUNCTIONS ---

export const getPlatformSalons = (): SalonMetadata[] => {
  return MOCK_PLATFORM_SALONS;
};

export const getServices = (): Service[] => {
  const key = getKey(KEYS.SERVICES);
  const data = localStorage.getItem(key);
  const parsed = safeParse<Service[] | null>(data, null);
  
  if (parsed) return parsed;
  
  const mock = getMockServices(currentNamespace);
  saveServices(mock);
  return mock;
};

export const saveServices = (services: Service[]) => {
  localStorage.setItem(getKey(KEYS.SERVICES), JSON.stringify(services));
};

export const getProducts = (): Product[] => {
  const key = getKey(KEYS.PRODUCTS);
  const data = localStorage.getItem(key);
  const parsed = safeParse<Product[] | null>(data, null);
  
  if (parsed) return parsed;

  const mock = getMockProducts(currentNamespace);
  saveProducts(mock);
  return mock;
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem(getKey(KEYS.PRODUCTS), JSON.stringify(products));
};

export const getEmployees = (): Employee[] => {
  const key = getKey(KEYS.EMPLOYEES);
  const data = localStorage.getItem(key);
  const parsed = safeParse<Employee[] | null>(data, null);
  
  if (parsed) return parsed;

  const mock = getMockEmployees(currentNamespace);
  saveEmployees(mock);
  return mock;
};

export const saveEmployees = (employees: Employee[]) => {
  localStorage.setItem(getKey(KEYS.EMPLOYEES), JSON.stringify(employees));
};

export const getAppointments = (): Appointment[] => {
  const key = getKey(KEYS.APPOINTMENTS);
  const data = localStorage.getItem(key);
  return safeParse<Appointment[]>(data, []);
};

export const saveAppointments = (appointments: Appointment[]) => {
  localStorage.setItem(getKey(KEYS.APPOINTMENTS), JSON.stringify(appointments));
};

export const getSettings = (): ShopSettings => {
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

export const saveSettings = (settings: ShopSettings) => {
  localStorage.setItem(getKey(KEYS.SETTINGS), JSON.stringify(settings));
};

export const incrementViews = (): number => {
  const settings = getSettings();
  settings.views = (settings.views || 0) + 1;
  saveSettings(settings);
  return settings.views;
};

// --- NEW FINANCIAL & CLIENT FUNCTIONS ---

export const getClients = (): Client[] => {
  const key = getKey(KEYS.CLIENTS);
  const data = localStorage.getItem(key);
  return safeParse<Client[]>(data, []);
};

export const saveClient = (client: Client) => {
  const clients = getClients();
  const index = clients.findIndex(c => c.phone === client.phone); // Use phone as unique ID key
  if (index >= 0) {
    clients[index] = client;
  } else {
    clients.push(client);
  }
  localStorage.setItem(getKey(KEYS.CLIENTS), JSON.stringify(clients));
};

export const getTransactions = (): Transaction[] => {
  const key = getKey(KEYS.TRANSACTIONS);
  const data = localStorage.getItem(key);
  return safeParse<Transaction[]>(data, []);
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(getKey(KEYS.TRANSACTIONS), JSON.stringify(transactions));
};

export const addTransaction = (transaction: Transaction) => {
  const list = getTransactions();
  list.push(transaction);
  saveTransactions(list);
};

export const getCoupons = (): Coupon[] => {
  const key = getKey(KEYS.COUPONS);
  const data = localStorage.getItem(key);
  return safeParse<Coupon[]>(data, []);
};

export const saveCoupons = (coupons: Coupon[]) => {
  localStorage.setItem(getKey(KEYS.COUPONS), JSON.stringify(coupons));
};