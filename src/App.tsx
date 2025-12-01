import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import EmptyState from './components/EmptyState';
import { SaaS_LP, Marketplace, SaaSAdmin } from './components/SaaSViews'; // Import the new components
import { ViewState, SalonMetadata, Service, Appointment, Product, Transaction, Employee, Client, ShopSettings, Tenant, SaasPlan } from './types';
import { getPlatformSalons, setCurrentNamespace, getCurrentNamespace, fetchSettings, fetchServices, fetchEmployees, persistAppointments, fetchAppointments, fetchProducts, addTransaction, fetchClients, persistClient, fetchTransactions, persistServices, persistProducts, persistEmployees, persistSettings, incrementViews, fetchTenants, fetchSaasPlans, persistSaasPlans } from './services/storage';
import { sendFinancialWebhook, saveIntegrationConfig, getIntegrationConfig } from './services/webhook';
import { getLocationContext } from './services/gemini';
import { Calendar, LayoutDashboard, Scissors, Store, Users, Wallet, Settings, Package, Percent, MapPin, Phone, Star, Share2, Lock, ArrowLeft, Clock, Search, ChevronRight, Check, Globe, Zap, Heart, CheckCircle2, X, User, Plus, Minus, Trash2, ShoppingBag, DollarSign, CalendarDays, History, AlertCircle, LogOut, TrendingUp, TrendingDown, Edit2, Camera, Save, BarChart3, Shield, Map as MapIcon, CreditCard, Tag, LayoutGrid, ArrowRight, Smartphone, Play, Loader2, Link } from 'lucide-react'; // Added DollarSign and AlertCircle, aliased Map to MapIcon

// Helper interface for local cart state
interface CartItem {
  product: Product;
  quantity: number;
}

// Categorias ESTRITAS compatíveis com o SaaS Admin Pro (Etapa 4)
const EXPENSE_CATEGORIES = [
  'Servidores e Infra',
  'Domínios e SSL',
  'Desenvolvimento e Design',
  'Marketing e Anúncios',
  'Licenças de Software',
  'Outros'
];

const INCOME_CATEGORIES = [
  'Assinaturas',
  'Venda Vitalícia (LTD)',
  'Serviços Personalizados',
  'Outros'
];

