
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import EmptyState from './components/EmptyState';
import { ViewState, SalonMetadata, Service, Appointment, Product, Transaction, Employee, Client, ShopSettings, Tenant, SaasPlan } from './types';
import { getPlatformSalons, setCurrentNamespace, getCurrentNamespace, fetchSettings, fetchServices, fetchEmployees, persistAppointments, fetchAppointments, fetchProducts, addTransaction, fetchClients, persistClient, fetchTransactions, persistServices, persistProducts, persistEmployees, persistSettings, incrementViews, fetchTenants, fetchSaasPlans, persistSaasPlans } from './services/storage';
import { sendFinancialWebhook, saveIntegrationConfig, getIntegrationConfig } from './services/webhook';
import { generateDescription, getLocationContext } from './services/gemini';
import { Calendar, LayoutDashboard, Scissors, Store, Users, Wallet, Settings, Package, Percent, MapPin, Phone, Star, Share2, Lock, ArrowLeft, Clock, Search, ChevronRight, Check, Globe, Zap, Heart, CheckCircle2, X, User, Plus, Minus, Trash2, ShoppingBag, DollarSign, CalendarDays, History, AlertCircle, LogOut, TrendingUp, TrendingDown, Edit2, Camera, Save, BarChart3, Shield, Map, CreditCard, Tag, LayoutGrid, ArrowRight, Smartphone, Play, Loader2, Link } from 'lucide-react';

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

  // --- ASYNC DATA LOADING ---
  const refreshData = async () => {
    const [
      s_services, s_products, s_employees, s_appointments, s_clients, s_transactions, s_settings
    ] = await Promise.all([
      fetchServices(), fetchProducts(), fetchEmployees(), fetchAppointments(), fetchClients(), fetchTransactions(), fetchSettings()
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
  }, [view, isEditingService, isEditingProduct, isEditingEmployee, isAddingTransaction, checkoutAppointment]);

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
          await persistAppointments(updatedApps);
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
    await persistAppointments([...currentApps, newAppointment]);
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
              addTransaction(transaction); // Sync call but storage handles it async internally for Supabase

              // Etapa 2: Gatilho de Receita
              sendFinancialWebhook({
                type: 'RECEITA',
                category: 'Serviços Personalizados', // Categoria Estrita
                amount: transaction.amount,
                date: new Date().toISOString(),
                description: richDescription
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
      setIsEditingEmployee(false);
      setEmployeeForm({});
      setEditingEmployeeId(null);
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
      await addTransaction(newTrans);
      
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
      if (!planForm.name || planForm.price === undefined) return alert("Dados incompletos");
      const newPlan: SaasPlan = {
          id: editingPlanId || Date.now().toString(),
          name: planForm.name,
          price: Number(planForm.price),
          features: planForm.features || [],
          isRecommended: planForm.isRecommended || false
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
              <button onClick={() => { setServiceForm({}); setEditingServiceId(null); setIsEditingService(true); }} className="bg-slate-900 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg">
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
              <button onClick={() => { setProductForm({}); setEditingProductId(null); setIsEditingProduct(true); }} className="bg-slate-900 text-white p-2 rounded-full"><Plus/></button>
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
              <button onClick={() => { setEmployeeForm({}); setEditingEmployeeId(null); setIsEditingEmployee(true); }} className="bg-slate-900 text-white p-2 rounded-full"><Plus/></button>
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

  const renderSaaSAdmin = () => {
    // Aggregated Metrics
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const totalMRR = tenants.reduce((acc, t) => acc + (t.mrr || 0), 0);
    // In a real app, these would be aggregated from DB queries across all schemas
    const totalGlobalAppointments = tenants.length * 124; 
    const totalGlobalGMV = tenants.length * 4500; 
    
    // Geographic Data (Mock)
    const topCities = tenants.reduce((acc: any, t) => {
        acc[t.city] = (acc[t.city] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="pb-24">
            <header className="bg-rose-600 text-white pt-6 pb-6 px-6 sticky top-0 z-30 shadow-lg shadow-rose-200">
                 <div className="flex justify-between items-center mb-4">
                     <h1 className="text-xl font-bold">Admin SaaS Pro</h1>
                     <button onClick={handleAdminLogout} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">Sair</button>
                 </div>
                 {/* Mobile Tabs */}
                 <div className="flex bg-rose-700 p-1 rounded-xl">
                     <button onClick={()=>setSaasTab('overview')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${saasTab === 'overview' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-100 hover:bg-rose-600/50'}`}>Visão Geral</button>
                     <button onClick={()=>setSaasTab('partners')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${saasTab === 'partners' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-100 hover:bg-rose-600/50'}`}>Parceiros</button>
                     <button onClick={()=>setSaasTab('plans')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${saasTab === 'plans' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-100 hover:bg-rose-600/50'}`}>Planos</button>
                 </div>
            </header>

            <div className="p-4 space-y-6">
                {saasTab === 'overview' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase">MRR (Recorrente)</p>
                                <p className="text-2xl font-black text-slate-800">R$ {totalMRR.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase">GMV (Transacionado)</p>
                                <p className="text-2xl font-black text-emerald-600">R$ {totalGlobalGMV.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Map size={18}/> Cobertura Geográfica</h3>
                            <div className="space-y-3">
                                {Object.entries(topCities).map(([city, count]: any) => (
                                    <div key={city} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{city}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 bg-slate-100 w-24 rounded-full overflow-hidden">
                                                <div className="h-full bg-rose-500" style={{ width: `${(count / totalTenants) * 100}%` }}></div>
                                            </div>
                                            <span className="font-bold text-slate-800">{count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {saasTab === 'partners' && (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Salão</th>
                                    <th className="p-4">Plano</th>
                                    <th className="p-4">Cidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tenants.map(t => (
                                    <tr key={t.id}>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800">{t.slug}</p>
                                            <p className="text-xs text-slate-400">{t.ownerName}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{t.plan}</span>
                                        </td>
                                        <td className="p-4 text-slate-600">{t.city}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {saasTab === 'plans' && renderSaasPlans()}
            </div>
        </div>
    );
  };

  const renderSaasPlans = () => (
      <div className="space-y-4">
          <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Gerenciar Planos</h3>
              <button onClick={() => { setPlanForm({ features: [] }); setEditingPlanId(null); setIsEditingPlan(true); }} className="bg-rose-600 text-white text-xs px-3 py-2 rounded-lg font-bold shadow-lg shadow-rose-200">Novo Plano</button>
          </div>
          
          {isEditingPlan ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                  <input className="w-full p-3 bg-slate-50 rounded-xl" placeholder="Nome do Plano" value={planForm.name || ''} onChange={e=>setPlanForm({...planForm, name: e.target.value})}/>
                  <input type="number" className="w-full p-3 bg-slate-50 rounded-xl" placeholder="Preço (R$)" value={planForm.price || ''} onChange={e=>setPlanForm({...planForm, price: Number(e.target.value)})}/>
                  
                  <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400">Benefícios:</p>
                      {planForm.features?.map((feat, idx) => (
                          <div key={idx} className="flex justify-between bg-slate-50 p-2 rounded text-sm">
                              <span>{feat}</span>
                              <button onClick={()=>handleRemoveFeature(idx)} className="text-red-500"><X size={14}/></button>
                          </div>
                      ))}
                      <div className="flex gap-2">
                          <input className="flex-1 p-2 bg-slate-50 rounded text-sm" placeholder="Novo benefício..." value={featureInput} onChange={e=>setFeatureInput(e.target.value)}/>
                          <button onClick={handleAddFeature} className="bg-slate-200 text-slate-600 p-2 rounded"><Plus size={16}/></button>
                      </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                      <button onClick={()=>setIsEditingPlan(false)} className="flex-1 py-2 text-slate-400 font-bold text-sm">Cancelar</button>
                      <button onClick={handleSavePlan} className="flex-1 bg-emerald-500 text-white rounded-xl font-bold text-sm">Salvar</button>
                  </div>
              </div>
          ) : (
              <div className="space-y-3">
                  {saasPlans.map(plan => (
                      <div key={plan.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <div>
                              <h4 className="font-bold text-slate-800">{plan.name}</h4>
                              <p className="text-xs text-slate-500">R$ {plan.price}/mês • {plan.features.length} benefícios</p>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => { setPlanForm(plan); setEditingPlanId(plan.id); setIsEditingPlan(true); }} className="p-2 bg-slate-50 text-slate-600 rounded-lg"><Edit2 size={16}/></button>
                              <button onClick={() => handleDeletePlan(plan.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );

  const renderClientAuth = () => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-4">
              <User size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acesse sua conta</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-xs">Digite seu celular para ver seus agendamentos.</p>
          <input 
              type="tel"
              className="w-full max-w-xs p-4 bg-white border border-slate-200 rounded-2xl text-center text-lg font-bold tracking-widest mb-4"
              placeholder="(00) 00000-0000"
              value={clientLoginInput}
              onChange={e => setClientLoginInput(e.target.value)}
          />
          <button onClick={handleClientLogin} className="w-full max-w-xs bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-colors">
              Entrar
          </button>
      </div>
  );

  const renderClientStore = () => (
    <div className="p-6 pb-32 space-y-6 animate-fade-in">
        <h2 className="text-2xl font-black text-slate-800">Loja</h2>
        <div className="grid grid-cols-2 gap-4">
            {products.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-full h-24 bg-slate-100 rounded-xl mb-3 overflow-hidden"><img src={p.photoUrl} className="w-full h-full object-cover"/></div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{p.name}</h4>
                    <p className="text-rose-500 font-black mb-3">R$ {p.price}</p>
                    <button className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full w-full">Comprar</button>
                </div>
            ))}
        </div>
    </div>
  );

  const renderPublicSalon = () => (
    <div className="pb-32 bg-slate-50 min-h-screen relative">
      {/* Immersive Header */}
      <div className="relative h-64 w-full">
         <div className="absolute inset-0 bg-slate-900">
            <img src={platformSalons.find(s=>s.slug === getCurrentNamespace())?.coverUrl} className="w-full h-full object-cover opacity-60"/>
         </div>
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
         
         {/* Top Controls */}
         <div className="absolute top-0 w-full p-4 flex justify-between items-start z-10">
            {!isDirectLink && (
              <button onClick={() => setView(ViewState.MARKETPLACE)} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-all">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex gap-2 ml-auto">
               <button onClick={handleShare} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-all">
                  <Share2 size={20} />
               </button>
               <button onClick={() => setShowAdminLogin(true)} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-all">
                  <Lock size={20} />
               </button>
            </div>
         </div>

         {/* Salon Info */}
         <div className="absolute bottom-0 w-full p-6 text-white">
            <h1 className="text-3xl font-black mb-1">{salonName}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-300 mb-4">
               <Star className="text-yellow-400 fill-yellow-400" size={16}/>
               <span className="font-bold text-white">4.8</span>
               <span>•</span>
               <span>{currentSettings.address || 'Localização não definida'}</span>
            </div>
            {/* Quick Actions */}
            <div className="flex gap-3">
               <button onClick={openWhatsApp} className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg shadow-green-900/20">
                  <Phone size={14}/> WhatsApp
               </button>
               <button onClick={openMaps} className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg">
                  <MapPin size={14}/> Rota
               </button>
            </div>
         </div>
      </div>

      {/* Location Context (Gemini Maps) */}
      {locationContext.text && (
        <div className="bg-white mx-4 -mt-4 mb-4 p-4 rounded-2xl shadow-sm border border-slate-100 relative z-10">
           <div className="flex items-start gap-3">
              <MapPin className="text-rose-500 mt-1" size={18} />
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-1">Sobre a localização</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-2">{locationContext.text}</p>
                <div className="flex flex-wrap gap-2">
                  {locationContext.links.map((link, i) => (
                    <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1">
                      <Link size={10}/> {link.title}
                    </a>
                  ))}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Main Content Tabs */}
      {activeClientTab === 'home' && (
        <div className="px-4 space-y-8 mt-6">
           {/* Team Section */}
           <section>
              <h3 className="font-bold text-slate-800 mb-4 text-lg">Talentos</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {employees.map(emp => (
                      <div key={emp.id} className="min-w-[140px] bg-white p-3 rounded-[1.5rem] border border-slate-100 text-center shadow-sm">
                          <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full mb-3 overflow-hidden shadow-inner"><img src={emp.photoUrl} className="w-full h-full object-cover"/></div>
                          <h4 className="font-bold text-slate-800 text-sm truncate">{emp.name}</h4>
                          <p className="text-xs text-slate-400">{emp.role}</p>
                      </div>
                  ))}
              </div>
           </section>

           {/* Services Section */}
           <section>
              <h3 className="font-bold text-slate-800 mb-4 text-lg">Menu</h3>
              <div className="space-y-3">
                  {services.map(service => (
                      <div key={service.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex justify-between items-center group active:scale-[0.98] transition-transform">
                          <div>
                              <h4 className="font-bold text-slate-800 text-base">{service.name}</h4>
                              <p className="text-xs text-slate-400 mt-1">{service.duration} min • {service.description}</p>
                          </div>
                          <button 
                             onClick={() => openBookingModal(service)}
                             className="bg-slate-900 text-white text-xs font-bold px-5 py-3 rounded-full shadow-lg shadow-slate-200 group-hover:bg-rose-600 transition-colors"
                          >
                             Agendar • R$ {service.price}
                          </button>
                      </div>
                  ))}
              </div>
           </section>
        </div>
      )}

      {activeClientTab === 'store' && renderClientStore()}
      
      {activeClientTab === 'appointments' && (
         <div className="px-4 pt-6">
             {!clientLoggedInPhone ? renderClientAuth() : (
                 <div className="space-y-6">
                      <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl shadow-slate-200">
                          <h2 className="text-xl font-bold mb-1">Olá, Cliente</h2>
                          <p className="text-slate-400 text-sm">{clientLoggedInPhone}</p>
                      </div>
                      
                      <div>
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarDays size={18}/> Futuros</h3>
                          <div className="space-y-3">
                              {appointments.filter(a => a.clientId === clientLoggedInPhone && a.status === 'scheduled').length > 0 ? (
                                  appointments.filter(a => a.clientId === clientLoggedInPhone && a.status === 'scheduled').map(app => (
                                      <div key={app.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
                                           <div>
                                               <p className="font-bold text-slate-800">{app.serviceName}</p>
                                               <p className="text-sm text-slate-500">{app.date} às {app.time}</p>
                                           </div>
                                           <button onClick={() => handleCancelAppointment(app.id)} className="text-red-500 bg-red-50 p-2 rounded-full"><X size={18}/></button>
                                      </div>
                                  ))
                              ) : <p className="text-slate-400 text-sm">Nenhum agendamento futuro.</p>}
                          </div>
                      </div>

                      <div>
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><History size={18}/> Histórico</h3>
                          <div className="space-y-3 opacity-60">
                              {appointments.filter(a => a.clientId === clientLoggedInPhone && a.status !== 'scheduled').map(app => (
                                  <div key={app.id} className="bg-white p-4 rounded-2xl border border-slate-100">
                                      <p className="font-bold text-slate-800">{app.serviceName}</p>
                                      <p className="text-xs text-slate-500">{app.date}</p>
                                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded mt-2 inline-block ${app.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                          {app.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                      </span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <button onClick={() => setClientLoggedInPhone(null)} className="w-full py-4 text-slate-400 font-bold flex items-center justify-center gap-2">
                          <LogOut size={16}/> Sair da conta
                      </button>
                 </div>
             )}
         </div>
      )}

      {/* BOOKING MODAL */}
      {selectedServiceForBooking && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                   <div>
                       <h3 className="text-xl font-black text-slate-800">
                           {bookingStep === 1 && "Escolha o Profissional"}
                           {bookingStep === 2 && "Data e Hora"}
                           {bookingStep === 3 && "Deseja algo mais?"}
                           {bookingStep === 4 && "Loja"}
                           {bookingStep === 5 && "Seus Dados"}
                           {bookingStep === 6 && "Agendado!"}
                       </h3>
                       <p className="text-xs text-slate-400 font-bold">Passo {bookingStep} de 5</p>
                   </div>
                   <button onClick={closeBookingModal} className="bg-slate-50 p-2 rounded-full text-slate-400"><X size={20}/></button>
               </div>
               
               {/* STEP 1: Professional */}
               {bookingStep === 1 && (
                   <div className="space-y-4">
                       <p className="text-sm text-slate-500">Com quem você prefere realizar o serviço?</p>
                       <div className="grid grid-cols-2 gap-3">
                           {employees.map(emp => (
                               <button 
                                 key={emp.id} 
                                 onClick={() => { setSelectedEmployeeForBooking(emp); setBookingStep(2); }}
                                 className="flex flex-col items-center p-4 rounded-2xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                               >
                                   <div className="w-16 h-16 rounded-full bg-slate-100 mb-2 overflow-hidden"><img src={emp.photoUrl} className="w-full h-full object-cover"/></div>
                                   <span className="font-bold text-slate-800 text-sm">{emp.name}</span>
                               </button>
                           ))}
                       </div>
                   </div>
               )}

               {/* STEP 2: Date & Time */}
               {bookingStep === 2 && (
                   <div className="space-y-6">
                       <input 
                         type="date" 
                         className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium text-slate-600"
                         onChange={(e) => setBookingDate(e.target.value)}
                         min={new Date().toISOString().split('T')[0]}
                       />
                       {bookingDate && (
                           <div className="grid grid-cols-4 gap-2">
                               {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(time => (
                                   <button 
                                     key={time}
                                     onClick={() => { setBookingTime(time); setBookingStep(3); }} // Go to Decision Step
                                     className="py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-900 hover:text-white transition-colors"
                                   >
                                       {time}
                                   </button>
                               ))}
                           </div>
                       )}
                   </div>
               )}

               {/* STEP 3: Decision (Shop vs Finish) */}
               {bookingStep === 3 && (
                   <div className="space-y-6 text-center py-4">
                       <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-rose-600">
                           <ShoppingBag size={32} />
                       </div>
                       <div>
                           <h4 className="font-bold text-lg text-slate-800">Deseja levar algo para casa?</h4>
                           <p className="text-slate-500 text-sm mt-2">Temos produtos incríveis para manter o cuidado.</p>
                       </div>
                       <div className="grid grid-cols-1 gap-3">
                           <button onClick={() => setBookingStep(4)} className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-bold hover:bg-slate-50">
                               Ver Loja
                           </button>
                           <button onClick={() => setBookingStep(5)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-300">
                               Finalizar Agendamento
                           </button>
                       </div>
                   </div>
               )}

               {/* STEP 4: Product Store */}
               {bookingStep === 4 && (
                   <div className="space-y-6">
                       <div className="space-y-3 max-h-60 overflow-y-auto">
                           {products.map(p => {
                               const qty = bookingCart.find(i => i.product.id === p.id)?.quantity || 0;
                               return (
                                   <div key={p.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                                       <div className="flex items-center gap-3">
                                           <div className="w-12 h-12 bg-white rounded-lg overflow-hidden"><img src={p.photoUrl} className="w-full h-full object-cover"/></div>
                                           <div>
                                               <p className="font-bold text-sm text-slate-800">{p.name}</p>
                                               <p className="text-xs text-rose-500 font-bold">R$ {p.price}</p>
                                           </div>
                                       </div>
                                       <div className="flex items-center gap-2 bg-white rounded-lg p-1">
                                           <button onClick={() => updateBookingQuantity(p, -1)} className="p-1 text-slate-400 hover:text-slate-800"><Minus size={14}/></button>
                                           <span className="text-xs font-bold w-4 text-center">{qty}</span>
                                           <button onClick={() => updateBookingQuantity(p, 1)} className="p-1 text-slate-400 hover:text-slate-800"><Plus size={14}/></button>
                                       </div>
                                   </div>
                               );
                           })}
                       </div>
                       <button onClick={() => setBookingStep(5)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">
                           Continuar para Finalização
                       </button>
                   </div>
               )}

               {/* STEP 5: Auth & Confirmation */}
               {bookingStep === 5 && (
                   <div className="space-y-6">
                       <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                           <div className="flex justify-between text-sm">
                               <span className="text-slate-500">Serviço</span>
                               <span className="font-bold text-slate-800">{selectedServiceForBooking.name}</span>
                           </div>
                           <div className="flex justify-between text-sm">
                               <span className="text-slate-500">Profissional</span>
                               <span className="font-bold text-slate-800">{selectedEmployeeForBooking?.name}</span>
                           </div>
                           <div className="flex justify-between text-sm">
                               <span className="text-slate-500">Data</span>
                               <span className="font-bold text-slate-800">{bookingDate.split('-').reverse().join('/')} às {bookingTime}</span>
                           </div>
                           {bookingCart.length > 0 && (
                               <div className="pt-2 border-t border-slate-200 mt-2">
                                   <p className="text-xs font-bold text-slate-400 uppercase mb-2">Produtos Adicionais</p>
                                   {bookingCart.map(item => (
                                       <div key={item.product.id} className="flex justify-between text-xs mb-1">
                                           <span className="text-slate-600">{item.quantity}x {item.product.name}</span>
                                           <span className="font-bold">R$ {item.product.price * item.quantity}</span>
                                       </div>
                                   ))}
                               </div>
                           )}
                           <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2">
                               <span className="font-black text-slate-800 text-lg">Total</span>
                               <span className="font-black text-rose-600 text-lg">
                                   R$ {selectedServiceForBooking.price + bookingCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)}
                               </span>
                           </div>
                       </div>

                       <div className="space-y-3">
                           <input 
                             className="w-full p-4 bg-slate-50 rounded-2xl border-none" 
                             placeholder="Seu Celular (WhatsApp)" 
                             value={clientPhone} 
                             onChange={handlePhoneChange}
                           />
                           
                           {/* Smart Recognition */}
                           {clientPhone.length > 8 && !isNewClient && clientName && (
                               <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl font-bold text-center">
                                   👋 Bem-vindo de volta, {clientName}!
                               </div>
                           )}

                           {/* New Client Inputs */}
                           {isNewClient && clientPhone.length > 8 && (
                               <div className="animate-fade-in space-y-3">
                                   <input className="w-full p-4 bg-slate-50 rounded-2xl border-none" placeholder="Seu Nome Completo" value={clientName} onChange={e => setClientName(e.target.value)}/>
                                   <div className="relative">
                                       <span className="absolute left-4 top-2 text-[10px] text-slate-400 font-bold uppercase">Data de Nascimento</span>
                                       <input type="date" className="w-full p-4 pt-6 bg-slate-50 rounded-2xl border-none font-medium text-slate-700" value={clientBirthDate} onChange={e => setClientBirthDate(e.target.value)}/>
                                   </div>
                               </div>
                           )}
                       </div>
                       
                       <button onClick={confirmBooking} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-colors">
                           Confirmar Agendamento
                       </button>
                   </div>
               )}

               {/* STEP 6: Success */}
               {bookingStep === 6 && (
                   <div className="text-center py-8 space-y-6">
                       <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4 animate-scale-in">
                           <CheckCircle2 size={40} />
                       </div>
                       <div>
                           <h3 className="text-2xl font-black text-slate-800">Agendamento OK!</h3>
                           <p className="text-slate-500 mt-2">Te esperamos no dia marcado.</p>
                       </div>
                       
                       {/* Final Summary Card */}
                       <div className="bg-slate-50 p-6 rounded-[1.5rem] text-left space-y-3 shadow-inner">
                           <div>
                               <p className="text-xs text-slate-400 font-bold uppercase">Serviço</p>
                               <p className="font-bold text-slate-800 text-lg">{selectedServiceForBooking.name}</p>
                           </div>
                           
                           {bookingCart.length > 0 && (
                               <div>
                                   <p className="text-xs text-slate-400 font-bold uppercase mb-1">Produtos</p>
                                   {bookingCart.map(item => (
                                       <div key={item.product.id} className="flex justify-between text-sm text-slate-600 border-b border-slate-200 pb-1 mb-1 last:border-0">
                                           <span>{item.quantity}x {item.product.name}</span>
                                           <span className="font-bold">R$ {item.product.price * item.quantity}</span>
                                       </div>
                                   ))}
                               </div>
                           )}
                           
                           <div className="pt-2 border-t border-slate-200 flex justify-between items-center mt-2">
                               <span className="font-bold text-slate-600">Total a Pagar</span>
                               <span className="font-black text-emerald-600 text-xl">
                                   R$ {selectedServiceForBooking.price + bookingCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)}
                               </span>
                           </div>
                       </div>

                       <button onClick={closeBookingModal} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">
                           Voltar ao Início
                       </button>
                   </div>
               )}
           </div>
        </div>
      )}

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-scale-in">
                  {/* Background Image with Blur */}
                  <div className="absolute inset-0">
                      <img 
                        src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"></div>
                  </div>

                  {/* Content Card */}
                  <div className="relative z-10 p-8 flex flex-col items-center">
                      <div className="bg-white w-full rounded-3xl p-6 shadow-xl space-y-6">
                           <div className="flex justify-between items-center">
                               <h3 className="font-bold text-slate-800 text-lg">Área do Parceiro</h3>
                               <button onClick={() => setShowAdminLogin(false)} className="bg-slate-100 p-2 rounded-full text-slate-400"><ArrowLeft size={16}/></button>
                           </div>
                           
                           <div>
                               <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Senha de Acesso</label>
                               <input 
                                 type="password" 
                                 className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center tracking-widest font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all"
                                 placeholder="••••••"
                                 value={adminPass}
                                 onChange={e => setAdminPass(e.target.value)}
                               />
                           </div>

                           <button onClick={handleAdminLogin} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-colors flex justify-center items-center gap-2">
                               <Lock size={18} /> Entrar
                           </button>

                           <p className="text-center text-xs text-slate-400">Senha demo: <b>admin123</b></p>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );

  const renderSaaS_LP = () => (
      <div className="bg-white min-h-screen pb-20">
          {/* Header */}
          <header className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-40 border-b border-slate-50">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white"><Scissors size={18}/></div>
                  <span className="font-bold text-slate-800 text-lg">SALÃO ONLINE <span className="text-rose-600 font-black">Pro</span></span>
               </div>
          </header>

          {/* Hero */}
          <section className="px-6 pt-12 pb-20 text-center space-y-6">
               <span className="inline-block px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-xs font-black uppercase tracking-wider">Software para Salões</span>
               <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-[1.1]">
                   Seu salão com <span className="text-rose-600">agendamento online</span> e gestão <span className="text-slate-900">completa</span>.
               </h1>
               <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
                   Chega de papel, agenda lotada e confusão no atendimento. Com nossa plataforma, seu salão ganha organização, profissionalismo e mais clientes.
               </p>

               <div className="flex flex-col gap-4 max-w-xs mx-auto pt-4">
                   <button 
                     onClick={() => setView(ViewState.MARKETPLACE)} // Client Action
                     className="w-full bg-white border border-slate-200 py-4 rounded-full font-bold text-slate-800 shadow-xl shadow-slate-100 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 relative overflow-hidden"
                   >
                       <Heart className="text-rose-500 fill-rose-500" size={20}/>
                       <span>Já aderiram</span>
                       {/* Facepile */}
                       <div className="flex -space-x-2 absolute right-4">
                          {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>)}
                       </div>
                   </button>
                   
                   <p className="text-xs text-slate-300 font-bold uppercase my-1">ou</p>

                   <button 
                      onClick={() => document.getElementById('plans')?.scrollIntoView({behavior: 'smooth'})}
                      className="w-full bg-slate-900 text-white py-4 rounded-full font-bold shadow-xl shadow-slate-300 hover:bg-slate-800 transition-colors"
                   >
                       Eu Quero
                   </button>
                   
                   {/* Social Login */}
                   <button className="w-full bg-white border border-slate-200 py-3 rounded-full font-bold text-slate-600 text-sm flex items-center justify-center gap-2 mt-2">
                       <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center text-[8px] text-white font-bold">G</div>
                       Cadastrar com Google
                   </button>

                   {/* Store Badges */}
                   <div className="flex justify-center gap-3 pt-4 opacity-60 grayscale hover:grayscale-0 transition-all">
                       <button className="bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                           <div className="text-[10px] text-left leading-tight">Download on the<br/><span className="text-sm font-bold">App Store</span></div>
                       </button>
                       <button className="bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                           <div className="text-[10px] text-left leading-tight">GET IT ON<br/><span className="text-sm font-bold">Google Play</span></div>
                       </button>
                   </div>
               </div>
          </section>

          {/* Features */}
          <section className="px-6 py-12 bg-slate-50">
              <h2 className="text-center font-bold text-slate-800 text-xl mb-2">Site Exclusivo</h2>
              <p className="text-center text-slate-500 text-sm mb-12 max-w-xs mx-auto">Seu salão ganha uma página profissional com link personalizado.</p>
              
              <div className="space-y-12 max-w-md mx-auto">
                  <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-blue-100 rounded-[1.5rem] flex items-center justify-center text-blue-600 mx-auto mb-4"><Globe size={32}/></div>
                      <h3 className="font-bold text-slate-800">Agendamento 24h</h3>
                      <p className="text-slate-500 text-sm">Seu cliente agenda pelo celular sem te chamar no WhatsApp.</p>
                  </div>
                  <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center text-emerald-600 mx-auto mb-4"><Wallet size={32}/></div>
                      <h3 className="font-bold text-slate-800">Controle Financeiro</h3>
                      <p className="text-slate-500 text-sm">Saiba exatamente quanto entra e sai. Controle comissões e lucro.</p>
                  </div>
                  <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-purple-100 rounded-[1.5rem] flex items-center justify-center text-purple-600 mx-auto mb-4"><Zap size={32}/></div>
                      <h3 className="font-bold text-slate-800">Inteligência Artificial</h3>
                      <p className="text-slate-500 text-sm">Descrições automáticas e insights para vender mais.</p>
                  </div>
              </div>
          </section>

          {/* Pricing */}
          <section id="plans" className="px-6 py-12">
              <h2 className="text-center font-bold text-slate-800 text-2xl mb-2">Planos para todos</h2>
              <p className="text-center text-slate-500 text-sm mb-8">Escolha o ideal para o seu momento.</p>
              
              <div className="space-y-6 max-w-sm mx-auto">
                  {/* Start */}
                  <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 text-center">
                      <h3 className="font-bold text-slate-800 mb-4">Start</h3>
                      <p className="text-4xl font-black text-slate-900 mb-6">R$ 0<span className="text-sm text-slate-400 font-medium">/mês</span></p>
                      <ul className="space-y-3 text-sm text-left mb-8">
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Agenda Simples</li>
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Link Personalizado</li>
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Até 50 agendamentos</li>
                      </ul>
                      <button onClick={() => setShowAdminLogin(true)} className="w-full py-4 bg-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-300">Começar Agora</button>
                  </div>

                  {/* Pro */}
                  <div className="p-8 rounded-[2.5rem] bg-white border-2 border-rose-100 shadow-xl shadow-rose-100/50 text-center relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-400 to-rose-600"></div>
                      <span className="inline-block px-3 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-full mb-4 absolute top-4 right-4">Mais Escolhido</span>
                      
                      <h3 className="font-bold text-slate-800 mb-4 mt-2">Pro</h3>
                      <p className="text-4xl font-black text-slate-900 mb-6">R$ 99<span className="text-sm text-slate-400 font-medium">/mês</span></p>
                      <ul className="space-y-3 text-sm text-left mb-8">
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Agenda Ilimitada</li>
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Controle Financeiro</li>
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Gestão de Estoque</li>
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Site Próprio</li>
                      </ul>
                      <button onClick={() => setShowAdminLogin(true)} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700">Começar Agora</button>
                  </div>

                   {/* Enterprise */}
                   <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 text-center">
                      <h3 className="font-bold text-slate-800 mb-4">Enterprise</h3>
                      <p className="text-4xl font-black text-slate-900 mb-6">R$ 199<span className="text-sm text-slate-400 font-medium">/mês</span></p>
                      <ul className="space-y-3 text-sm text-left mb-8">
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Múltiplos Profissionais</li>
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Dashboard Avançado</li>
                          <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> Campanhas de Marketing</li>
                      </ul>
                      <button onClick={() => setShowAdminLogin(true)} className="w-full py-4 bg-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-300">Falar com Consultor</button>
                  </div>
              </div>
          </section>

          <footer className="bg-slate-900 text-slate-500 py-12 text-center text-sm">
              <p className="mb-4">© 2024 BelezaApp SaaS. Todos os direitos reservados.</p>
              <button onClick={() => setShowAdminLogin(true)} className="text-slate-700 hover:text-white transition-colors text-xs uppercase font-bold tracking-widest">Área Restrita</button>
          </footer>
      </div>
  );

  const renderMarketplace = () => (
      <div className="pb-24">
         <header className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-40 shadow-sm">
             <h1 className="text-lg font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-tight">SALÃO ONLINE</h1>
             <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><User size={16} className="text-slate-400"/></div>
         </header>

         <div className="p-4 space-y-6">
             {/* Search */}
             <div className="relative">
                 <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                 <input className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm" placeholder="Buscar salão ou serviço..."/>
             </div>

             {/* Categories */}
             <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                 {['Todos', 'Barbearia', 'Salão', 'Manicure', 'Spa'].map((cat, i) => (
                     <button key={cat} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap ${i===0 ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}>
                         {cat}
                     </button>
                 ))}
             </div>

             {/* Featured Salons (Random 3) */}
             <div>
                 <h2 className="font-bold text-slate-800 mb-4 px-2">Em Destaque</h2>
                 <div className="space-y-4">
                     {(showAllSalons ? platformSalons : randomSalons.slice(0, 3)).map(salon => (
                         <div 
                           key={salon.id} 
                           onClick={() => handleSalonSelect(salon)}
                           className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-100 flex gap-4 cursor-pointer hover:border-rose-100 transition-colors group"
                         >
                             <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0"><img src={salon.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div>
                             <div className="flex-1 py-1">
                                 <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide bg-rose-50 px-2 py-1 rounded-md mb-2 inline-block">{salon.category}</span>
                                 <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{salon.name}</h3>
                                 <div className="flex items-center gap-1 text-slate-400 text-xs mb-3">
                                     <MapPin size={12}/> {salon.location}
                                 </div>
                                 <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                                     <Star className="text-yellow-400 fill-yellow-400" size={14}/> {salon.rating}
                                     <span className="text-slate-300 mx-1">•</span>
                                     <span className="text-emerald-600">Aberto agora</span>
                                 </div>
                             </div>
                             <div className="flex items-center justify-center pr-2 text-slate-300">
                                 <ChevronRight />
                             </div>
                         </div>
                     ))}
                 </div>
                 
                 {!showAllSalons && (
                    <button onClick={() => setShowAllSalons(true)} className="w-full py-3 mt-4 text-slate-500 text-sm font-bold bg-white border border-slate-100 rounded-2xl">
                        Ver Lista Completa
                    </button>
                 )}
             </div>
         </div>
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
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-rose-600" size={32} />
        </div>
      )}

      {view === ViewState.SAAS_LP && renderSaaS_LP()}
      {view === ViewState.MARKETPLACE && renderMarketplace()}
      {view === ViewState.SAAS_ADMIN && renderSaaSAdmin()}

      {view === ViewState.PUBLIC_SALON && renderPublicSalon()}

      {view === ViewState.DASHBOARD && renderDashboard()}
      {view === ViewState.SERVICES && renderServices()}
      {view === ViewState.PRODUCTS && renderProducts()}
      {view === ViewState.TEAM && renderTeam()}
      {view === ViewState.FINANCE && renderFinance()}
      {view === ViewState.SETTINGS && renderSettings()}
    </Layout>
  );
};

export default App;
