import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import EmptyState from './components/EmptyState';
import { ViewState, SalonMetadata, Service, Appointment, Product, Transaction, Employee, Client, ShopSettings, Tenant, SaasPlan } from './types';
import { getPlatformSalons, setCurrentNamespace, getCurrentNamespace, getSettings, getServices, getEmployees, saveAppointments, getAppointments, getProducts, addTransaction, saveTransactions, getClients, saveClient, getTransactions, saveServices, saveProducts, saveEmployees, saveSettings, incrementViews, getTenants, getSaasPlans, saveSaasPlans } from './services/storage';
import { sendFinancialWebhook } from './services/webhook';
import { Calendar, LayoutDashboard, Scissors, Store, Users, Wallet, Settings, Package, Percent, MapPin, Phone, Star, Share2, Lock, ArrowLeft, Clock, Search, ChevronRight, Check, Globe, Zap, Heart, CheckCircle2, X, User, Plus, Minus, Trash2, ShoppingBag, DollarSign, CalendarDays, History, AlertCircle, LogOut, TrendingUp, TrendingDown, Edit2, Camera, Save, BarChart3, Shield, Map, CreditCard, Tag, LayoutGrid, ArrowRight, Smartphone, Play } from 'lucide-react';

// Helper interface for local cart state
interface CartItem {
  product: Product;
  quantity: number;
}

// Categorias compatíveis com o SaaS Admin Pro
const EXPENSE_CATEGORIES = [
  'Marketing e Anúncios',
  'Servidores e Infra',
  'Licenças de Software',
  'Aluguel e Contas',
  'Salários e Comissões',
  'Estoque e Produtos',
  'Outros'
];