const App: React.FC = () => {
  // Global Loading State
  const [isLoading, setIsLoading] = useState(false);
  
  const [view, setView] = useState<ViewState>(ViewState.SAAS_LP);
  const [activeClientTab, setActiveClientTab] = useState<'home' | 'appointments' | 'store'>('home');
  const [salonName, setSalonName] = useState<string>('');
  
  // State for Admin Modal
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');

  // State for Booking Modal
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null);
  const [selectedEmployeeForBooking, setSelectedEmployeeForBooking] = useState<Employee | null>(null);
  // NEW BOOKING FLOW STEPS: 1: Professional, 2: Date & Time, 3: Decision, 4: Product List, 5: Auth/Info, 6: Success
  const [bookingStep, setBookingStep] = useState(1); 
  const [bookingDate, setBookingDate] = useState<string>(''); 
  const [bookingTime, setBookingTime] = useState<string>('');
  
  // Client Data for Booking
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientBirthDate, setClientBirthDate] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);

  // Client Session (Account Tab)
  const [clientLoggedInPhone, setClientLoggedInPhone] = useState<string | null>(null);
  const [clientLoginInput, setClientLoginInput] = useState('');

  // Cart States
  const [bookingCart, setBookingCart] = useState<CartItem[]>([]);
  const [checkoutAppointment, setCheckoutAppointment] = useState<Appointment | null>(null);
  const [checkoutCart, setCheckoutCart] = useState<CartItem[]>([]);

  // Detect direct link
  const [isDirectLink, setIsDirectLink] = useState(false);

  // --- CRUD STATES ---
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({});

  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});

  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({});

  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactionForm, setTransactionForm] = useState<Partial<Omit<Transaction, 'category'>> & { category?: string }>({ 
      type: 'expense', 
      date: new Date().toISOString().split('T')[0],
      category: 'Outros' 
  });

  const [settingsForm, setSettingsForm] = useState<ShopSettings | null>(null);
  // Integration Settings State
  const [integrationForm, setIntegrationForm] = useState({ projectId: '', apiKey: '', endpoint: 'https://api.saasadminpro.com/v1/transactions' });

  // SaaS Plans CRUD
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<Partial<SaasPlan>>({ features: [] });
  const [featureInput, setFeatureInput] = useState('');
  const [saasTab, setSaasTab] = useState<'overview' | 'partners' | 'plans'>('overview');

  // Marketplace State
  const [showAllSalons, setShowAllSalons] = useState(false);

  // Location Context (Gemini Maps Grounding)
  const [locationContext, setLocationContext] = useState<{text: string, links: {title:string, uri:string}[]}>({ text: '', links: [] });

  // --- DATA STATES (Replaced Memo with State for Async Loading) ---
  const [platformSalons, setPlatformSalons] = useState<SalonMetadata[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentSettings, setCurrentSettings] = useState<ShopSettings>({
    shopName: '', address: '', phone: '', slotDuration: 30, openTime: '', closeTime: '', currency: 'R$', views: 0
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>([]);
  const [randomSalons, setRandomSalons] = useState<SalonMetadata[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null); // New state for current tenant
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); // New state for upgrade modal

  // New states for employee flow
  const [showAddMoreEmployeesModal, setShowAddMoreEmployeesModal] = useState(false);
  const [showPaymentPromptModal, setShowPaymentPromptModal] = useState(false);

  // --- ASYNC DATA LOADING ---
  const refreshData = async () => {
    const [
      s_services, s_products, s_employees, s_appointments, s_clients, s_transactions, s_settings, s_tenants, s_saasPlans
    ] = await Promise.all([
      fetchServices(), fetchProducts(), fetchEmployees(), fetchAppointments(), fetchClients(), fetchTransactions(), fetchSettings(), fetchTenants(), fetchSaasPlans()
    ]);

    setServices(s_services);
    setProducts(s_products);
    setEmployees(s_employees);
    setAppointments(s_appointments);
    setClients(s_clients);
    setTransactions(s_transactions);
    setCurrentSettings(s_settings);
    setSettingsForm(s_settings);
    setSalonName(s_settings.shopName);
    setTenants(s_tenants);
    setSaasPlans(s_saasPlans);

    const activeTenant = s_tenants.find(t => t.slug === getCurrentNamespace());
    setCurrentTenant(activeTenant || null);
    
    // Load integration config
    const integ = getIntegrationConfig();
    if (integ) setIntegrationForm(integ);
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      // Check URL parameters
      const params = new URLSearchParams(window.location.search);
      const salonSlug = params.get('salon');

      // Load Global Data
      const p_salons = await getPlatformSalons();
      setPlatformSalons(p_salons);
      setRandomSalons([...p_salons].sort(() => 0.5 - Math.random()));
      
      const p_tenants = await fetchTenants();
      setTenants(p_tenants);
      
      const p_plans = await fetchSaasPlans();
      setSaasPlans(p_plans);

      // Handle Direct Link
      if (salonSlug) {
        setIsDirectLink(true);
        setCurrentNamespace(salonSlug);
        incrementViews();
        await refreshData();
        setView(ViewState.PUBLIC_SALON);
      } else {
         // Load data for demo namespace anyway
         await refreshData();
      }
      setIsLoading(false);
    };
    init();
  }, []);

  // Reload data when namespace changes or CRUD operations happen (We trigger this manually in handlers usually, but a watcher helps)
  useEffect(() => {
      if (view !== ViewState.SAAS_LP && view !== ViewState.MARKETPLACE) {
          refreshData();
      }
  }, [view, isEditingService, isEditingProduct, isEditingEmployee, isAddingTransaction, checkoutAppointment, showUpgradeModal, showAddMoreEmployeesModal, showPaymentPromptModal]); // Add new modal states to dependencies

  // Load Location Context with Gemini Maps
  useEffect(() => {
    if (view === ViewState.PUBLIC_SALON && currentSettings.address && currentSettings.address !== 'Endereço não configurado' && currentSettings.address.length > 5) {
       getLocationContext(currentSettings.address).then(data => setLocationContext(data));
    } else {
       setLocationContext({ text: '', links: [] });
    }
  }, [view, currentSettings.address]);


  const handleSalonSelect = async (salon: SalonMetadata) => {
    setIsLoading(true);
    setCurrentNamespace(salon.slug);
    setSalonName(salon.name);
    await refreshData();
    setView(ViewState.PUBLIC_SALON);
    setIsLoading(false);
  };

  const handleAdminLogin = () => {
    if (adminPass === 'admin123') { 
      setShowAdminLogin(false);
      setAdminPass('');
      setView(ViewState.DASHBOARD);
    } else if (adminPass === 'saas123') {
      setShowAdminLogin(false);
      setAdminPass('');
      setView(ViewState.SAAS_ADMIN);
      setSaasTab('overview');
    } else {
      alert('Senha incorreta. (Tente: admin123 ou saas123)');
    }
  };

  const handleAdminLogout = () => {
    if (isDirectLink) {
        setView(ViewState.PUBLIC_SALON);
    } else {
        setView(ViewState.SAAS_LP);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: salonName || 'Salão Online',
      text: `Agende seu horário no ${salonName || 'nosso salão'}!`,
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(shareData).catch(console.log);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  };

  // --- ACTIONS ---
  const openWhatsApp = () => {
      const phone = currentSettings.phone.replace(/\D/g, '');
      if (!phone) return alert("WhatsApp não configurado.");
      window.open(`https://wa.me/55${phone}`, '_blank');
  };

  const openMaps = () => {
      const address = currentSettings.address;
      if (!address || address === 'Endereço não configurado') return alert("Endereço não disponível.");
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          callback(dataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CLIENT LOGIC ---
  const handleClientLogin = () => {
      if (clientLoginInput.length < 8) return alert("Digite um telefone válido.");
      setClientLoggedInPhone(clientLoginInput);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
      if (window.confirm("Cancelar agendamento?")) {
          const updatedApps = appointments.map(app => 
              app.id === appointmentId ? { ...app, status: 'cancelled' as const } : app
          );
          await persistAppointments(updatedApps); // This now returns boolean, but we don't need to check for cancellation
          await refreshData();
      }
  };

  // --- BOOKING LOGIC ---
  const openBookingModal = (service: Service) => {
    setSelectedServiceForBooking(service);
    setSelectedEmployeeForBooking(null);
    setBookingCart([]);
    setBookingStep(1); 
    setBookingTime('');
    setClientName('');
    setClientPhone('');
    setClientBirthDate('');
    setIsNewClient(false);
  };

  const closeBookingModal = () => {
    setSelectedServiceForBooking(null);
    setSelectedEmployeeForBooking(null);
    setBookingCart([]);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setClientPhone(val);
      
      const found = clients.find(c => c.phone === val);
      if (found) {
          setClientName(found.name);
          setClientBirthDate(found.birthDate);
          setIsNewClient(false);
      } else {
          setIsNewClient(true);
          setClientName('');
          setClientBirthDate('');
      }
  };

  const updateBookingQuantity = (product: Product, delta: number) => {
    setBookingCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + delta;
        if (newQty <= 0) return prev.filter(item => item.product.id !== product.id);
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      } else if (delta > 0) {
        return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const confirmBooking = async () => {
    if (!selectedServiceForBooking || !selectedEmployeeForBooking || !bookingDate || !bookingTime || !clientPhone) {
      return alert("Preencha todos os campos.");
    }
    // Only require Name/BirthDate if it's a new client
    if (isNewClient && (!clientName || !clientBirthDate)) return alert("Preencha nome e data de nascimento.");

    if (isNewClient) {
        const newClient: Client = {
            id: Date.now().toString(),
            name: clientName,
            phone: clientPhone,
            birthDate: clientBirthDate,
            createdAt: Date.now()
        };
        await persistClient(newClient);
    }

    const finalProductsList: Product[] = [];
    bookingCart.forEach(item => {
        for(let i=0; i<item.quantity; i++) finalProductsList.push(item.product);
    });
    const productsTotal = finalProductsList.reduce((sum, p) => sum + p.price, 0);
    const finalTotal = selectedServiceForBooking.price + productsTotal;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      serviceId: selectedServiceForBooking.id,
      serviceName: selectedServiceForBooking.name,
      employeeId: selectedEmployeeForBooking.id, 
      employeeName: selectedEmployeeForBooking.name,
      employeePhotoUrl: selectedEmployeeForBooking.photoUrl,
      clientName: clientName,
      clientId: clientPhone, 
      date: bookingDate,
      time: bookingTime,
      price: selectedServiceForBooking.price,
      products: finalProductsList,
      totalPrice: finalTotal,
      duration: selectedServiceForBooking.duration,
      status: 'scheduled',
      createdAt: Date.now()
    };

    const currentApps = await fetchAppointments();
    const actionAllowed = await persistAppointments([...currentApps, newAppointment]);
    
    if (!actionAllowed) {
        closeBookingModal();
        setShowUpgradeModal(true);
        return;
    }

    await refreshData();
    setBookingStep(6); 
  };

  // --- CHECKOUT LOGIC ---
  const openCheckoutModal = (appointment: Appointment) => {
    setCheckoutAppointment(appointment);
    setCheckoutCart([]);
  };

  const closeCheckoutModal = () => {
    setCheckoutAppointment(null);
    setCheckoutCart([]);
  };

  const updateCheckoutQuantity = (product: Product, delta: number) => {
    setCheckoutCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + delta;
        if (newQty <= 0) return prev.filter(item => item.product.id !== product.id);
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      } else if (delta > 0) {
        return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const finalizeCheckout = async () => {
      if (!checkoutAppointment) return;
      const currentApps = await fetchAppointments();
      
      const updatedApps = currentApps.map(app => {
          if (app.id === checkoutAppointment.id) {
              const newProducts: Product[] = [];
              checkoutCart.forEach(item => {
                  for(let i=0; i<item.quantity; i++) newProducts.push(item.product);
              });
              const allProducts = [...(app.products || []), ...newProducts];
              const productsTotal = allProducts.reduce((sum, p) => sum + p.price, 0);
              const updatedApp = {
                  ...app,
                  status: 'completed' as const,
                  products: allProducts,
                  totalPrice: app.price + productsTotal
              };

              const richDescription = `[Serviços Personalizados] ${app.serviceName} - Cliente: ${app.clientName}`;
              const transaction: Transaction = {
                  id: Date.now().toString(),
                  title: `Serviço: ${app.clientName}`,
                  amount: updatedApp.totalPrice,
                  type: 'income',
                  category: 'service', // Interno
                  status: 'paid',
                  date: new Date().toISOString().split('T')[0],
                  relatedAppointmentId: app.id
              };
              
              // Call addTransaction and check if allowed
              addTransaction(transaction).then(actionAllowed => {
                  if (!actionAllowed) {
                      closeCheckoutModal();
                      setShowUpgradeModal(true);
                      return;
                  }
                  // If allowed, send webhook
                  sendFinancialWebhook({
                    type: 'RECEITA',
                    category: 'Serviços Personalizados', // Categoria Estrita
                    amount: transaction.amount,
                    date: new Date().toISOString(),
                    description: richDescription
                  });
              });
              return updatedApp;
          }
          return app;
      });
      await persistAppointments(updatedApps);
      await refreshData();
      closeCheckoutModal();
  };

  // --- CRUD HANDLERS ---
  const handleSaveService = async () => {
      if (!serviceForm.name || !serviceForm.price) return alert("Dados incompletos");
      const newService: Service = {
          id: editingServiceId || Date.now().toString(),
          name: serviceForm.name,
          price: Number(serviceForm.price),
          duration: Number(serviceForm.duration) || 30,
          description: serviceForm.description || ''
      };
      const updated = editingServiceId 
          ? services.map(s => s.id === editingServiceId ? newService : s)
          : [...services, newService];
      await persistServices(updated);
      setIsEditingService(false);
      setServiceForm({});
      setEditingServiceId(null);
  };

  const handleDeleteService = async (id: string) => {
      if(window.confirm("Excluir serviço?")) {
          await persistServices(services.filter(s => s.id !== id));
          await refreshData();
      }
  };

  const handleSaveProduct = async () => {
      if (!productForm.name || !productForm.price) return alert("Dados incompletos");
      const newProduct: Product = {
          id: editingProductId || Date.now().toString(),
          name: productForm.name,
          price: Number(productForm.price),
          stock: Number(productForm.stock) || 0,
          description: productForm.description || '',
          photoUrl: productForm.photoUrl || ''
      };
      const updated = editingProductId
          ? products.map(p => p.id === editingProductId ? newProduct : p)
          : [...products, newProduct];
      await persistProducts(updated);
      setIsEditingProduct(false);
      setProductForm({});
      setEditingProductId(null);
  };

  const handleDeleteProduct = async (id: string) => {
       if(window.confirm("Excluir produto?")) {
          await persistProducts(products.filter(p => p.id !== id));
          await refreshData();
      }
  };

  const handleSaveEmployee = async () => {
      if (!employeeForm.name) return alert("Nome obrigatório");
      const newEmp: Employee = {
          id: editingEmployeeId || Date.now().toString(),
          name: employeeForm.name,
          role: employeeForm.role || 'Profissional',
          bio: employeeForm.bio || '',
          photoUrl: employeeForm.photoUrl || ''
      };
      const updated = editingEmployeeId
          ? employees.map(e => e.id === editingEmployeeId ? newEmp : e)
          : [...employees, newEmp];
      await persistEmployees(updated);
      
      // Refresh data to get the updated employees list and current tenant info
      await refreshData(); 

      // After saving, prompt to add more
      setIsEditingEmployee(true); // Keep editing state open
      setEmployeeForm({}); // Clear form for next employee
      setEditingEmployeeId(null); // Reset editing ID
      setShowAddMoreEmployeesModal(true); // Show the "add more" modal
  };

  const handleDeleteEmployee = async (id: string) => {
       if(window.confirm("Excluir profissional?")) {
          await persistEmployees(employees.filter(e => e.id !== id));
          await refreshData();
      }
  };

  const handleSaveTransaction = async () => {
      if (!transactionForm.title || !transactionForm.amount) return alert("Dados obrigatórios");
      const newTrans: Transaction = {
          id: Date.now().toString(),
          title: transactionForm.title,
          amount: Number(transactionForm.amount),
          type: transactionForm.type || 'expense',
          category: 'operational',
          status: 'paid',
          date: transactionForm.date || new Date().toISOString().split('T')[0]
      };
      
      const actionAllowed = await addTransaction(newTrans);
      if (!actionAllowed) {
          setIsAddingTransaction(false);
          setShowUpgradeModal(true);
          return;
      }
      
      const richCategory = transactionForm.category || 'Outros';
      const richDescription = `[${richCategory}] ${transactionForm.title}`;
      
      // Etapa 2: Gatilho de Despesa/Receita Manual
      sendFinancialWebhook({
        type: newTrans.type === 'income' ? 'RECEITA' : 'DESPESA',
        category: richCategory,
        amount: newTrans.amount,
        date: new Date(newTrans.date).toISOString(),
        description: richDescription
      });
      
      setIsAddingTransaction(false);
      setTransactionForm({ type: 'expense', date: new Date().toISOString().split('T')[0], category: 'Outros' });
      await refreshData();
  };

  const handleSaveSettings = async () => {
      if (!settingsForm) return;
      await persistSettings(settingsForm);
      setSalonName(settingsForm.shopName);
      
      // Save Integration Settings (Etapa 1)
      saveIntegrationConfig(integrationForm);
      
      alert("Salvo!");
  };

  const handleSavePlan = async () => {
      if (!planForm.name || planForm.basePrice === undefined) return alert("Dados incompletos");
      const newPlan: SaasPlan = {
          id: editingPlanId || Date.now().toString(),
          name: planForm.name,
          price: planForm.basePrice, // legacy support
          basePrice: Number(planForm.basePrice),
          pricePerUser: Number(planForm.pricePerUser),
          minUsers: Number(planForm.minUsers),
          features: planForm.features || [],
          isRecommended: planForm.isRecommended || false,
          actionLimit: planForm.actionLimit // Include actionLimit
      };
      const updated = editingPlanId
          ? saasPlans.map(p => p.id === editingPlanId ? newPlan : p)
          : [...saasPlans, newPlan];
      await persistSaasPlans(updated);
      setIsEditingPlan(false);
      setPlanForm({ features: [] });
      setEditingPlanId(null);
      await refreshData();
  };

  const handleDeletePlan = async (id: string) => {
      if (window.confirm("Excluir plano?")) {
          await persistSaasPlans(saasPlans.filter(p => p.id !== id));
          setSaasPlans(prev => prev.filter(p => p.id !== id));
      }
  };

  // --- RENDER HELPERS ---
  const handleAddFeature = () => {
      if (!featureInput.trim()) return;
      setPlanForm(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }));
      setFeatureInput('');
  };
  const handleRemoveFeature = (idx: number) => {
      setPlanForm(prev => ({ ...prev, features: (prev.features || []).filter((_, i) => i !== idx) }));
  };

  // Helper to check and show payment prompt AFTER employee operations
  const checkAndShowPaymentPrompt = () => {
    if (currentTenant && currentTenant.plan) {
        const tenantPlan = saasPlans.find(p => p.name === currentTenant.plan);
        if (tenantPlan && tenantPlan.basePrice && tenantPlan.basePrice > 0) { // Check if it's a PAID plan
            const currentEmployeeCount = employees.length;
            const minUsers = tenantPlan.minUsers || 0;
            if (currentEmployeeCount > minUsers) {
                setShowPaymentPromptModal(true);
            }
        }
    }
  };

  // --- UI RENDER FUNCTIONS ---

  const renderDashboard = () => {
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const totalRevenue = completedAppointments.reduce((acc, curr) => acc + curr.totalPrice, 0);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
             <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
                <h1 className="text-xl font-black text-slate-800">Início</h1>
                <button onClick={handleAdminLogout} className="text-xs font-bold text-rose-600 bg-rose-50 px-4 py-2 rounded-full hover:bg-rose-100 transition-colors">Sair</button>
             </header>

             <div className="px-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Faturamento</p>
                        <p className="text-2xl font-black text-emerald-600">R$ {totalRevenue}</p>
                    </div>
                    <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Agendamentos</p>
                        <p className="text-2xl font-black text-slate-800">{totalAppointments}</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4">Próximos Clientes</h3>
                    {appointments.filter(a => a.status === 'scheduled').length > 0 ? (
                        <div className="space-y-3">
                            {appointments.filter(a => a.status === 'scheduled').slice(0, 3).map(app => (
                                <div key={app.id} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold">{app.clientName?.charAt(0)}</div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{app.clientName}</p>
                                                <p className="text-xs text-slate-400">{app.serviceName} • {app.time}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => openCheckoutModal(app)} className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 hover:bg-emerald-600 transition-colors shadow-sm">
                                            <Check size={14} /> Atender
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-center text-slate-400 text-sm py-4">Agenda livre.</p>}
                </div>
             </div>
        </div>
    );
  };

  const renderServices = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-slate-800">Serviços</h2>
              <button onClick={() => { setServiceForm({}); setEditingServiceId(null); setIsEditingService(true); }} className="bg-rose-600 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg">
                  <Plus size={20} />
              </button>
          </header>
          <div className="px-4">
              {isEditingService ? (
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                      <h3 className="font-bold text-slate-800">{editingServiceId ? 'Editar' : 'Novo'}</h3>
                      <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" placeholder="Nome" value={serviceForm.name || ''} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                      <div className="flex gap-4">
                          <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" placeholder="Preço" value={serviceForm.price || ''} onChange={e => setServiceForm({...serviceForm, price: Number(e.target.value)})} />
                          <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" placeholder="Minutos" value={serviceForm.duration || ''} onChange={e => setServiceForm({...serviceForm, duration: Number(e.target.value)})} />
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setIsEditingService(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                          <button onClick={handleSaveService} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {services.map(s => (
                          <div key={s.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                              <div><h4 className="font-bold text-slate-800">{s.name}</h4><p className="text-xs text-slate-400">{s.duration} min • R$ {s.price}</p></div>
                              <div className="flex gap-2">
                                  <button onClick={() => { setServiceForm(s); setEditingServiceId(s.id); setIsEditingService(true); }} className="p-2 bg-slate-50 text-slate-600 rounded-xl"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDeleteService(s.id)} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
  );

  const renderProducts = () => (
      <div className="space-y-6 pb-20">
           <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-slate-800">Produtos</h2>
              <button onClick={() => { setProductForm({}); setEditingProductId(null); setIsEditingProduct(true); }} className="bg-rose-600 text-white p-2 rounded-full"><Plus/></button>
           </header>
           <div className="px-4">
              {isEditingProduct ? (
                  <div className="bg-white p-6 rounded-[2rem] space-y-4">
                      <div className="flex items-center gap-4 mb-2">
                          <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden relative">
                              {productForm.photoUrl ? <img src={productForm.photoUrl} className="w-full h-full object-cover"/> : <Camera className="absolute inset-0 m-auto text-slate-300"/>}
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e)=>handleImageUpload(e, (url)=>setProductForm({...productForm, photoUrl: url}))}/>
                          </div>
                          <span className="text-xs text-slate-400 font-bold">Toque na foto para alterar</span>
                      </div>
                      <input className="w-full p-4 bg-slate-50 rounded-2xl" placeholder="Nome" value={productForm.name || ''} onChange={e=>setProductForm({...productForm, name: e.target.value})}/>
                      <div className="flex gap-4">
                        <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl" placeholder="Preço" value={productForm.price || ''} onChange={e=>setProductForm({...productForm, price: Number(e.target.value)})}/>
                        <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl" placeholder="Estoque" value={productForm.stock || ''} onChange={e=>setProductForm({...productForm, stock: Number(e.target.value)})}/>
                      </div>
                      <button onClick={handleSaveProduct} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold">Salvar</button>
                      <button onClick={()=>setIsEditingProduct(false)} className="w-full py-4 text-slate-400 font-bold">Cancelar</button>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 gap-4">
                      {products.map(p => (
                          <div key={p.id} className="bg-white p-3 rounded-2xl border border-slate-100">
                              <div className="h-24 bg-slate-100 rounded-xl mb-3 overflow-hidden"><img src={p.photoUrl || ''} className="w-full h-full object-cover"/></div>
                              <h4 className="font-bold text-sm truncate">{p.name}</h4>
                              <p className="text-xs text-rose-500 font-bold">R$ {p.price} <span className="text-slate-300">|</span> {p.stock}un</p>
                              <div className="flex gap-2 mt-2">
                                  <button onClick={() => {setProductForm(p); setEditingProductId(p.id); setIsEditingProduct(true)}} className="p-1 bg-slate-50 rounded"><Edit2 size={14}/></button>
                                  <button onClick={() => handleDeleteProduct(p.id)} className="p-1 bg-red-50 text-red-500 rounded"><Trash2 size={14}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
           </div>
      </div>
  );

  const renderTeam = () => (
      <div className="space-y-6 pb-20">
          <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-slate-800">Equipe</h2>
              <button onClick={() => { setEmployeeForm({}); setEditingEmployeeId(null); setIsEditingEmployee(true); }} className="bg-rose-600 text-white p-2 rounded-full"><Plus/></button>
          </header>
          <div className="px-4">
              {isEditingEmployee ? (
                  <div className="bg-white p-6 rounded-[2rem] space-y-4">
                      <div className="flex items-center gap-4 mb-2">
                          <div className="w-16 h-16 bg-slate-100 rounded-full overflow-hidden relative">
                              {employeeForm.photoUrl ? <img src={employeeForm.photoUrl} className="w-full h-full object-cover"/> : <User className="absolute inset-0 m-auto text-slate-300"/>}
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e)=>handleImageUpload(e, (url)=>setEmployeeForm({...employeeForm, photoUrl: url}))}/>
                          </div>
                          <span className="text-xs text-slate-400 font-bold">Foto do Perfil</span>
                      </div>
                      <input className="w-full p-4 bg-slate-50 rounded-2xl" placeholder="Nome" value={employeeForm.name || ''} onChange={e=>setEmployeeForm({...employeeForm, name: e.target.value})}/>
                      <input className="w-full p-4 bg-slate-50 rounded-2xl" placeholder="Cargo (Ex: Barbeiro)" value={employeeForm.role || ''} onChange={e=>setEmployeeForm({...employeeForm, role: e.target.value})}/>
                      <button onClick={handleSaveEmployee} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold">Salvar</button>
                      <button onClick={()=>setIsEditingEmployee(false)} className="w-full py-4 text-slate-400 font-bold">Cancelar</button>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {employees.map(e => (
                          <div key={e.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-full overflow-hidden"><img src={e.photoUrl} className="w-full h-full object-cover"/></div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-slate-800">{e.name}</h4>
                                  <p className="text-xs text-slate-400">{e.role}</p>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => {setEmployeeForm(e); setEditingEmployeeId(e.id); setIsEditingEmployee(true)}} className="p-2 bg-slate-50 text-slate-600 rounded-xl"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDeleteEmployee(e.id)} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
  );

  const renderFinance = () => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    
    return (
        <div className="space-y-6 pb-20">
             <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
                <h2 className="text-xl font-black text-slate-800">Financeiro</h2>
                <button onClick={() => setIsAddingTransaction(true)} className="bg-slate-900 text-white p-2 rounded-full"><Plus/></button>
             </header>

             <div className="px-4 space-y-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Saldo Atual</p>
                    <p className={`text-3xl font-black ${income - expense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        R$ {(income - expense).toFixed(2)}
                    </p>
                    <div className="flex mt-6 gap-6">
                        <div>
                            <p className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-bold mb-1 flex items-center gap-1"><TrendingUp size={12}/> Entradas</p>
                            <p className="font-bold text-slate-800">R$ {income.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full font-bold mb-1 flex items-center gap-1"><TrendingDown size={12}/> Saídas</p>
                            <p className="font-bold text-slate-800">R$ {expense.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {isAddingTransaction && (
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-3 animate-scale-in">
                        <h3 className="font-bold text-slate-800">Novo Lançamento</h3>
                        <div className="flex gap-2">
                             <button onClick={()=>setTransactionForm({...transactionForm, type: 'income'})} className={`flex-1 py-3 rounded-xl font-bold text-sm ${transactionForm.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'}`}>Entrada</button>
                             <button onClick={()=>setTransactionForm({...transactionForm, type: 'expense'})} className={`flex-1 py-3 rounded-xl font-bold text-sm ${transactionForm.type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-400'}`}>Saída</button>
                        </div>
                        <input className="w-full p-4 bg-slate-50 rounded-2xl" placeholder="Descrição (Ex: Luz)" value={transactionForm.title || ''} onChange={e=>setTransactionForm({...transactionForm, title: e.target.value})}/>
                        <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl" placeholder="Valor" value={transactionForm.amount || ''} onChange={e=>setTransactionForm({...transactionForm, amount: Number(e.target.value)})}/>
                        
                        {/* Seletor de Categoria Estrita para Integração */}
                        <select 
                           className="w-full p-4 bg-slate-50 rounded-2xl text-slate-600 font-medium"
                           value={transactionForm.category || 'Outros'}
                           onChange={e=>setTransactionForm({...transactionForm, category: e.target.value})}
                        >
                             {transactionForm.type === 'income' ? (
                                 INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                             ) : (
                                 EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                             )}
                        </select>

                        <div className="flex gap-3 pt-2">
                            <button onClick={()=>setIsAddingTransaction(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                            <button onClick={handleSaveTransaction} className="flex-1 bg-slate-900 text-white rounded-xl font-bold">Salvar</button>
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="font-bold text-slate-800 mb-3">Extrato</h3>
                    {transactions.length > 0 ? (
                        <div className="space-y-3">
                            {transactions.slice().reverse().map(t => (
                                <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{t.title}</p>
                                        <p className="text-xs text-slate-400">{t.date} • {t.category}</p>
                                    </div>
                                    <p className={`font-black text-sm ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {t.type === 'income' ? '+' : '-'} R$ {t.amount}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-center text-slate-300 text-sm py-4">Nenhuma movimentação.</p>}
                </div>
             </div>
        </div>
    );
  };

  const renderSettings = () => (
      <div className="space-y-6 pb-20">
          <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-slate-800">Ajustes</h2>
              <button onClick={handleSaveSettings} className="bg-emerald-500 text-white p-2 rounded-full"><Save size={20}/></button>
          </header>
          {settingsForm && (
              <div className="px-4 space-y-6">
                  <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-2">Geral</label>
                      <input className="w-full p-4 bg-white rounded-2xl border border-slate-100" placeholder="Nome do Salão" value={settingsForm.shopName} onChange={e => setSettingsForm({...settingsForm, shopName: e.target.value})}/>
                      <input className="w-full p-4 bg-white rounded-2xl border border-slate-100" placeholder="Telefone / WhatsApp" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})}/>
                      <input className="w-full p-4 bg-white rounded-2xl border border-slate-100" placeholder="Endereço" value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})}/>
                  </div>
                  
                  <div className="space-y-3">
                       <label className="text-xs font-bold text-slate-400 uppercase ml-2">Integração API (SaaS Admin Pro)</label>
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                           <input className="w-full p-3 bg-white rounded-xl text-sm" placeholder="Project ID" value={integrationForm.projectId} onChange={e => setIntegrationForm({...integrationForm, projectId: e.target.value})}/>
                           <input className="w-full p-3 bg-white rounded-xl text-sm" placeholder="API Secret Key" type="password" value={integrationForm.apiKey} onChange={e => setIntegrationForm({...integrationForm, apiKey: e.target.value})}/>
                           <input className="w-full p-3 bg-white rounded-xl text-sm" placeholder="Endpoint URL" value={integrationForm.endpoint} onChange={e => setIntegrationForm({...integrationForm, endpoint: e.target.value})}/>
                       </div>
                  </div>
              </div>
          )}
      </div>
  );

  const renderPublicSalon = () => (
     <div className="pb-24">
        {/* Salon Header */}
        <div className="relative h-48 bg-slate-900">
            <img src={platformSalons.find(s => s.slug === getCurrentNamespace())?.coverUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                <h1 className="text-2xl font-black mb-1">{salonName}</h1>
                <p className="text-sm text-slate-300 flex items-center gap-1 mb-2">
                    <MapPin size={14}/> {currentSettings.address}
                </p>
                {locationContext.text && (
                   <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl text-xs text-slate-200 border border-white/10 mb-2">
                      <p className="mb-2"><span className="text-amber-400 font-bold">IA:</span> {locationContext.text}</p>
                      <div className="flex gap-2 flex-wrap">
                          {locationContext.links.map((link, i) => (
                              <a key={i} href={link.uri} target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-[10px] font-bold transition-colors">{link.title}</a>
                          ))}
                      </div>
                   </div>
                )}
                <div className="flex gap-3 mt-3">
                   <button onClick={openWhatsApp} className="bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                       <Phone size={14}/> WhatsApp
                   </button>
                   <button onClick={openMaps} className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                       <MapIcon size={14}/> Mapa
                   </button>
                   <button onClick={handleShare} className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold">
                       <Share2 size={14}/>
                   </button>
                </div>
            </div>
            <button onClick={() => setView(ViewState.MARKETPLACE)} className="absolute top-4 left-4 bg-black/30 backdrop-blur text-white p-2 rounded-full">
                <ArrowLeft size={20}/>
            </button>
        </div>

        {activeClientTab === 'home' && (
            <div className="px-4 py-6 space-y-6">
                <div>
                   <h3 className="font-bold text-slate-800 mb-4 text-lg">Serviços</h3>
                   <div className="grid gap-3">
                       {services.map(s => (
                           <div key={s.id} onClick={() => openBookingModal(s)} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer active:scale-95 transition-transform">
                               <div>
                                   <h4 className="font-bold text-slate-800">{s.name}</h4>
                                   <p className="text-xs text-slate-400 mb-1">{s.description}</p>
                                   <p className="text-xs font-bold text-rose-500">R$ {s.price} • {s.duration} min</p>
                               </div>
                               <div className="bg-rose-50 text-rose-600 p-2 rounded-xl">
                                   <Plus size={20}/>
                               </div>
                           </div>
                       ))}
                   </div>
                </div>
            </div>
        )}

        {activeClientTab === 'store' && (
            <div className="px-4 py-6">
                <h3 className="font-bold text-slate-800 mb-4 text-lg">Loja</h3>
                {products.length === 0 ? <EmptyState icon={ShoppingBag} title="Loja Vazia" description="Nenhum produto disponível no momento." /> : (
                    <div className="grid grid-cols-2 gap-4">
                        {products.map(p => (
                            <div key={p.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="h-32 bg-slate-100 rounded-xl mb-3 overflow-hidden">
                                    <img src={p.photoUrl} className="w-full h-full object-cover" alt={p.name}/>
                                </div>
                                <h4 className="font-bold text-sm text-slate-800 truncate">{p.name}</h4>
                                <p className="text-xs text-slate-400 line-clamp-2 h-8 mb-2">{p.description}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-black text-slate-800">R$ {p.price}</span>
                                    {/* Simplified Store: Just View */}
                                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">
                                        {p.stock > 0 ? 'Disponível' : 'Esgotado'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeClientTab === 'appointments' && (
            <div className="px-4 py-6">
                 {!clientLoggedInPhone ? (
                     <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4">
                         <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                             <User size={32}/>
                         </div>
                         <h3 className="font-bold text-slate-800">Meus Agendamentos</h3>
                         <p className="text-sm text-slate-500">Digite seu celular para acessar seu histórico.</p>
                         <input 
                            className="w-full bg-slate-50 p-4 rounded-xl text-center font-bold text-lg tracking-widest outline-none focus:ring-2 focus:ring-rose-200"
                            placeholder="(00) 00000-0000"
                            value={clientLoginInput}
                            onChange={e => setClientLoginInput(e.target.value)}
                         />
                         <button onClick={handleClientLogin} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200">
                             Acessar
                         </button>
                     </div>
                 ) : (
                     <div className="space-y-6">
                         <div className="flex justify-between items-center">
                             <h3 className="font-bold text-slate-800 text-lg">Olá, {clients.find(c => c.phone === clientLoggedInPhone)?.name || 'Cliente'}</h3>
                             <button onClick={() => setClientLoggedInPhone(null)} className="text-xs font-bold text-rose-500">Sair</button>
                         </div>
                         
                         <div className="space-y-3">
                             {appointments.filter(a => a.clientId === clientLoggedInPhone).length === 0 ? (
                                 <EmptyState icon={Calendar} title="Nenhum agendamento" description="Você ainda não tem agendamentos." />
                             ) : (
                                 appointments.filter(a => a.clientId === clientLoggedInPhone).slice().reverse().map(app => (
                                     <div key={app.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                                         <div className={`absolute left-0 top-0 bottom-0 w-1 ${app.status === 'scheduled' ? 'bg-amber-400' : app.status === 'completed' ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                                         <div className="flex justify-between items-start pl-3">
                                             <div>
                                                 <h4 className="font-bold text-slate-800">{app.serviceName}</h4>
                                                 <p className="text-sm text-slate-500">{app.date} às {app.time}</p>
                                                 <p className="text-xs text-slate-400 mt-1">{app.employeeName}</p>
                                             </div>
                                             <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                                 app.status === 'scheduled' ? 'bg-amber-50 text-amber-600' : 
                                                 app.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                                                 'bg-red-50 text-red-600'
                                             }`}>
                                                 {app.status === 'scheduled' ? 'Agendado' : app.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                             </span>
                                         </div>
                                         {app.status === 'scheduled' && (
                                             <button onClick={() => handleCancelAppointment(app.id)} className="mt-3 w-full py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50">
                                                 Cancelar Agendamento
                                             </button>
                                         )}
                                     </div>
                                 ))
                             )}
                         </div>
                     </div>
                 )}
            </div>
        )}
     </div>
  );

  return (
    <Layout 
       currentView={view} 
       setView={setView} 
       salonName={salonName}
       activeClientTab={activeClientTab}
       onClientTabChange={setActiveClientTab}
    >
        {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="animate-spin mb-2" />
                <span className="text-xs font-bold">Carregando...</span>
            </div>
        )}

        {!isLoading && (
            <>
                {view === ViewState.SAAS_LP && (
                  <SaaS_LP 
                    setView={setView} 
                    setShowAdminLogin={setShowAdminLogin} 
                    saasPlans={saasPlans} 
                  />
                )}
                {view === ViewState.MARKETPLACE && (
                  <Marketplace 
                    platformSalons={platformSalons} 
                    randomSalons={randomSalons} 
                    showAllSalons={showAllSalons} 
                    setShowAllSalons={setShowAllSalons} 
                    handleSalonSelect={handleSalonSelect} 
                  />
                )}
                {view === ViewState.SAAS_ADMIN && (
                  <SaaSAdmin 
                    tenants={tenants} 
                    saasTab={saasTab} 
                    setSaasTab={setSaasTab} 
                    handleAdminLogout={handleAdminLogout} 
                    saasPlans={saasPlans} 
                    isEditingPlan={isEditingPlan} 
                    setIsEditingPlan={setIsEditingPlan} 
                    planForm={planForm} 
                    setPlanForm={setPlanForm} 
                    setEditingPlanId={setEditingPlanId} 
                    featureInput={featureInput} 
                    setFeatureInput={setFeatureInput} 
                    handleAddFeature={handleAddFeature} 
                    handleRemoveFeature={handleRemoveFeature} 
                    handleSavePlan={handleSavePlan} 
                    handleDeletePlan={handleDeletePlan} 
                  />
                )}
                {(view === ViewState.PUBLIC_SALON || view === ViewState.CLIENT_STORE) && renderPublicSalon()}
                
                {/* Admin Views */}
                {view === ViewState.DASHBOARD && renderDashboard()}
                {view === ViewState.SERVICES && renderServices()}
                {view === ViewState.PRODUCTS && renderProducts()}
                {view === ViewState.TEAM && renderTeam()}
                {view === ViewState.FINANCE && renderFinance()}
                {view === ViewState.SETTINGS && renderSettings()}
            </>
        )}

        {/* Modals */}
        {showAdminLogin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl transform transition-all scale-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Acesso Restrito</h3>
                    <input 
                        type="password" 
                        className="w-full bg-slate-100 border-none rounded-xl p-3 mb-4 text-center font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none" 
                        placeholder="Senha"
                        value={adminPass}
                        onChange={e => setAdminPass(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setShowAdminLogin(false)} className="flex-1 py-3 text-slate-500 font-bold text-sm">Cancelar</button>
                        <button onClick={handleAdminLogin} className="flex-1 bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-200">Entrar</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Booking Modal Logic (Simplified for space, assuming 6 steps or similar) */}
        {selectedServiceForBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
                <div className="bg-white w-full sm:max-w-md p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                    {bookingStep === 1 && (
                        <div>
                             <h3 className="text-lg font-bold text-slate-800 mb-4">Escolha o Profissional</h3>
                             <div className="space-y-3">
                                 {employees.map(emp => (
                                     <div key={emp.id} onClick={() => { setSelectedEmployeeForBooking(emp); setBookingStep(2); }} className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50">
                                         <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden">
                                             <img src={emp.photoUrl} className="w-full h-full object-cover"/>
                                         </div>
                                         <div>
                                             <h4 className="font-bold text-slate-800">{emp.name}</h4>
                                             <p className="text-xs text-slate-400">{emp.role}</p>
                                         </div>
                                     </div>
                                 ))}
                                 <button onClick={() => { setSelectedEmployeeForBooking({ id: 'any', name: 'Qualquer Profissional', role: '', bio: '' }); setBookingStep(2); }} className="w-full py-3 text-slate-500 font-bold text-sm bg-slate-50 rounded-xl mt-2">
                                     Qualquer Profissional
                                 </button>
                             </div>
                             <button onClick={closeBookingModal} className="w-full mt-4 py-3 text-rose-500 font-bold text-sm">Cancelar</button>
                        </div>
                    )}
                    
                    {bookingStep === 2 && (
                         <div>
                             <h3 className="text-lg font-bold text-slate-800 mb-4">Data e Hora</h3>
                             <input type="date" className="w-full p-4 bg-slate-50 rounded-xl mb-3 font-bold text-slate-600" value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
                             <div className="grid grid-cols-4 gap-2 mb-4">
                                 {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(time => (
                                     <button key={time} onClick={() => setBookingTime(time)} className={`py-2 rounded-lg font-bold text-xs ${bookingTime === time ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{time}</button>
                                 ))}
                             </div>
                             <button disabled={!bookingDate || !bookingTime} onClick={() => setBookingStep(3)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold disabled:opacity-50">Continuar</button>
                             <button onClick={() => setBookingStep(1)} className="w-full mt-2 py-3 text-slate-400 font-bold text-sm">Voltar</button>
                         </div>
                    )}

                    {bookingStep === 3 && (
                        <div>
                             <h3 className="text-lg font-bold text-slate-800 mb-4">Deseja adicionar produtos?</h3>
                             <p className="text-sm text-slate-500 mb-6">Leve produtos para casa e pague tudo junto no salão.</p>
                             <button onClick={() => setBookingStep(4)} className="w-full bg-rose-50 text-rose-600 py-4 rounded-xl font-bold mb-3">Sim, ver produtos</button>
                             <button onClick={() => setBookingStep(5)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">Não, finalizar agendamento</button>
                        </div>
                    )}

                    {bookingStep === 4 && (
                        <div>
                             <h3 className="text-lg font-bold text-slate-800 mb-4">Adicionar Produtos</h3>
                             <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                                 {products.map(p => {
                                     const qty = bookingCart.find(i => i.product.id === p.id)?.quantity || 0;
                                     return (
                                         <div key={p.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl">
                                             <div>
                                                 <p className="font-bold text-sm text-slate-800">{p.name}</p>
                                                 <p className="text-xs text-rose-500 font-bold">R$ {p.price}</p>
                                             </div>
                                             <div className="flex items-center gap-3">
                                                 {qty > 0 && <button onClick={() => updateBookingQuantity(p, -1)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">-</button>}
                                                 <span className="font-bold text-slate-800 w-4 text-center">{qty}</span>
                                                 <button onClick={() => updateBookingQuantity(p, 1)} className="w-8 h-8 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold">+</button>
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                             <button onClick={() => setBookingStep(5)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">Continuar</button>
                        </div>
                    )}

                    {bookingStep === 5 && (
                        <div>
                             <h3 className="text-lg font-bold text-slate-800 mb-4">Seus Dados</h3>
                             <input className="w-full p-4 bg-slate-50 rounded-xl mb-3 font-medium" placeholder="Seu Celular (WhatsApp)" value={clientPhone} onChange={handlePhoneChange}/>
                             {isNewClient && (
                                 <>
                                     <input className="w-full p-4 bg-slate-50 rounded-xl mb-3 font-medium" placeholder="Seu Nome Completo" value={clientName} onChange={e => setClientName(e.target.value)}/>
                                     <input type="date" className="w-full p-4 bg-slate-50 rounded-xl mb-3 font-medium text-slate-500" placeholder="Data de Nascimento" value={clientBirthDate} onChange={e => setClientBirthDate(e.target.value)}/>
                                 </>
                             )}
                             <div className="bg-slate-50 p-4 rounded-xl mb-4">
                                 <p className="text-xs text-slate-400 font-bold uppercase mb-2">Resumo</p>
                                 <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{selectedServiceForBooking.name}</span><span className="font-bold">R$ {selectedServiceForBooking.price}</span></div>
                                 {bookingCart.length > 0 && bookingCart.map(i => (
                                     <div key={i.product.id} className="flex justify-between text-sm mb-1"><span className="text-slate-600">{i.quantity}x {i.product.name}</span><span className="font-bold">R$ {i.product.price * i.quantity}</span></div>
                                 ))}
                                 <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-black text-slate-800">
                                     <span>Total Estimado</span>
                                     <span>R$ {selectedServiceForBooking.price + bookingCart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0)}</span>
                                 </div>
                             </div>
                             <button onClick={confirmBooking} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200">Confirmar Agendamento</button>
                        </div>
                    )}

                    {bookingStep === 6 && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <Check size={40} strokeWidth={3}/>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Agendado!</h3>
                            <p className="text-slate-500 mb-6">Te esperamos no dia {bookingDate} às {bookingTime}.</p>
                            <button onClick={closeBookingModal} className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold">Fechar</button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Checkout Modal (Simple) */}
        {checkoutAppointment && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                 <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
                     <h3 className="text-lg font-bold text-slate-800 mb-1">Finalizar Atendimento</h3>
                     <p className="text-sm text-slate-400 mb-4">{checkoutAppointment.clientName} - {checkoutAppointment.serviceName}</p>
                     
                     <div className="bg-slate-50 p-4 rounded-2xl mb-4 max-h-40 overflow-y-auto">
                         <p className="text-xs font-bold text-slate-400 uppercase mb-2">Adicionar Consumo</p>
                         {products.map(p => {
                             const qty = checkoutCart.find(i => i.product.id === p.id)?.quantity || 0;
                             return (
                                 <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                     <span className="text-sm font-medium text-slate-600 truncate max-w-[120px]">{p.name}</span>
                                     <div className="flex items-center gap-2">
                                         {qty > 0 && <button onClick={() => updateCheckoutQuantity(p, -1)} className="text-slate-400 hover:text-red-500"><Minus size={16}/></button>}
                                         <span className="text-xs font-bold w-4 text-center">{qty > 0 ? qty : '-'}</span>
                                         <button onClick={() => updateCheckoutQuantity(p, 1)} className="text-emerald-500"><Plus size={16}/></button>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>

                     <div className="flex justify-between items-center mb-6">
                         <span className="text-slate-500 font-medium">Total Final</span>
                         <span className="text-2xl font-black text-slate-800">
                             R$ {checkoutAppointment.price + checkoutCart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0)}
                         </span>
                     </div>

                     <button onClick={finalizeCheckout} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 mb-2">Receber Pagamento</button>
                     <button onClick={closeCheckoutModal} className="w-full py-3 text-slate-400 font-bold text-sm">Cancelar</button>
                 </div>
             </div>
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl transform transition-all scale-100">
                    <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32}/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Limite de Ações Atingido!</h3>
                    <p className="text-sm text-slate-500 mb-6">Você atingiu o limite de ações do seu plano atual. Para continuar usando todos os recursos, por favor, faça upgrade para um plano pago.</p>
                    <button onClick={() => { setShowUpgradeModal(false); setView(ViewState.SAAS_LP); }} className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200">
                        Ver Planos
                    </button>
                    <button onClick={() => setShowUpgradeModal(false)} className="w-full mt-2 py-3 text-slate-500 font-bold text-sm">
                        Fechar
                    </button>
                </div>
            </div>
        )}

        {/* Add More Employees Modal */}
        {showAddMoreEmployeesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl transform transition-all scale-100 text-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Funcionário Adicionado!</h3>
                    <p className="text-sm text-slate-500 mb-6">Deseja adicionar mais funcionários?</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setShowAddMoreEmployeesModal(false);
                                // The form is already reset and open for new input
                                // isEditingEmployee remains true
                            }} 
                            className="flex-1 py-3 text-emerald-600 font-bold text-sm bg-emerald-50 rounded-xl"
                        >
                            Sim
                        </button>
                        <button 
                            onClick={() => {
                                setShowAddMoreEmployeesModal(false);
                                setIsEditingEmployee(false); // Close the employee form
                                checkAndShowPaymentPrompt(); // Trigger payment prompt check
                            }} 
                            className="flex-1 py-3 text-slate-500 font-bold text-sm bg-slate-100 rounded-xl"
                        >
                            Não
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Payment Prompt Modal for Additional Employees */}
        {showPaymentPromptModal && currentTenant && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl transform transition-all scale-100 text-center">
                    <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DollarSign size={32}/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Atenção ao Seu Plano!</h3>
                    {(() => {
                        const tenantPlan = saasPlans.find(p => p.name === currentTenant.plan);
                        if (!tenantPlan) {
                            return <p className="text-sm text-slate-500 mb-6">Não foi possível encontrar os detalhes do seu plano.</p>;
                        }

                        const currentEmployeeCount = employees.length;
                        const minUsers = tenantPlan.minUsers || 0;
                        const pricePerUser = tenantPlan.pricePerUser || 0;

                        if (currentEmployeeCount > minUsers) {
                            const extraEmployees = currentEmployeeCount - minUsers;
                            const additionalCost = extraEmployees * pricePerUser;
                            return (
                                <>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Seu plano "{currentTenant.plan}" inclui até <span className="font-bold">{minUsers}</span> funcionário(s).
                                        Atualmente, você tem <span className="font-bold">{currentEmployeeCount}</span> funcionário(s) cadastrado(s), excedendo o limite em <span className="font-bold">{extraEmployees}</span>.
                                    </p>
                                    <p className="text-sm font-bold text-rose-600 mb-6">
                                        Isso gerará um custo adicional de R$ {additionalCost.toFixed(2)}/mês.
                                    </p>
                                    <p className="text-xs text-slate-400">Entre em contato para ajustar seu plano.</p>
                                </>
                            );
                        }
                        return <p className="text-sm text-slate-500 mb-6">Seu plano "{currentTenant.plan}" está em ordem com <span className="font-bold">{currentEmployeeCount}</span> funcionário(s).</p>;
                    })()}
                    <button 
                        onClick={() => setShowPaymentPromptModal(false)} 
                        className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200 mt-4"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        )}
    </Layout>
  );
};

export default App;