const INCOME_CATEGORIES = [
  'Serviços Prestados',
  'Venda de Produtos',
  'Outros'
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SAAS_LP);
  const [activeClientTab, setActiveClientTab] = useState<'home' | 'appointments' | 'store'>('home');
  const [salonName, setSalonName] = useState<string>('');
  
  // State for Admin Modal
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');

  // State for Booking Modal
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null);
  const [selectedEmployeeForBooking, setSelectedEmployeeForBooking] = useState<Employee | null>(null);
  // NEW BOOKING FLOW STEPS:
  // 1: Professional
  // 2: Date & Time
  // 3: Decision (Store vs Finish)
  // 4: Product List (Optional)
  // 5: Auth / Info
  // 6: Success
  const [bookingStep, setBookingStep] = useState(1); 
  const [bookingDate, setBookingDate] = useState<string>(''); // YYYY-MM-DD
  const [bookingTime, setBookingTime] = useState<string>('');
  
  // Client Data for Booking
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientBirthDate, setClientBirthDate] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);

  // Client Session (Account Tab)
  const [clientLoggedInPhone, setClientLoggedInPhone] = useState<string | null>(null);
  const [clientLoginInput, setClientLoginInput] = useState('');

  // Changed to CartItem array to support quantity
  const [bookingCart, setBookingCart] = useState<CartItem[]>([]);

  // State for Admin Checkout
  const [checkoutAppointment, setCheckoutAppointment] = useState<Appointment | null>(null);
  // Changed to CartItem array to support quantity
  const [checkoutCart, setCheckoutCart] = useState<CartItem[]>([]);

  // Detect direct link (query param ?salon=slug)
  const [isDirectLink, setIsDirectLink] = useState(false);

  // --- CRUD STATES ---
  // Services
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({});

  // Products
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});

  // Team
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({});

  // Finance
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactionForm, setTransactionForm] = useState<Partial<Omit<Transaction, 'category'>> & { category?: string }>({ 
      type: 'expense', 
      date: new Date().toISOString().split('T')[0],
      category: 'Outros' // Default category
  });

  // Settings
  const [settingsForm, setSettingsForm] = useState<ShopSettings | null>(null);

  // SaaS Plans CRUD
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<Partial<SaasPlan>>({ features: [] });
  const [featureInput, setFeatureInput] = useState('');

  // SaaS Admin Tab State
  const [saasTab, setSaasTab] = useState<'overview' | 'partners' | 'plans'>('overview');

  // Marketplace State
  const [showAllSalons, setShowAllSalons] = useState(false);

  // Memoized Data
  const platformSalons = useMemo(() => getPlatformSalons(), []);
  // Memoize random salons to prevent reshuffle on re-render
  const randomSalons = useMemo(() => [...getPlatformSalons()].sort(() => 0.5 - Math.random()), []);

  const services = useMemo(() => getServices(), [view, isEditingService]); // Refresh on edit
  const products = useMemo(() => getProducts(), [view, isEditingProduct]);
  const employees = useMemo(() => getEmployees(), [view, isEditingEmployee]);
  const appointments = useMemo(() => getAppointments(), [view, checkoutAppointment, bookingStep, activeClientTab]); 
  const clients = useMemo(() => getClients(), [bookingStep, view]);
  const transactions = useMemo(() => getTransactions(), [view, isAddingTransaction, checkoutAppointment]);
  const currentSettings = useMemo(() => getSettings(), [view]);
  
  // SaaS Data
  const tenants = useMemo(() => getTenants(), [view]);
  const saasPlans = useMemo(() => getSaasPlans(), [view, isEditingPlan]);

  useEffect(() => {
    // Check URL parameters on mount
    const params = new URLSearchParams(window.location.search);
    const salonSlug = params.get('salon');

    if (salonSlug) {
      setIsDirectLink(true);
      setCurrentNamespace(salonSlug);
      incrementViews();
      const settings = getSettings();
      setSalonName(settings.shopName);
      setView(ViewState.PUBLIC_SALON);
    }
  }, []);

  useEffect(() => {
    // Update salon name when view changes
    if (view === ViewState.PUBLIC_SALON || view === ViewState.DASHBOARD) {
      const settings = getSettings();
      setSalonName(settings.shopName);
      setSettingsForm(settings);
    }
  }, [view]);

  // Set default booking date to today on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
  }, []);

  // Smart Client Detection in Booking
  useEffect(() => {
      // Step 5 is Auth/Info now
      if (bookingStep === 5 && clientPhone.length >= 8) {
          const foundClient = clients.find(c => c.phone === clientPhone);
          if (foundClient) {
              setClientName(foundClient.name);
              setIsNewClient(false);
          } else {
              setIsNewClient(true);
          }
      }
  }, [clientPhone, bookingStep, clients]);

  const handleSalonSelect = (salon: SalonMetadata) => {
    setCurrentNamespace(salon.slug);
    setSalonName(salon.name);
    setView(ViewState.PUBLIC_SALON);
  };

  const handleAdminLogin = () => {
    if (adminPass === 'admin123') { 
      // Login Dono do Salão
      setShowAdminLogin(false);
      setAdminPass('');
      setView(ViewState.DASHBOARD);
    } else if (adminPass === 'saas123') {
      // Login Super Admin (SaaS Platform)
      setShowAdminLogin(false);
      setAdminPass('');
      setView(ViewState.SAAS_ADMIN);
      setSaasTab('overview'); // Reset tab
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
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  };

  // --- ACTIONS FOR PUBLIC SALON PAGE ---
  const openWhatsApp = () => {
      const phone = currentSettings.phone.replace(/\D/g, '');
      if (!phone) {
          alert("WhatsApp não configurado para este salão.");
          return;
      }
      window.open(`https://wa.me/55${phone}`, '_blank');
  };

  const openMaps = () => {
      const address = currentSettings.address;
      if (!address || address === 'Endereço não configurado') {
          alert("Endereço não disponível.");
          return;
      }
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  // --- IMAGE UPLOAD HELPER ---
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
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
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

  // --- CLIENT ACCOUNT LOGIC ---
  const handleClientLogin = () => {
      if (clientLoginInput.length < 8) {
          alert("Por favor, digite um telefone válido.");
          return;
      }
      setClientLoggedInPhone(clientLoginInput);
  };

  const handleCancelAppointment = (appointmentId: string) => {
      if (window.confirm("Tem certeza que deseja cancelar este agendamento?")) {
          const currentApps = getAppointments();
          const updatedApps = currentApps.map(app => 
              app.id === appointmentId ? { ...app, status: 'cancelled' as const } : app
          );
          saveAppointments(updatedApps);
          setActiveClientTab('appointments'); 
          setView(prev => prev); 
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

  const updateBookingQuantity = (product: Product, delta: number) => {
    setBookingCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const newQty = existingItem.quantity + delta;
        if (newQty <= 0) {
          return prev.filter(item => item.product.id !== product.id);
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      } else if (delta > 0) {
        return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const confirmBooking = () => {
    if (!selectedServiceForBooking || !selectedEmployeeForBooking || !bookingDate || !bookingTime || !clientName || !clientPhone) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    if (isNewClient && !clientBirthDate) {
        alert("Por favor, informe sua data de nascimento para o cadastro.");
        return;
    }

    if (isNewClient) {
        const newClient: Client = {
            id: Date.now().toString(),
            name: clientName,
            phone: clientPhone,
            birthDate: clientBirthDate,
            createdAt: Date.now()
        };
        saveClient(newClient);
    }

    const finalProductsList: Product[] = [];
    bookingCart.forEach(item => {
        for(let i=0; i<item.quantity; i++) {
            finalProductsList.push(item.product);
        }
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

    const currentAppointments = getAppointments();
    saveAppointments([...currentAppointments, newAppointment]);
    
    setBookingStep(6); // Success
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
        if (newQty <= 0) {
          return prev.filter(item => item.product.id !== product.id);
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      } else if (delta > 0) {
        return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const finalizeCheckout = () => {
      if (!checkoutAppointment) return;

      const currentApps = getAppointments();
      const updatedApps = currentApps.map(app => {
          if (app.id === checkoutAppointment.id) {
              const existingProducts = app.products || [];
              const newProducts: Product[] = [];
              checkoutCart.forEach(item => {
                  for(let i=0; i<item.quantity; i++) {
                      newProducts.push(item.product);
                  }
              });

              const allProducts = [...existingProducts, ...newProducts];
              const productsTotal = allProducts.reduce((sum, p) => sum + p.price, 0);
              
              const updatedApp = {
                  ...app,
                  status: 'completed' as const,
                  products: allProducts,
                  totalPrice: app.price + productsTotal
              };

              // Título enriquecido para a IA
              const richDescription = `[Serviços Prestados] ${app.serviceName} - Cliente: ${app.clientName}`;

              const transaction: Transaction = {
                  id: Date.now().toString(),
                  title: `Serviço: ${app.clientName}`,
                  amount: updatedApp.totalPrice,
                  type: 'income',
                  category: 'service', // Internally it's service, but mapped below for webhook
                  status: 'paid',
                  date: new Date().toISOString().split('T')[0],
                  relatedAppointmentId: app.id
              };
              addTransaction(transaction);

              // --- INTEGRATION: SEND REVENUE TO SAAS ADMIN ---
              // Sending with RICH CONTEXT
              sendFinancialWebhook({
                type: 'RECEITA',
                category: 'Serviços Prestados',
                amount: transaction.amount,
                date: new Date().toISOString(),
                description: richDescription
              });
              // -----------------------------------------------

              return updatedApp;
          }
          return app;
      });

      saveAppointments(updatedApps);
      closeCheckoutModal();
  };

  // --- CRUD HANDLERS ---
  
  // Services
  const handleSaveService = () => {
      if (!serviceForm.name || !serviceForm.price) return alert("Nome e preço obrigatórios");
      
      const newService: Service = {
          id: editingServiceId || Date.now().toString(),
          name: serviceForm.name,
          price: Number(serviceForm.price),
          duration: Number(serviceForm.duration) || 30,
          description: serviceForm.description || ''
      };

      const updatedServices = editingServiceId 
          ? services.map(s => s.id === editingServiceId ? newService : s)
          : [...services, newService];
      
      saveServices(updatedServices);
      setIsEditingService(false);
      setServiceForm({});
      setEditingServiceId(null);
  };

  const handleDeleteService = (id: string) => {
      if(window.confirm("Excluir serviço?")) {
          saveServices(services.filter(s => s.id !== id));
      }
  };

  // Products
  const handleSaveProduct = () => {
      if (!productForm.name || !productForm.price) return alert("Nome e preço obrigatórios");
      
      const newProduct: Product = {
          id: editingProductId || Date.now().toString(),
          name: productForm.name,
          price: Number(productForm.price),
          stock: Number(productForm.stock) || 0,
          description: productForm.description || '',
          photoUrl: productForm.photoUrl || ''
      };

      const updatedProducts = editingProductId
          ? products.map(p => p.id === editingProductId ? newProduct : p)
          : [...products, newProduct];
      
      saveProducts(updatedProducts);
      setIsEditingProduct(false);
      setProductForm({});
      setEditingProductId(null);
  };

  const handleDeleteProduct = (id: string) => {
       if(window.confirm("Excluir produto?")) {
          saveProducts(products.filter(p => p.id !== id));
      }
  };

  // Team
  const handleSaveEmployee = () => {
      if (!employeeForm.name) return alert("Nome obrigatório");
      
      const newEmployee: Employee = {
          id: editingEmployeeId || Date.now().toString(),
          name: employeeForm.name,
          role: employeeForm.role || 'Profissional',
          bio: employeeForm.bio || '',
          photoUrl: employeeForm.photoUrl || ''
      };

      const updatedEmployees = editingEmployeeId
          ? employees.map(e => e.id === editingEmployeeId ? newEmployee : e)
          : [...employees, newEmployee];
      
      saveEmployees(updatedEmployees);
      setIsEditingEmployee(false);
      setEmployeeForm({});
      setEditingEmployeeId(null);
  };

  const handleDeleteEmployee = (id: string) => {
       if(window.confirm("Excluir profissional?")) {
          saveEmployees(employees.filter(e => e.id !== id));
      }
  };

  // Finance
  const handleSaveTransaction = () => {
      if (!transactionForm.title || !transactionForm.amount) return alert("Título e valor obrigatórios");
      
      // Map category properly to what local storage expects or keep as is, 
      // but payload for webhook will use the exact string from the form
      const newTransaction: Transaction = {
          id: Date.now().toString(),
          title: transactionForm.title,
          amount: Number(transactionForm.amount),
          type: transactionForm.type || 'expense',
          category: 'operational', // Store internally as operational/other, but we use the title for context
          status: 'paid',
          date: transactionForm.date || new Date().toISOString().split('T')[0]
      };
      
      addTransaction(newTransaction);
      
      // --- INTEGRATION: SEND TRANSACTION TO SAAS ADMIN ---
      // Use the RICH CATEGORY selected by the user
      const richCategory = transactionForm.category || 'Outros';
      const richDescription = `[${richCategory}] ${transactionForm.title}`;

      sendFinancialWebhook({
        type: newTransaction.type === 'income' ? 'RECEITA' : 'DESPESA',
        category: richCategory,
        amount: newTransaction.amount,
        date: new Date(newTransaction.date).toISOString(),
        description: richDescription
      });
      // --------------------------------------------------

      setIsAddingTransaction(false);
      setTransactionForm({ type: 'expense', date: new Date().toISOString().split('T')[0], category: 'Outros' });
  };

  // Settings
  const handleSaveSettings = () => {
      if (!settingsForm) return;
      saveSettings(settingsForm);
      setSalonName(settingsForm.shopName);
      alert("Configurações salvas!");
  };

  // SaaS Plans
  const handleAddFeature = () => {
      if (!featureInput.trim()) return;
      setPlanForm(prev => ({
          ...prev,
          features: [...(prev.features || []), featureInput.trim()]
      }));
      setFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
      setPlanForm(prev => ({
          ...prev,
          features: (prev.features || []).filter((_, i) => i !== index)
      }));
  };

  const handleSavePlan = () => {
      if (!planForm.name) return alert("Nome do plano é obrigatório");
      if (planForm.price === undefined) return alert("Preço é obrigatório");

      const newPlan: SaasPlan = {
          id: editingPlanId || Date.now().toString(),
          name: planForm.name,
          price: Number(planForm.price),
          features: planForm.features || [],
          isRecommended: planForm.isRecommended || false
      };

      const updatedPlans = editingPlanId
          ? saasPlans.map(p => p.id === editingPlanId ? newPlan : p)
          : [...saasPlans, newPlan];
      
      saveSaasPlans(updatedPlans);
      setIsEditingPlan(false);
      setPlanForm({ features: [] });
      setEditingPlanId(null);
  };

  const handleDeletePlan = (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir este plano?")) {
          saveSaasPlans(saasPlans.filter(p => p.id !== id));
      }
  };

  // --- RENDERERS ---

  const renderDashboard = () => {
    // Analytics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const totalRevenue = completedAppointments.reduce((acc, curr) => acc + curr.totalPrice, 0);

    // Busiest Day
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayCounts = new Array(7).fill(0);
    appointments.forEach(a => {
        const day = new Date(a.date).getDay(); // Note: This depends on timezone handling in real apps
        dayCounts[day]++;
    });
    const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
    const busiestDay = maxDayIndex >= 0 ? days[maxDayIndex] : '-';

    // Popular Service
    const serviceCounts: Record<string, number> = {};
    appointments.forEach(a => {
        serviceCounts[a.serviceName] = (serviceCounts[a.serviceName] || 0) + 1;
    });
    const popularService = Object.keys(serviceCounts).sort((a,b) => serviceCounts[b] - serviceCounts[a])[0] || '-';

    // Best Selling Product
    const productCounts: Record<string, number> = {};
    appointments.forEach(a => {
        if(a.products) {
            a.products.forEach(p => {
                productCounts[p.name] = (productCounts[p.name] || 0) + 1;
            });
        }
    });
    const bestProduct = Object.keys(productCounts).sort((a,b) => productCounts[b] - productCounts[a])[0] || '-';


    return (
        <div className="space-y-6 animate-fade-in pb-20">
             <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
                <h1 className="text-xl font-black text-slate-800">Início</h1>
                <button onClick={handleAdminLogout} className="text-xs font-bold text-rose-600 bg-rose-50 px-4 py-2 rounded-full hover:bg-rose-100 transition-colors">
                    Sair
                </button>
             </header>

             <div className="px-2 space-y-6">
                {/* Stats Cards */}
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

                {/* Insights */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Zap size={18} className="text-yellow-500 fill-yellow-500" /> Insights do Salão
                    </h3>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-full text-rose-500"><Calendar size={16} /></div>
                                <span className="text-sm font-medium text-slate-600">Dia Mais Movimentado</span>
                            </div>
                            <span className="font-bold text-slate-800">{busiestDay}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-full text-purple-500"><Scissors size={16} /></div>
                                <span className="text-sm font-medium text-slate-600">Serviço Top 1</span>
                            </div>
                            <span className="font-bold text-slate-800 text-sm max-w-[120px] truncate">{popularService}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-full text-emerald-500"><ShoppingBag size={16} /></div>
                                <span className="text-sm font-medium text-slate-600">Produto Top 1</span>
                            </div>
                            <span className="font-bold text-slate-800 text-sm max-w-[120px] truncate">{bestProduct}</span>
                        </div>
                    </div>

                    {/* Sugestão IA Mock */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-2xl border border-indigo-100 mt-2">
                        <p className="text-xs text-indigo-800 leading-relaxed">
                            <span className="font-bold">Dica:</span> Seu dia mais fraco é Terça-feira. Que tal criar uma promoção "Terça dos Cortes" com 15% de desconto para aumentar o movimento?
                        </p>
                    </div>
                </div>

                {/* Recent Pending Appointments */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4">Próximos Clientes</h3>
                    {appointments.filter(a => a.status === 'scheduled').length > 0 ? (
                        <div className="space-y-3">
                            {appointments.filter(a => a.status === 'scheduled').slice(0, 3).map(app => (
                                <div key={app.id} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold">
                                                {app.clientName?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{app.clientName}</p>
                                                <p className="text-xs text-slate-400">{app.serviceName} • {app.time}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => openCheckoutModal(app)}
                                            className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 hover:bg-emerald-600 transition-colors shadow-sm"
                                        >
                                            <Check size={14} /> Atender
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setView(ViewState.DASHBOARD)} className="w-full text-center text-xs font-bold text-slate-400 mt-2">Ver Todos</button>
                        </div>
                    ) : (
                        <p className="text-center text-slate-400 text-sm py-4">Agenda livre por enquanto.</p>
                    )}
                </div>
             </div>
        </div>
    );
  };

  const renderServices = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-slate-800">Serviços</h2>
              <button 
                  onClick={() => {
                      setServiceForm({});
                      setEditingServiceId(null);
                      setIsEditingService(true);
                  }}
                  className="bg-slate-900 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"
              >
                  <Plus size={20} />
              </button>
          </header>

          <div className="px-4">
              {isEditingService ? (
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                      <h3 className="font-bold text-slate-800">{editingServiceId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                      <input 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                          placeholder="Nome do Serviço (ex: Corte)" 
                          value={serviceForm.name || ''}
                          onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                      />
                      <div className="flex gap-4">
                          <input 
                              type="number"
                              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                              placeholder="Preço (R$)" 
                              value={serviceForm.price || ''}
                              onChange={e => setServiceForm({...serviceForm, price: Number(e.target.value)})}
                          />
                          <input 
                              type="number"
                              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                              placeholder="Duração (min)" 
                              value={serviceForm.duration || ''}
                              onChange={e => setServiceForm({...serviceForm, duration: Number(e.target.value)})}
                          />
                      </div>
                      <textarea 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium text-sm" 
                          placeholder="Descrição breve" 
                          value={serviceForm.description || ''}
                          onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                          rows={3}
                      />
                      <div className="flex gap-3">
                          <button onClick={() => setIsEditingService(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                          <button onClick={handleSaveService} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {services.map(service => (
                          <div key={service.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                              <div>
                                  <h4 className="font-bold text-slate-800">{service.name}</h4>
                                  <p className="text-xs text-slate-400">{service.duration} min • R$ {service.price}</p>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                      onClick={() => {
                                          setServiceForm(service);
                                          setEditingServiceId(service.id);
                                          setIsEditingService(true);
                                      }}
                                      className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"
                                  >
                                      <Edit2 size={16} />
                                  </button>
                                  <button 
                                      onClick={() => handleDeleteService(service.id)}
                                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                      {services.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum serviço cadastrado.</p>}
                  </div>
              )}
          </div>
      </div>
  );
  
  const renderProducts = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-slate-800">Loja & Estoque</h2>
               <button 
                  onClick={() => {
                      setProductForm({});
                      setEditingProductId(null);
                      setIsEditingProduct(true);
                  }}
                  className="bg-slate-900 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"
              >
                  <Plus size={20} />
              </button>
          </header>

          <div className="px-4">
              {isEditingProduct ? (
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                      <h3 className="font-bold text-slate-800">{editingProductId ? 'Editar Produto' : 'Novo Produto'}</h3>
                      <input 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                          placeholder="Nome do Produto" 
                          value={productForm.name || ''}
                          onChange={e => setProductForm({...productForm, name: e.target.value})}
                      />
                      <div className="flex gap-4">
                          <input 
                              type="number"
                              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                              placeholder="Preço (R$)" 
                              value={productForm.price || ''}
                              onChange={e => setProductForm({...productForm, price: Number(e.target.value)})}
                          />
                          <input 
                              type="number"
                              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                              placeholder="Estoque" 
                              value={productForm.stock || ''}
                              onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})}
                          />
                      </div>

                      {/* Image Upload for Product */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Foto do Produto</label>
                          <div className="flex items-center gap-4">
                              <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 relative">
                                  {productForm.photoUrl ? (
                                      <>
                                          <img src={productForm.photoUrl} className="w-full h-full object-cover" />
                                          <button 
                                              onClick={() => setProductForm({...productForm, photoUrl: ''})}
                                              className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </>
                                  ) : (
                                      <Package className="text-slate-300" />
                                  )}
                              </div>
                              <div className="flex-1">
                                  <label className="flex items-center justify-center gap-2 w-full p-3 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm cursor-pointer hover:bg-slate-100 transition-colors">
                                      <Camera size={18} />
                                      <span>Escolher Imagem</span>
                                      <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={(e) => handleImageUpload(e, (url) => setProductForm({...productForm, photoUrl: url}))} 
                                      />
                                  </label>
                              </div>
                          </div>
                      </div>

                      <textarea 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium text-sm" 
                          placeholder="Descrição" 
                          value={productForm.description || ''}
                          onChange={e => setProductForm({...productForm, description: e.target.value})}
                          rows={2}
                      />
                      <div className="flex gap-3">
                          <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                          <button onClick={handleSaveProduct} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                      </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 gap-4">
                      {products.map(product => (
                          <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                              <div className="h-24 bg-slate-100 rounded-xl mb-3 overflow-hidden relative">
                                  {product.photoUrl ? (
                                      <img src={product.photoUrl} className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300"><Package /></div>
                                  )}
                                  <div className="absolute top-1 right-1 bg-white/90 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-800 shadow-sm">
                                      Qtd: {product.stock}
                                  </div>
                              </div>
                              <h4 className="font-bold text-slate-800 text-sm truncate">{product.name}</h4>
                              <p className="text-xs text-rose-500 font-bold mb-3">R$ {product.price}</p>
                              <div className="flex gap-2 mt-auto">
                                  <button 
                                      onClick={() => {
                                          setProductForm(product);
                                          setEditingProductId(product.id);
                                          setIsEditingProduct(true);
                                      }}
                                      className="flex-1 p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 flex justify-center"
                                  >
                                      <Edit2 size={14} />
                                  </button>
                                  <button 
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="flex-1 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 flex justify-center"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          </div>
                      ))}
                      {products.length === 0 && <div className="col-span-2 text-center text-slate-400 py-8">Nenhum produto cadastrado.</div>}
                  </div>
              )}
          </div>
      </div>
  );

  const renderTeam = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-slate-800">Equipe</h2>
              <button 
                  onClick={() => {
                      setEmployeeForm({});
                      setEditingEmployeeId(null);
                      setIsEditingEmployee(true);
                  }}
                  className="bg-slate-900 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"
              >
                  <Plus size={20} />
              </button>
          </header>

          <div className="px-4">
              {isEditingEmployee ? (
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                      <h3 className="font-bold text-slate-800">{editingEmployeeId ? 'Editar Profissional' : 'Novo Profissional'}</h3>
                      <input 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                          placeholder="Nome Completo" 
                          value={employeeForm.name || ''}
                          onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})}
                      />
                      <input 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                          placeholder="Cargo / Especialidade" 
                          value={employeeForm.role || ''}
                          onChange={e => setEmployeeForm({...employeeForm, role: e.target.value})}
                      />
                      
                      {/* Image Upload for Employee */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Foto do Perfil</label>
                          <div className="flex items-center gap-4">
                              <div className="w-20 h-20 bg-slate-100 rounded-full overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 relative">
                                  {employeeForm.photoUrl ? (
                                      <>
                                          <img src={employeeForm.photoUrl} className="w-full h-full object-cover" />
                                          <button 
                                              onClick={() => setEmployeeForm({...employeeForm, photoUrl: ''})}
                                              className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </>
                                  ) : (
                                      <User className="text-slate-300" />
                                  )}
                              </div>
                              <div className="flex-1">
                                  <label className="flex items-center justify-center gap-2 w-full p-3 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm cursor-pointer hover:bg-slate-100 transition-colors">
                                      <Camera size={18} />
                                      <span>Escolher Imagem</span>
                                      <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={(e) => handleImageUpload(e, (url) => setEmployeeForm({...employeeForm, photoUrl: url}))} 
                                      />
                                  </label>
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-3">
                          <button onClick={() => setIsEditingEmployee(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                          <button onClick={handleSaveEmployee} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {employees.map(employee => (
                          <div key={employee.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                              <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                  {employee.photoUrl ? (
                                      <img src={employee.photoUrl} className="w-full h-full object-cover" />
                                  ) : (
                                      <Users className="w-full h-full p-3 text-slate-300" />
                                  )}
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-slate-800">{employee.name}</h4>
                                  <p className="text-xs text-slate-400">{employee.role}</p>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                      onClick={() => {
                                          setEmployeeForm(employee);
                                          setEditingEmployeeId(employee.id);
                                          setIsEditingEmployee(true);
                                      }}
                                      className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"
                                  >
                                      <Edit2 size={16} />
                                  </button>
                                  <button 
                                      onClick={() => handleDeleteEmployee(employee.id)}
                                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
  );

  const renderFinance = () => {
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
      const balance = totalIncome - totalExpense;

      return (
        <div className="space-y-6 animate-fade-in pb-20">
             <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
                <h2 className="text-xl font-black text-slate-800">Financeiro</h2>
                <button 
                    onClick={() => setIsAddingTransaction(!isAddingTransaction)}
                    className="bg-slate-900 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"
                >
                    {isAddingTransaction ? <X size={20} /> : <Plus size={20} />}
                </button>
             </header>

             <div className="px-4 space-y-6">
                 {isAddingTransaction && (
                     <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 animate-scale-in">
                         <h3 className="font-bold text-slate-800">Nova Transação</h3>
                         
                         <div className="flex bg-slate-50 p-1 rounded-xl">
                             <button 
                                onClick={() => setTransactionForm({...transactionForm, type: 'income'})}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${transactionForm.type === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
                             >
                                 Receita
                             </button>
                             <button 
                                onClick={() => setTransactionForm({...transactionForm, type: 'expense'})}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${transactionForm.type === 'expense' ? 'bg-white shadow-sm text-red-500' : 'text-slate-400'}`}
                             >
                                 Despesa
                             </button>
                         </div>
                        
                        {/* Seletor de Categoria com Lista do SaaS Admin Pro */}
                        <div>
                             <label className="text-xs font-bold text-slate-400 uppercase ml-1">Categoria</label>
                             <select 
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium mt-1 text-slate-700"
                                value={transactionForm.category || (transactionForm.type === 'income' ? 'Outros' : 'Outros')}
                                onChange={e => setTransactionForm({...transactionForm, category: e.target.value as any})}
                             >
                                {transactionForm.type === 'income' ? (
                                    INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                                ) : (
                                    EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                                )}
                             </select>
                        </div>

                         <input 
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                            placeholder="Descrição (ex: Conta de Luz)" 
                            value={transactionForm.title || ''}
                            onChange={e => setTransactionForm({...transactionForm, title: e.target.value})}
                         />
                         <div className="flex gap-4">
                            <input 
                                type="number"
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                                placeholder="Valor (R$)" 
                                value={transactionForm.amount || ''}
                                onChange={e => setTransactionForm({...transactionForm, amount: Number(e.target.value)})}
                            />
                            <input 
                                type="date" 
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                                value={transactionForm.date}
                                onChange={e => setTransactionForm({...transactionForm, date: e.target.value})}
                            />
                         </div>
                         <button onClick={handleSaveTransaction} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">Adicionar</button>
                     </div>
                 )}

                 {/* Balance Cards - White Theme */}
                 <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                     <p className="text-slate-400 text-xs font-bold uppercase mb-1">Saldo Atual</p>
                     <p className={`text-4xl font-black mb-8 ${balance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>R$ {balance.toFixed(2)}</p>
                     <div className="flex gap-8">
                         <div>
                             <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold mb-1 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                                 <TrendingUp size={12} /> Entradas
                             </div>
                             <p className="text-xl font-bold text-slate-800">R$ {totalIncome.toFixed(2)}</p>
                         </div>
                         <div>
                             <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold mb-1 bg-red-50 px-2 py-1 rounded-md w-fit">
                                 <TrendingDown size={12} /> Saídas
                             </div>
                             <p className="text-xl font-bold text-slate-800">R$ {totalExpense.toFixed(2)}</p>
                         </div>
                     </div>
                 </div>

                 {/* Transaction List */}
                 <div>
                     <h3 className="font-bold text-slate-800 mb-4 px-2">Extrato</h3>
                     <div className="space-y-3">
                         {transactions.slice().reverse().map(t => (
                             <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                                 <div className="flex items-center gap-3">
                                     <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                         {t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-slate-800 text-sm">{t.title}</h4>
                                         <p className="text-xs text-slate-400">{t.date.split('-').reverse().join('/')}</p>
                                     </div>
                                 </div>
                                 <span className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                     {t.type === 'income' ? '+' : '-'} R$ {t.amount}
                                 </span>
                             </div>
                         ))}
                         {transactions.length === 0 && <p className="text-center text-slate-400 py-4">Nenhuma movimentação.</p>}
                     </div>
                 </div>
             </div>
        </div>
      );
  };

  const renderSettings = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-slate-800">Ajustes</h2>
          </header>
          {settingsForm && (
            <div className="px-4 space-y-4">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-bold text-slate-800">Dados do Salão</h3>
                    <input 
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                        placeholder="Nome do Salão" 
                        value={settingsForm.shopName}
                        onChange={e => setSettingsForm({...settingsForm, shopName: e.target.value})}
                    />
                     <input 
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                        placeholder="Endereço" 
                        value={settingsForm.address}
                        onChange={e => setSettingsForm({...settingsForm, address: e.target.value})}
                    />
                     <input 
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                        placeholder="Telefone / WhatsApp (apenas números)" 
                        value={settingsForm.phone}
                        onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})}
                    />
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-400 ml-1">Abertura</label>
                            <input 
                                type="time"
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                                value={settingsForm.openTime}
                                onChange={e => setSettingsForm({...settingsForm, openTime: e.target.value})}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-400 ml-1">Fechamento</label>
                            <input 
                                type="time"
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                                value={settingsForm.closeTime}
                                onChange={e => setSettingsForm({...settingsForm, closeTime: e.target.value})}
                            />
                        </div>
                    </div>
                    <button onClick={handleSaveSettings} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                        <Save size={20} /> Salvar Configurações
                    </button>
                </div>
            </div>
          )}
      </div>
  );

  const renderClientStore = () => (
      <div className="space-y-6 animate-fade-in pb-32">
          <header className="px-6 pt-6 pb-2">
               <h2 className="text-2xl font-black text-slate-800">Loja</h2>
               <p className="text-slate-500">Produtos disponíveis no salão</p>
          </header>

          <div className="px-4 grid grid-cols-2 gap-4">
               {products.map(product => (
                   <div key={product.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col">
                        <div className="bg-slate-50 rounded-xl h-24 mb-3 overflow-hidden relative">
                           {product.photoUrl ? (
                               <img src={product.photoUrl} className="w-full h-full object-cover" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={24}/></div>
                           )}
                           {product.stock <= 5 && (
                               <div className="absolute top-1 right-1 bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                   Poucas unidades
                               </div>
                           )}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2">{product.name}</h4>
                        <p className="text-xs text-slate-400 mb-3">{product.description}</p>
                        <div className="mt-auto flex justify-between items-center">
                            <span className="font-black text-rose-600">R$ {product.price}</span>
                        </div>
                   </div>
               ))}
               {products.length === 0 && <div className="col-span-2 text-center text-slate-400 py-8">Nenhum produto disponível.</div>}
          </div>
      </div>
  );

  const renderClientAccount = () => (
      <div className="space-y-6 animate-fade-in pb-32">
           <header className="px-6 pt-6 pb-2">
               <h2 className="text-2xl font-black text-slate-800">Minha Conta</h2>
           </header>

           {!clientLoggedInPhone ? (
               <div className="px-6 mt-10">
                   <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                       <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                           <User size={32} />
                       </div>
                       <h3 className="font-bold text-lg text-slate-800 mb-2">Identifique-se</h3>
                       <p className="text-slate-400 text-sm mb-6">Digite seu celular para ver seus agendamentos.</p>
                       
                       <input 
                          className="w-full p-4 bg-slate-50 rounded-2xl text-center font-bold text-lg mb-4"
                          placeholder="(99) 99999-9999"
                          value={clientLoginInput}
                          onChange={e => setClientLoginInput(e.target.value)}
                       />
                       <button 
                          onClick={handleClientLogin}
                          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold"
                       >
                           Entrar
                       </button>
                   </div>
               </div>
           ) : (
               <div className="px-4 space-y-6">
                   <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-lg shadow-slate-200">
                       <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center font-bold text-xl">
                               <User />
                           </div>
                           <div>
                               <p className="text-slate-400 text-xs font-bold uppercase">Olá,</p>
                               <h3 className="font-bold text-lg">{clients.find(c => c.phone === clientLoggedInPhone)?.name || 'Cliente'}</h3>
                           </div>
                       </div>
                   </div>

                   <div>
                       <h3 className="font-bold text-slate-800 mb-4 px-2">Próximos Agendamentos</h3>
                       <div className="space-y-3">
                           {appointments.filter(a => a.clientId === clientLoggedInPhone && a.status === 'scheduled').length > 0 ? (
                               appointments.filter(a => a.clientId === clientLoggedInPhone && a.status === 'scheduled').map(app => (
                                   <div key={app.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                       <div className="flex justify-between items-start mb-3">
                                           <div>
                                               <h4 className="font-bold text-slate-800">{app.serviceName}</h4>
                                               <p className="text-sm text-slate-500">{app.date.split('-').reverse().join('/')} às {app.time}</p>
                                           </div>
                                           <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Confirmado</span>
                                       </div>
                                       <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                                            <span className="font-bold text-rose-600">R$ {app.totalPrice}</span>
                                            <button 
                                                onClick={() => handleCancelAppointment(app.id)}
                                                className="text-xs font-bold text-slate-400 hover:text-red-500"
                                            >
                                                Cancelar
                                            </button>
                                       </div>
                                   </div>
                               ))
                           ) : (
                               <p className="text-center text-slate-400 py-4">Nenhum agendamento futuro.</p>
                           )}
                       </div>
                   </div>

                   <div>
                       <h3 className="font-bold text-slate-800 mb-4 px-2">Histórico</h3>
                       <div className="space-y-3 opacity-60">
                           {appointments.filter(a => a.clientId === clientLoggedInPhone && a.status !== 'scheduled').map(app => (
                               <div key={app.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                                   <div>
                                       <h4 className="font-bold text-slate-700 text-sm">{app.serviceName}</h4>
                                       <p className="text-xs text-slate-400">{app.date.split('-').reverse().join('/')}</p>
                                   </div>
                                   <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${app.status === 'completed' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'}`}>
                                       {app.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                   </span>
                               </div>
                           ))}
                       </div>
                   </div>

                   <button onClick={() => setClientLoggedInPhone(null)} className="w-full py-4 text-rose-500 font-bold flex items-center justify-center gap-2">
                       <LogOut size={18} /> Sair da conta
                   </button>
               </div>
           )}
      </div>
  );

  const renderSalonLandingPage = () => (
    <div className="pb-32 animate-fade-in relative">
      {/* Immersive Header */}
      <div className="relative h-64 bg-slate-900">
         <img 
            src={getPlatformSalons().find(s => s.slug === getCurrentNamespace())?.coverUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80"} 
            className="w-full h-full object-cover opacity-60"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
         
         <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20">
             {!isDirectLink && (
                 <button onClick={() => setView(ViewState.MARKETPLACE)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                     <ArrowLeft size={20} />
                 </button>
             )}
             <div className="flex gap-2 ml-auto">
                 <button onClick={handleShare} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                     <Share2 size={18} />
                 </button>
                 <button onClick={() => setShowAdminLogin(true)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                     <Lock size={18} />
                 </button>
             </div>
         </div>

         <div className="absolute bottom-0 left-0 w-full p-6 text-white">
             <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide mb-2 inline-block">Aberto agora</span>
             <h1 className="text-3xl font-black mb-1">{salonName || 'Salão Premium'}</h1>
             <p className="text-slate-300 text-sm flex items-center gap-1"><MapPin size={14}/> {currentSettings.address || 'Localização'}</p>
         </div>
      </div>

      <div className="bg-white rounded-t-[2rem] -mt-6 relative z-10 p-6 space-y-8">
          {/* Quick Actions */}
          <div className="flex gap-4">
              <button onClick={openWhatsApp} className="flex-1 bg-emerald-50 py-3 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
                  <Phone size={18} /> WhatsApp
              </button>
              <button onClick={openMaps} className="flex-1 bg-blue-50 py-3 rounded-2xl flex items-center justify-center gap-2 text-blue-700 font-bold text-sm">
                  <MapPin size={18} /> Rota
              </button>
          </div>

          {/* Talents / Team */}
          <div>
              <h2 className="font-bold text-slate-800 text-lg mb-4">Talentos</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {employees.map(emp => (
                      <div key={emp.id} className="min-w-[100px] flex flex-col items-center">
                          <div className="w-20 h-20 rounded-full bg-slate-100 mb-3 overflow-hidden border-2 border-white shadow-md">
                             {emp.photoUrl ? (
                                 <img src={emp.photoUrl} className="w-full h-full object-cover" />
                             ) : (
                                 <User className="w-full h-full p-4 text-slate-300" />
                             )}
                          </div>
                          <span className="font-bold text-slate-800 text-sm text-center leading-tight">{emp.name.split(' ')[0]}</span>
                          <span className="text-[10px] text-slate-400 text-center">{emp.role}</span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Menu / Services */}
          <div>
              <h2 className="font-bold text-slate-800 text-lg mb-4">Menu</h2>
              <div className="space-y-4">
                  {services.map(service => (
                      <div key={service.id} className="flex justify-between items-center group">
                          <div>
                              <h3 className="font-bold text-slate-800">{service.name}</h3>
                              <p className="text-xs text-slate-400 mt-1">{service.duration} min • {service.description}</p>
                          </div>
                          <button 
                              onClick={() => openBookingModal(service)}
                              className="bg-slate-100 text-slate-900 px-5 py-2 rounded-full text-sm font-bold group-hover:bg-slate-900 group-hover:text-white transition-colors"
                          >
                              Agendar • R$ {service.price}
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          {/* Location */}
          <div className="bg-slate-50 p-6 rounded-[2rem] cursor-pointer" onClick={openMaps}>
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><MapPin size={18}/> Localização</h3>
              <p className="text-sm text-slate-500 mb-4">{currentSettings.address}</p>
              <div className="h-32 bg-slate-200 rounded-xl w-full flex items-center justify-center text-slate-400 font-bold text-xs hover:bg-slate-300 transition-colors">
                  <Map size={24} className="mr-2"/> VER NO MAPA
              </div>
          </div>
          
          <div className="text-center pt-8 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Powered by</p>
              <span className="text-lg font-black text-slate-300">SALÃO ONLINE</span>
          </div>
      </div>
    </div>
  );

  const renderSaasAdmin = () => (
      <div className="flex flex-col h-screen bg-slate-50">
          <header className="px-6 py-6 bg-slate-900 text-white shadow-lg shadow-slate-200/50 flex justify-between items-center">
              <div>
                  <h1 className="text-xl font-black">Admin SaaS <span className="text-rose-400">Pro</span></h1>
                  <p className="text-xs text-slate-400">Visão Geral da Plataforma</p>
              </div>
              <button onClick={handleAdminLogout} className="text-xs bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20">Sair</button>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
              {saasTab === 'overview' && (
                  <div className="p-6 space-y-6 animate-fade-in">
                      {/* Global Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                              <p className="text-xs text-slate-400 font-bold uppercase mb-2">MRR (Receita)</p>
                              <p className="text-2xl font-black text-rose-600">R$ {tenants.reduce((acc, t) => acc + t.mrr, 0).toFixed(2)}</p>
                          </div>
                          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                              <p className="text-xs text-slate-400 font-bold uppercase mb-2">Total Salões</p>
                              <p className="text-2xl font-black text-slate-800">{tenants.length}</p>
                          </div>
                      </div>

                      {/* GMV Metric */}
                      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
                          <div className="flex items-center gap-2 mb-2 opacity-80">
                              <CreditCard size={16} />
                              <span className="text-xs font-bold uppercase tracking-wide">GMV (Volume Transacionado)</span>
                          </div>
                          <p className="text-3xl font-black mb-4">R$ {tenants.length * 2450}.00</p>
                          <div className="flex items-center gap-2 text-xs bg-white/10 w-fit px-3 py-1 rounded-full">
                              <TrendingUp size={12} />
                              <span>+12% este mês</span>
                          </div>
                      </div>

                      {/* Geographic Data */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <Map size={18} className="text-slate-400" /> Presença Nacional
                          </h3>
                          <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-slate-600">São Paulo</span>
                                  <div className="flex items-center gap-2">
                                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-rose-500 w-[70%]" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-800">70%</span>
                                  </div>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-slate-600">Rio de Janeiro</span>
                                  <div className="flex items-center gap-2">
                                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-blue-500 w-[45%]" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-800">45%</span>
                                  </div>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-slate-600">Minas Gerais</span>
                                  <div className="flex items-center gap-2">
                                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-emerald-500 w-[20%]" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-800">20%</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {saasTab === 'partners' && (
                  <div className="p-6 space-y-4 animate-fade-in">
                      <h3 className="font-bold text-slate-800 text-lg">Salões Parceiros</h3>
                      {tenants.map(tenant => (
                          <div key={tenant.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                              <div>
                                  <h4 className="font-bold text-slate-800">{tenant.slug}</h4>
                                  <p className="text-xs text-slate-400">{tenant.ownerName} • {tenant.city}/{tenant.state}</p>
                              </div>
                              <div className="text-right">
                                  <p className="font-bold text-rose-600 text-sm">{tenant.plan}</p>
                                  <p className="text-xs text-slate-400">R$ {tenant.mrr}/mês</p>
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {saasTab === 'plans' && (
                  <div className="p-6 space-y-6 animate-fade-in">
                      <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-lg">Gerenciar Planos</h3>
                          <button 
                              onClick={() => {
                                  setPlanForm({ features: [] });
                                  setEditingPlanId(null);
                                  setIsEditingPlan(true);
                              }}
                              className="bg-slate-900 text-white p-2 rounded-full"
                          >
                              <Plus size={20} />
                          </button>
                      </div>
                      
                      {isEditingPlan ? (
                          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                              <h4 className="font-bold text-slate-800">{editingPlanId ? 'Editar Plano' : 'Novo Plano'}</h4>
                              <input 
                                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                                  placeholder="Nome do Plano" 
                                  value={planForm.name || ''}
                                  onChange={e => setPlanForm({...planForm, name: e.target.value})}
                              />
                              <input 
                                  type="number"
                                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                                  placeholder="Preço (R$)" 
                                  value={planForm.price !== undefined ? planForm.price : ''}
                                  onChange={e => setPlanForm({...planForm, price: Number(e.target.value)})}
                              />
                              
                              <div>
                                  <label className="text-xs font-bold text-slate-400 ml-1">Benefícios</label>
                                  <div className="flex gap-2 mt-1 mb-2">
                                      <input 
                                          className="flex-1 p-3 bg-slate-50 rounded-xl border-none text-sm"
                                          placeholder="Adicionar benefício"
                                          value={featureInput}
                                          onChange={e => setFeatureInput(e.target.value)}
                                      />
                                      <button onClick={handleAddFeature} className="bg-emerald-100 text-emerald-600 p-3 rounded-xl font-bold">+</button>
                                  </div>
                                  <div className="space-y-2">
                                      {planForm.features?.map((feat, idx) => (
                                          <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-lg text-sm text-slate-600">
                                              {feat}
                                              <button onClick={() => handleRemoveFeature(idx)} className="text-red-400"><X size={14} /></button>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                                  <input 
                                      type="checkbox" 
                                      checked={planForm.isRecommended || false}
                                      onChange={e => setPlanForm({...planForm, isRecommended: e.target.checked})}
                                      className="w-5 h-5 accent-rose-600"
                                  />
                                  <span className="text-sm font-medium text-slate-600">Marcar como "Mais Escolhido"</span>
                              </div>

                              <div className="flex gap-3 pt-2">
                                  <button onClick={() => setIsEditingPlan(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                                  <button onClick={handleSavePlan} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {saasPlans.map(plan => (
                                  <div key={plan.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                      {plan.isRecommended && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>}
                                      <div className="flex justify-between items-start mb-4">
                                          <div>
                                              <h4 className="font-bold text-slate-800 text-lg">{plan.name}</h4>
                                              <p className="font-black text-2xl text-slate-900">R$ {plan.price}</p>
                                          </div>
                                          <div className="flex gap-2">
                                              <button onClick={() => { setPlanForm(plan); setEditingPlanId(plan.id); setIsEditingPlan(true); }} className="p-2 bg-slate-50 rounded-lg text-slate-500"><Edit2 size={16}/></button>
                                              <button onClick={() => handleDeletePlan(plan.id)} className="p-2 bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                                          </div>
                                      </div>
                                      <ul className="space-y-2">
                                          {plan.features.slice(0,3).map((f, i) => (
                                              <li key={i} className="text-xs text-slate-500 flex items-center gap-2"><Check size={12} className="text-emerald-500"/> {f}</li>
                                          ))}
                                          {plan.features.length > 3 && <li className="text-xs text-slate-400 italic">e mais {plan.features.length - 3} itens...</li>}
                                      </ul>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}
          </div>

          <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               <button onClick={() => setSaasTab('overview')} className={`flex flex-col items-center justify-center w-full py-3 ${saasTab === 'overview' ? 'text-rose-600' : 'text-slate-400'}`}>
                  <BarChart3 size={22} />
                  <span className="text-[10px] mt-1 font-medium">Visão Geral</span>
               </button>
               <button onClick={() => setSaasTab('partners')} className={`flex flex-col items-center justify-center w-full py-3 ${saasTab === 'partners' ? 'text-rose-600' : 'text-slate-400'}`}>
                  <Store size={22} />
                  <span className="text-[10px] mt-1 font-medium">Parceiros</span>
               </button>
               <button onClick={() => setSaasTab('plans')} className={`flex flex-col items-center justify-center w-full py-3 ${saasTab === 'plans' ? 'text-rose-600' : 'text-slate-400'}`}>
                  <Tag size={22} />
                  <span className="text-[10px] mt-1 font-medium">Planos</span>
               </button>
          </nav>
      </div>
  );

  const renderSaasLP = () => (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Hero Section */}
      <div className="bg-white pb-20 pt-6 px-6 rounded-b-[3rem] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full blur-3xl -z-10 opacity-60 translate-x-20 -translate-y-20" />
        
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 p-1.5 rounded-lg text-white"><Scissors size={18} /></div>
            <span className="font-black text-slate-800 text-lg tracking-tight">SALÃO ONLINE <span className="text-slate-300 font-light">PRO</span></span>
          </div>
          {/* Removed Area do Parceiro Button */}
        </header>

        <div className="flex flex-col items-center text-center max-w-lg mx-auto">
          <span className="bg-rose-50 text-rose-600 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full mb-6">Software para Salões</span>
          
          <h1 className="text-4xl font-black text-slate-900 leading-[1.1] mb-6">
            Seu salão com <span className="text-rose-600">agendamento online</span> e gestão <span className="text-slate-800">completa</span>.
          </h1>
          
          <p className="text-slate-500 font-medium leading-relaxed mb-8 text-sm">
            Encontre os melhores profissionais ou organize seu negócio em um só lugar.
          </p>

          <div className="flex flex-col w-full gap-4">
            <button 
              onClick={() => setView(ViewState.MARKETPLACE)}
              className="w-full bg-white border border-rose-100 shadow-xl shadow-rose-100/50 py-4 rounded-full flex items-center justify-center gap-3 relative overflow-hidden group hover:scale-[1.02] transition-transform"
            >
              <div className="flex -space-x-2 absolute left-4">
                 {[1,2,3].map(i => (
                   <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-slate-200 bg-[url('https://i.pravatar.cc/100?img=${i+10}')] bg-cover`} />
                 ))}
              </div>
              <span className="font-bold text-rose-600 pl-12 flex items-center gap-2">
                <Heart size={18} className="fill-rose-600" /> Já aderiram
              </span>
            </button>
            
            <div className="relative flex items-center justify-center py-2">
              <div className="h-px bg-slate-200 w-full absolute"></div>
              <span className="bg-slate-50 px-2 text-xs text-slate-400 font-bold relative z-10">ou</span>
            </div>

            <button 
              onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full bg-slate-900 text-white py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <Store size={18} /> Eu Quero
            </button>

            {/* Social Login Button */}
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.52 12.29C23.52 11.43 23.44 10.71 23.3 10H12V14.51H18.47C18.18 15.99 17.25 17.21 15.82 18.16V21.16H19.68C21.94 19.08 23.52 16.03 23.52 12.29Z" fill="#4285F4"/>
                    <path d="M12 24C15.24 24 17.96 22.92 19.95 21.09L16.08 18.06C15.01 18.8 13.62 19.23 12 19.23C8.87 19.23 6.22 17.11 5.27 14.28H1.27V17.38C3.25 21.32 7.31 24 12 24Z" fill="#34A853"/>
                    <path d="M5.27 14.29C5.02 13.57 4.89 12.8 4.89 12C4.89 11.2 5.03 10.43 5.27 9.71V6.61H1.27C0.46 8.23 0 10.06 0 12C0 13.94 0.46 15.77 1.27 17.38L5.27 14.29Z" fill="#FBBC05"/>
                    <path d="M12 4.77C13.76 4.77 15.34 5.37 16.58 6.56L20.04 3.11C17.96 1.17 15.24 0 12 0C7.31 0 3.25 2.68 1.27 6.61L5.27 9.71C6.22 6.88 8.87 4.77 12 4.77Z" fill="#EA4335"/>
               </svg>
               Continuar com Google
            </button>

            {/* Store Badges */}
            <div className="flex justify-center gap-3 mt-4 opacity-60 hover:opacity-100 transition-opacity">
                 <button className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 pr-5 hover:bg-slate-800 transition-colors">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.48-1.23 3.66-1.14 1.27.1 2.27.68 2.93 1.55-2.61 1.49-2.16 5.86.32 7.15-.55 1.55-1.37 3.09-2 4.67zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                    <div className="text-left">
                        <p className="text-[9px] uppercase opacity-80">Baixar na</p>
                        <p className="font-bold text-xs leading-none">App Store</p>
                    </div>
                </button>
                 <button className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 pr-5 hover:bg-slate-800 transition-colors">
                    <Play size={20} className="fill-white" />
                    <div className="text-left">
                        <p className="text-[9px] uppercase opacity-80">Disponível no</p>
                        <p className="font-bold text-xs leading-none">Google Play</p>
                    </div>
                </button>
            </div>

          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-12 space-y-12 max-w-lg mx-auto">
        <div className="text-center space-y-6">
          <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-blue-600 mb-4 shadow-sm">
            <Globe size={32} />
          </div>
          <h3 className="font-black text-xl text-slate-800">Site Exclusivo</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Seu salão ganha uma página profissional com link personalizado para enviar no WhatsApp.
          </p>
        </div>

        <div className="text-center space-y-6">
          <div className="bg-emerald-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 mb-4 shadow-sm">
            <Wallet size={32} />
          </div>
          <h3 className="font-black text-xl text-slate-800">Controle Financeiro</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Saiba exatamente quanto entra e sai. Controle comissões, despesas e lucro real.
          </p>
        </div>

        <div className="text-center space-y-6">
          <div className="bg-purple-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-purple-600 mb-4 shadow-sm">
            <Zap size={32} />
          </div>
          <h3 className="font-black text-xl text-slate-800">Inteligência Artificial</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Descrição de serviços e produtos geradas automaticamente para vender mais.
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div id="plans-section" className="px-6 pb-20 max-w-lg mx-auto">
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Planos para todos os tamanhos</h2>
        <p className="text-center text-slate-500 text-sm mb-10">Escolha o ideal para o seu momento.</p>

        <div className="space-y-6">
          {saasPlans.map((plan) => (
             <div key={plan.id} className={`bg-white p-8 rounded-[2rem] border relative ${plan.isRecommended ? 'border-rose-200 shadow-xl shadow-rose-100/50 scale-105 z-10' : 'border-slate-100 shadow-sm'}`}>
                {plan.isRecommended && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-rose-600/30">
                    Mais Escolhido
                  </span>
                )}
                <h3 className="font-bold text-slate-800 text-lg text-center mb-2">{plan.name}</h3>
                <div className="text-center mb-6">
                  <span className="text-4xl font-black text-slate-900">R$ {plan.price}</span>
                  <span className="text-slate-400 text-sm font-medium">/mês</span>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="bg-emerald-100 text-emerald-600 rounded-full p-0.5"><Check size={12} strokeWidth={3} /></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button 
                   onClick={() => setShowAdminLogin(true)}
                   className={`w-full py-4 rounded-xl font-bold transition-all ${
                    plan.isRecommended 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700' 
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  Começar Agora
                </button>
             </div>
          ))}
        </div>
      </div>
      
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 text-center">
        <p className="text-xs mb-4">© 2024 SALÃO ONLINE SaaS. Todos os direitos reservados.</p>
        <button onClick={() => setShowAdminLogin(true)} className="text-xs font-bold text-slate-600 hover:text-white transition-colors">
          Área Restrita
        </button>
      </footer>

      {showAdminLogin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                {/* Background Image with Blur */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                </div>

                <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm shadow-2xl relative z-10 animate-scale-in">
                    <div className="flex justify-between items-center mb-8">
                         <h3 className="font-bold text-xl text-slate-800">Área do Parceiro</h3>
                         <button onClick={() => setShowAdminLogin(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
                             <ArrowLeft size={20} />
                         </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Senha de Acesso</label>
                            <input 
                                type="password" 
                                placeholder="••••••"
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 placeholder:text-slate-300 font-bold focus:ring-2 focus:ring-rose-500/20 transition-all"
                                value={adminPass}
                                onChange={e => setAdminPass(e.target.value)}
                                autoFocus
                            />
                        </div>
                        
                        <button onClick={handleAdminLogin} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-600/20 transition-all flex items-center justify-center gap-2">
                            <Lock size={18} /> Entrar
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-slate-400">Senha demo: <span className="font-mono bg-slate-100 px-1 rounded">admin123</span></p>
                        <p className="text-[10px] text-slate-400 mt-1">SaaS Admin: <span className="font-mono bg-slate-100 px-1 rounded">saas123</span></p>
                    </div>
                </div>
            </div>
      )}
    </div>
  );

  return (
    <Layout currentView={view} setView={setView} salonName={salonName} activeClientTab={activeClientTab} onClientTabChange={setActiveClientTab}>
      {view === ViewState.SAAS_LP && renderSaasLP()}
      {view === ViewState.DASHBOARD && renderDashboard()}
      {view === ViewState.SERVICES && renderServices()}
      {view === ViewState.PRODUCTS && renderProducts()}
      {view === ViewState.TEAM && renderTeam()}
      {view === ViewState.FINANCE && renderFinance()}
      {view === ViewState.SETTINGS && renderSettings()}
      
      {/* Restored Views */}
      {view === ViewState.PUBLIC_SALON && (activeClientTab === 'home' ? renderSalonLandingPage() : activeClientTab === 'store' ? renderClientStore() : renderClientAccount())}
      {view === ViewState.MARKETPLACE && (
          <div className="p-6 pb-24">
              <header className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Explorar</h2>
                  <button onClick={() => setView(ViewState.SAAS_LP)} className="text-rose-600 font-bold text-sm">Voltar</button>
              </header>

              <div className="grid gap-4">
                  {(showAllSalons ? platformSalons : randomSalons.slice(0, 3)).map(salon => (
                      <button 
                          key={salon.id}
                          onClick={() => handleSalonSelect(salon)}
                          className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left hover:scale-[1.02] transition-transform"
                      >
                          <div className="h-40 relative">
                              <img src={salon.coverUrl} className="w-full h-full object-cover" />
                              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                                  <Star size={12} className="fill-yellow-400 text-yellow-400"/> {salon.rating}
                              </div>
                          </div>
                          <div className="p-5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1 block">{salon.category}</span>
                              <h3 className="text-lg font-black text-slate-800 mb-1">{salon.name}</h3>
                              <p className="text-slate-400 text-xs flex items-center gap-1"><MapPin size={12}/> {salon.location}</p>
                          </div>
                      </button>
                  ))}
              </div>
              
              {!showAllSalons && (
                  <button 
                    onClick={() => setShowAllSalons(true)}
                    className="w-full mt-6 bg-slate-900 text-white py-4 rounded-full font-bold shadow-lg"
                  >
                    Ver Lista Completa
                  </button>
              )}
          </div>
      )}
      {view === ViewState.SAAS_ADMIN && renderSaasAdmin()}

      {/* Booking Modal */}
      {selectedServiceForBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto rounded-t-[2rem] sm:rounded-[2rem] flex flex-col relative overflow-hidden animate-scale-in">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                    <div>
                        <h3 className="font-black text-xl text-slate-800">
                            {bookingStep === 1 ? 'Escolha o Profissional' : 
                             bookingStep === 2 ? 'Data e Horário' : 
                             bookingStep === 3 ? 'Deseja algo mais?' : 
                             bookingStep === 4 ? 'Loja do Salão' :
                             bookingStep === 5 ? 'Seus Dados' : 'Agendado!'}
                        </h3>
                        {bookingStep < 6 && <p className="text-xs text-slate-400">Passo {bookingStep} de 5</p>}
                    </div>
                    <button onClick={closeBookingModal} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Step 1: Employee Selection */}
                    {bookingStep === 1 && (
                        <div className="grid grid-cols-2 gap-4">
                            {employees.map(emp => (
                                <button 
                                    key={emp.id}
                                    onClick={() => {
                                        setSelectedEmployeeForBooking(emp);
                                        setBookingStep(2); // Go to Date/Time
                                    }}
                                    className="flex flex-col items-center p-4 rounded-2xl border-2 border-transparent bg-slate-50 hover:border-rose-500 hover:bg-rose-50 transition-all group"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white mb-3 overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                                        {emp.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover"/> : <User className="w-full h-full p-3 text-slate-300"/>}
                                    </div>
                                    <span className="font-bold text-slate-800 text-sm">{emp.name.split(' ')[0]}</span>
                                    <span className="text-[10px] text-slate-400">{emp.role}</span>
                                </button>
                            ))}
                            <button 
                                onClick={() => {
                                    setSelectedEmployeeForBooking({ id: 'any', name: 'Qualquer Profissional', role: '', bio: '' });
                                    setBookingStep(2);
                                }}
                                className="flex flex-col items-center p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-rose-400 hover:text-rose-500 transition-all"
                            >
                                <div className="w-16 h-16 rounded-full bg-slate-50 mb-3 flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <span className="font-bold text-sm">Qualquer um</span>
                            </button>
                        </div>
                    )}

                    {/* Step 2: Date & Time (MOVED UP) */}
                    {bookingStep === 2 && (
                        <div className="space-y-6">
                            <input 
                                type="date"
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20"
                                value={bookingDate}
                                onChange={e => setBookingDate(e.target.value)}
                            />
                            
                            <div>
                                <h4 className="font-bold text-slate-800 mb-3">Horários Disponíveis</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                                        <button 
                                            key={time}
                                            onClick={() => setBookingTime(time)}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all ${
                                                bookingTime === time 
                                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
                                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-6">
                                <button 
                                    onClick={() => bookingTime ? setBookingStep(3) : alert('Selecione um horário')} 
                                    className={`w-full py-4 rounded-2xl font-bold transition-all ${bookingTime ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: THE FORK (Store vs Finish) */}
                    {bookingStep === 3 && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-6">
                            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-2">
                                <ShoppingBag size={40} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-slate-800 mb-2">Deseja ver a loja?</h3>
                                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                    Temos produtos incríveis que você pode adicionar ao seu agendamento e retirar no salão.
                                </p>
                            </div>

                            <div className="w-full space-y-3 pt-4">
                                <button 
                                    onClick={() => setBookingStep(4)} 
                                    className="w-full bg-white border border-slate-200 text-slate-800 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                >
                                    <Package size={18} /> Ver Produtos
                                </button>
                                <button 
                                    onClick={() => setBookingStep(5)} 
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800"
                                >
                                    Pular e Finalizar <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Product List (Optional) */}
                    {bookingStep === 4 && (
                        <>
                            <div className="bg-rose-50 p-4 rounded-2xl flex gap-3 items-center">
                                <ShoppingBag className="text-rose-500" />
                                <p className="text-sm text-rose-800 font-medium">Adicione produtos ao seu carrinho.</p>
                            </div>

                            <div className="space-y-4">
                                {products.map(product => {
                                    const inCart = bookingCart.find(item => item.product.id === product.id);
                                    return (
                                        <div key={product.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                                            <div className="flex gap-3 items-center">
                                                 <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden">
                                                     {product.photoUrl ? <img src={product.photoUrl} className="w-full h-full object-cover"/> : <Package className="p-3 text-slate-300"/>}
                                                 </div>
                                                 <div>
                                                     <p className="font-bold text-slate-800 text-sm">{product.name}</p>
                                                     <p className="text-xs text-rose-500 font-bold">R$ {product.price}</p>
                                                 </div>
                                            </div>
                                            
                                            {inCart ? (
                                                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1">
                                                    <button onClick={() => updateBookingQuantity(product, -1)} className="p-1 text-slate-400 hover:text-rose-600"><Minus size={16}/></button>
                                                    <span className="text-sm font-bold w-4 text-center">{inCart.quantity}</span>
                                                    <button onClick={() => updateBookingQuantity(product, 1)} className="p-1 text-slate-400 hover:text-rose-600"><Plus size={16}/></button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => updateBookingQuantity(product, 1)}
                                                    className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold"
                                                >
                                                    Adicionar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <p className="font-bold text-slate-800">Total Produtos: <span className="text-rose-600">R$ {bookingCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)}</span></p>
                                <button onClick={() => setBookingStep(5)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Continuar</button>
                            </div>
                        </>
                    )}

                    {/* Step 5: Client Info & Confirm */}
                    {bookingStep === 5 && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 mb-4">
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
                                        {bookingCart.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>{item.quantity}x {item.product.name}</span>
                                                <span>R$ {item.product.price * item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="pt-2 border-t border-slate-200 mt-2 flex justify-between text-lg font-black text-rose-600">
                                    <span>Total</span>
                                    <span>R$ {selectedServiceForBooking.price + bookingCart.reduce((a, i) => a + (i.product.price * i.quantity), 0)}</span>
                                </div>
                            </div>

                            <input 
                                placeholder="Seu Telefone (WhatsApp)"
                                className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-rose-500/20"
                                value={clientPhone}
                                onChange={e => setClientPhone(e.target.value)}
                            />
                            
                            {/* Conditional Fields based on if client is new */}
                            {clientPhone.length >= 8 && (
                                <div className="animate-fade-in space-y-4">
                                    <input 
                                        placeholder="Seu Nome Completo"
                                        className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-rose-500/20"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        readOnly={!isNewClient} // Make read-only if existing client
                                    />
                                    {isNewClient && (
                                        <div className="animate-fade-in">
                                            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Data de Nascimento</label>
                                            <input 
                                                type="date"
                                                className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-rose-500/20 mt-1"
                                                value={clientBirthDate}
                                                onChange={e => setClientBirthDate(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <button onClick={confirmBooking} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-600/20 mt-4 transition-all">
                                Confirmar Agendamento
                            </button>
                        </div>
                    )}

                    {/* Step 6: Success */}
                    {bookingStep === 6 && (
                        <div className="flex flex-col items-center justify-center text-center py-6 animate-scale-in">
                            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-6">
                                <Check size={48} strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Agendado!</h3>
                            <p className="text-slate-500 mb-8 max-w-xs">Seu horário foi reservado com sucesso. Te esperamos lá!</p>

                            {/* Booking Summary Card in Success View */}
                            <div className="bg-slate-50 p-6 rounded-[2rem] w-full text-left mb-6 border border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Resumo do Pedido</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600 font-medium">{selectedServiceForBooking?.name}</span>
                                        <span className="text-sm font-bold text-slate-800">R$ {selectedServiceForBooking?.price}</span>
                                    </div>
                                    
                                    {bookingCart.length > 0 && (
                                        <>
                                            <div className="border-t border-slate-200 my-2"></div>
                                            {bookingCart.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500">{item.quantity}x {item.product.name}</span>
                                                    <span className="font-bold text-slate-700">R$ {item.product.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    <div className="border-t border-slate-200 pt-3 mt-2 flex justify-between items-center">
                                        <span className="font-black text-slate-800">Total Pago</span>
                                        <span className="font-black text-xl text-rose-600">
                                            R$ {selectedServiceForBooking ? (selectedServiceForBooking.price + bookingCart.reduce((a, i) => a + (i.product.price * i.quantity), 0)) : 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button onClick={closeBookingModal} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">
                                Voltar ao Início
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {checkoutAppointment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6">
                <h3 className="font-bold text-lg mb-4">Finalizar Atendimento</h3>
                <div className="bg-slate-50 p-4 rounded-xl mb-4">
                    <p className="font-bold text-slate-800">{checkoutAppointment.clientName}</p>
                    <p className="text-sm text-slate-500">{checkoutAppointment.serviceName}</p>
                    <p className="font-black text-rose-600 mt-2 text-xl">R$ {checkoutAppointment.totalPrice}</p>
                </div>
                
                {/* Add products at checkout */}
                <div className="mb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Adicionar Produtos</p>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                        {products.map(product => {
                             const inCart = checkoutCart.find(item => item.product.id === product.id);
                             return (
                                <div key={product.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                    <span className="text-sm font-medium">{product.name}</span>
                                    {inCart ? (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => updateCheckoutQuantity(product, -1)} className="p-1"><Minus size={14}/></button>
                                            <span className="text-xs font-bold">{inCart.quantity}</span>
                                            <button onClick={() => updateCheckoutQuantity(product, 1)} className="p-1"><Plus size={14}/></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => updateCheckoutQuantity(product, 1)} className="text-xs font-bold text-emerald-600">+ Add</button>
                                    )}
                                </div>
                             )
                        })}
                    </div>
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={closeCheckoutModal} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-500">Cancelar</button>
                    <button onClick={finalizeCheckout} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold">Receber</button>
                </div>
            </div>
        </div>
      )}
    </Layout>
  );
};

export default App;